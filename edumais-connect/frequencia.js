// frequencia.js
// Tela de frequência (área da equipe) integrada ao PostgreSQL via FastAPI.
// Inclui registro diário de chamada e consulta de histórico/taxa de presença.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

// Chamada diária
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

// Consulta de presença
const consultaPresencaForm = document.getElementById("consultaPresencaForm");
const consultaTurma = document.getElementById("consultaTurma");
const consultaAluno = document.getElementById("consultaAluno");
const consultaDataInicio = document.getElementById("consultaDataInicio");
const consultaDataFim = document.getElementById("consultaDataFim");
const btnLimparConsulta = document.getElementById("btnLimparConsulta");

const resultadoConsultaPresenca = document.getElementById("resultadoConsultaPresenca");
const resumoConsultaPresenca = document.getElementById("resumoConsultaPresenca");
const cardsTaxaPresenca = document.getElementById("cardsTaxaPresenca");
const tabelaHistoricoPresenca = document.getElementById("tabelaHistoricoPresenca");
const estadoSemHistorico = document.getElementById("estadoSemHistorico");

let turmas = [];
let alunos = [];

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

async function carregarFiltrosIniciais() {
    const [resTurmas, resAlunos] = await Promise.all([
        fetch(`${API_BASE}/turmas`),
        fetch(`${API_BASE}/alunos`)
    ]);
    if (!resTurmas.ok || !resAlunos.ok) {
        throw new Error("Falha ao buscar turmas ou alunos.");
    }

    const todasTurmas = await resTurmas.json();
    turmas = todasTurmas.filter(t => t.ativo !== false);
    alunos = await resAlunos.json();

    const opcoesChamada = turmas.map(turma => {
        const op = document.createElement("option");
        op.value = turma.turma_id;
        op.textContent = `${valorOuPadrao(turma.turma)} (${valorOuPadrao(turma.horario)}) — ${turma.alunos_matriculados} aluno(s)`;
        return op;
    });
    turmaSelect.replaceChildren(criarOpcaoPadrao("Selecione uma turma"), ...opcoesChamada);

    const opcoesFiltroTurma = turmas.map(turma => {
        const op = document.createElement("option");
        op.value = turma.turma_id;
        op.textContent = `${valorOuPadrao(turma.turma)} (${valorOuPadrao(turma.curso)})`;
        return op;
    });
    consultaTurma.replaceChildren(criarOpcaoPadrao("Todas as turmas"), ...opcoesFiltroTurma);

    const opcoesFiltroAluno = alunos.map(aluno => {
        const op = document.createElement("option");
        op.value = aluno.pessoa_id;
        op.textContent = `[${aluno.numero_matricula || "S/RA"}] ${valorOuPadrao(aluno.nome)}`;
        return op;
    });
    consultaAluno.replaceChildren(criarOpcaoPadrao("Todos os alunos"), ...opcoesFiltroAluno);
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

function renderizarResumoPorAluno(registros) {
    const mapa = new Map();

    for (const r of registros) {
        const chave = `${r.aluno_id}-${r.turma_id}`;
        if (!mapa.has(chave)) {
            mapa.set(chave, {
                nome: r.aluno,
                ra: r.numero_matricula || "—",
                turma: r.turma,
                total: 0,
                presentes: 0
            });
        }
        const entry = mapa.get(chave);
        entry.total += 1;
        if (r.presente) entry.presentes += 1;
    }

    const cards = Array.from(mapa.values()).map(item => {
        const pct = item.total > 0 ? Math.round((item.presentes / item.total) * 100) : 0;
        const card = document.createElement("div");
        card.className = "resumo-card";

        const titulo = document.createElement("strong");
        titulo.textContent = `${valorOuPadrao(item.nome)} [${item.ra}]`;

        const info = document.createElement("span");
        info.textContent = `${valorOuPadrao(item.turma)} • ${item.presentes}/${item.total} presenças (${pct}%)`;

        card.append(titulo, info);
        return card;
    });

    cardsTaxaPresenca.replaceChildren(...cards);
}

async function consultarPresenca() {
    const params = new URLSearchParams();
    if (consultaTurma.value) params.set("turma_id", consultaTurma.value);
    if (consultaAluno.value) params.set("aluno_id", consultaAluno.value);
    if (consultaDataInicio.value) params.set("data_inicio", consultaDataInicio.value);
    if (consultaDataFim.value) params.set("data_fim", consultaDataFim.value);

    const qs = params.toString();
    const url = `${API_BASE}/frequencias/consulta${qs ? `?${qs}` : ""}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha ao consultar presença.");

        const registros = await res.json();

        if (registros.length === 0) {
            resultadoConsultaPresenca.hidden = true;
            estadoSemHistorico.hidden = false;
            return;
        }

        estadoSemHistorico.hidden = true;
        resultadoConsultaPresenca.hidden = false;

        const totalPresencas = registros.filter(r => r.presente).length;
        const pctGeral = Math.round((totalPresencas / registros.length) * 100);
        resumoConsultaPresenca.textContent =
            `${registros.length} registro(s) encontrado(s) • ${totalPresencas} presença(s) (${pctGeral}% geral).`;

        renderizarResumoPorAluno(registros);

        const linhas = registros.map(r => {
            const tr = document.createElement("tr");

            const tdData = document.createElement("td");
            tdData.textContent = formatarData(r.data_aula);

            const tdRa = document.createElement("td");
            tdRa.className = "ra-badge";
            tdRa.textContent = r.numero_matricula || "—";

            const tdAluno = document.createElement("td");
            tdAluno.textContent = valorOuPadrao(r.aluno);

            const tdTurma = document.createElement("td");
            tdTurma.textContent = valorOuPadrao(r.turma);

            const tdSituacao = document.createElement("td");
            tdSituacao.className = "text-center";
            const badge = document.createElement("span");
            badge.className = r.presente ? "presenca-ok" : "presenca-falta";
            badge.textContent = r.presente ? "Presente" : "Falta";
            tdSituacao.appendChild(badge);

            tr.append(tdData, tdRa, tdAluno, tdTurma, tdSituacao);
            return tr;
        });

        tabelaHistoricoPresenca.replaceChildren(...linhas);
    } catch (erro) {
        console.error("Erro na consulta de presença:", erro.name);
        resultadoConsultaPresenca.hidden = true;
        estadoSemHistorico.hidden = false;
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

            await consultarPresenca();
        } catch (erro) {
            console.error("Erro ao salvar frequência:", erro.name);
            chamadaMensagem.textContent = "Falha de conexão com o servidor Python na porta 8001.";
            chamadaMensagem.className = "form-message error";
        }
    });

    consultaPresencaForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        await consultarPresenca();
    });

    btnLimparConsulta.addEventListener("click", async () => {
        consultaPresencaForm.reset();
        await consultarPresenca();
    });
}

async function iniciarPaginaFrequencia() {
    configurarLogout();
    configurarFormularios();
    definirDataHoje();

    try {
        await carregarFiltrosIniciais();
        mostrarEstado({ instrucao: true });
        await consultarPresenca();
    } catch (erro) {
        console.error("Falha ao carregar dados da frequência:", erro.name);
        mostrarEstado({ erro: true });
    }
}

if (usuarioEquipe) {
    iniciarPaginaFrequencia();
}