// frequencia.js
// Tela de frequência (área da equipe) integrada ao PostgreSQL via FastAPI.
// Depende apenas de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

const selecaoForm = document.getElementById("selecaoForm");
const turmaSelect = document.getElementById("frequenciaTurma");
const dataInput = document.getElementById("frequenciaData");
const erroTurma = document.getElementById("erroTurma");
const erroData = document.getElementById("erroData");

const secaoChamada = document.getElementById("secaoChamada");
const listaChamada = document.getElementById("listaChamada");
const chamadaForm = document.getElementById("chamadaForm");
const chamadaMensagem = document.getElementById("chamadaMensagem");
const statusChamadaExistente = document.getElementById("statusChamadaExistente");

const estadoInstrucao = document.getElementById("estadoInstrucao");
const estadoSemAlunos = document.getElementById("estadoSemAlunos");
const estadoErro = document.getElementById("estadoErro");

let turmas = [];

function criarOpcaoPadrao(texto) {
    const opcao = document.createElement("option");
    opcao.value = "";
    opcao.textContent = texto;
    return opcao;
}

function definirDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    dataInput.value = `${ano}-${mes}-${dia}`;
}

function mostrarEstado({ instrucao = false, semAlunos = false, chamada = false, erro = false }) {
    estadoInstrucao.hidden = !instrucao;
    estadoSemAlunos.hidden = !semAlunos;
    secaoChamada.hidden = !chamada;
    estadoErro.hidden = !erro;
}

async function carregarTurmas() {
    const res = await fetch(`${API_BASE}/turmas`);
    if (!res.ok) throw new Error("Falha ao buscar turmas.");
    const todas = await res.json();
    turmas = todas.filter(t => t.ativo !== false);

    const opcoes = turmas.map(turma => {
        const opcao = document.createElement("option");
        opcao.value = turma.turma_id;
        opcao.textContent = `${valorOuPadrao(turma.turma)} (${valorOuPadrao(turma.horario)}) — ${turma.alunos_matriculados} aluno(s)`;
        return opcao;
    });

    turmaSelect.replaceChildren(criarOpcaoPadrao("Selecione uma turma"), ...opcoes);
}

async function carregarChamada(turmaId, dataAula) {
    try {
        const res = await fetch(
            `${API_BASE}/frequencias?turma_id=${encodeURIComponent(turmaId)}&data_aula=${encodeURIComponent(dataAula)}`
        );
        if (!res.ok) throw new Error("Erro ao carregar chamada.");

        const lista = await res.json();

        if (lista.length === 0) {
            mostrarEstado({ semAlunos: true });
            return;
        }

        const jaRegistrada = lista.some(item => item.presente !== null);
        statusChamadaExistente.textContent = jaRegistrada
            ? "Chamada já registrada anteriormente para esta data (editável)."
            : "Nova chamada — todos marcados como presentes por padrão.";

        const linhas = lista.map(aluno => {
            const tr = document.createElement("tr");

            const tdRa = document.createElement("td");
            tdRa.className = "ra-badge";
            tdRa.textContent = aluno.numero_matricula || "—";

            const tdNome = document.createElement("td");
            tdNome.textContent = valorOuPadrao(aluno.nome);

            const tdEmail = document.createElement("td");
            tdEmail.textContent = valorOuPadrao(aluno.email);

            const tdCheck = document.createElement("td");
            tdCheck.className = "text-center";

            const inputCheck = document.createElement("input");
            inputCheck.type = "checkbox";
            inputCheck.name = "alunoPresente";
            inputCheck.dataset.matriculaId = aluno.matricula_id;
            inputCheck.checked = aluno.presente !== null ? Boolean(aluno.presente) : true;
            inputCheck.setAttribute("aria-label", `Marcar presença de ${valorOuPadrao(aluno.nome)}`);

            tdCheck.appendChild(inputCheck);

            tr.append(tdRa, tdNome, tdEmail, tdCheck);
            return tr;
        });

        listaChamada.replaceChildren(...linhas);
        mostrarEstado({ chamada: true });
    } catch (erro) {
        console.error("Erro ao carregar chamada:", erro.name);
        mostrarEstado({ erro: true });
    }
}

function configurarFormularios() {
    selecaoForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        chamadaMensagem.textContent = "";

        const turmaId = turmaSelect.value;
        const dataAula = dataInput.value;

        let valido = true;

        if (!turmaId) {
            erroTurma.textContent = "Selecione uma turma.";
            turmaSelect.setAttribute("aria-invalid", "true");
            valido = false;
        } else {
            erroTurma.textContent = "";
            turmaSelect.setAttribute("aria-invalid", "false");
        }

        if (!dataAula) {
            erroData.textContent = "Informe a data da aula.";
            dataInput.setAttribute("aria-invalid", "true");
            valido = false;
        } else {
            erroData.textContent = "";
            dataInput.setAttribute("aria-invalid", "false");
        }

        if (!valido) return;

        await carregarChamada(turmaId, dataAula);
    });

    document.getElementById("btnMarcarTodos").addEventListener("click", () => {
        chamadaForm.querySelectorAll("input[name='alunoPresente']").forEach(cb => {
            cb.checked = true;
        });
    });

    document.getElementById("btnDesmarcarTodos").addEventListener("click", () => {
        chamadaForm.querySelectorAll("input[name='alunoPresente']").forEach(cb => {
            cb.checked = false;
        });
    });

    chamadaForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const turmaId = Number(turmaSelect.value);
        const dataAula = dataInput.value;

        const checkboxes = chamadaForm.querySelectorAll("input[name='alunoPresente']");
        const registros = Array.from(checkboxes).map(cb => ({
            matricula_id: Number(cb.dataset.matriculaId),
            presente: cb.checked
        }));

        try {
            const res = await fetch(`${API_BASE}/frequencias`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    turma_id: turmaId,
                    data_aula: dataAula,
                    registros
                })
            });
            const dados = await res.json();

            if (!res.ok) {
                chamadaMensagem.textContent = dados.detail || "Erro ao salvar frequência.";
                chamadaMensagem.className = "form-message error";
                return;
            }

            statusChamadaExistente.textContent = "Chamada registrada e salva no PostgreSQL.";
            chamadaMensagem.textContent = dados.mensagem || "Frequência salva com sucesso!";
            chamadaMensagem.className = "form-message success";
        } catch (erro) {
            console.error("Erro ao salvar frequência:", erro.name);
            chamadaMensagem.textContent = "Falha de conexão com o servidor Python na porta 8001.";
            chamadaMensagem.className = "form-message error";
        }
    });
}

async function iniciarPaginaFrequencia() {
    configurarLogout();
    configurarFormularios();
    definirDataHoje();

    try {
        await carregarTurmas();
        mostrarEstado({ instrucao: true });
    } catch (erro) {
        console.error("Falha ao carregar dados da frequência:", erro.name);
        mostrarEstado({ erro: true });
    }
}

if (usuarioEquipe) {
    iniciarPaginaFrequencia();
}