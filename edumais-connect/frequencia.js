// frequencia.js
// Tela de frequência (área da equipe): seleção de turma/data e marcação de presença.
// Depende de utilitarios.js e dados.js.

const usuarioEquipe = exigirEquipe();

const CHAVE_FREQUENCIA = "eduMaisFrequencia";

// ---------- ELEMENTOS DA PÁGINA ----------
const selecaoForm = document.getElementById("selecaoForm");
const turmaSelect = document.getElementById("frequenciaTurma");
const dataInput = document.getElementById("frequenciaData");
const erroTurma = document.getElementById("erroTurma");
const erroData = document.getElementById("erroData");

const secaoChamada = document.getElementById("secaoChamada");
const listaChamada = document.getElementById("listaChamada");
const chamadaForm = document.getElementById("chamadaForm");
const chamadaMensagem = document.getElementById("chamadaMensagem");

const estadoInstrucao = document.getElementById("estadoInstrucao");
const estadoSemAlunos = document.getElementById("estadoSemAlunos");
const estadoErro = document.getElementById("estadoErro");

let turmas = [];
let alunos = [];
let matriculas = [];

// ---------- CARREGAR DADOS ----------

function carregarDadosGerais() {
    turmas = listarTurmas().filter(t => t.id);
    alunos = lerLista("eduMaisUsuarios").filter(u => u.perfil === "aluno");
    matriculas = listarMatriculas();
}

function listarFrequencias() {
    return lerLista(CHAVE_FREQUENCIA);
}

function salvarFrequencias(lista) {
    salvarLista(CHAVE_FREQUENCIA, lista);
}

// ---------- INICIALIZAÇÃO DOS SELECTS ----------

function preencherTurmas() {
    const opcoes = turmas.map(turma => {
        const opcao = document.createElement("option");
        opcao.value = turma.id;
        opcao.textContent = `${valorOuPadrao(turma.nome)} (${valorOuPadrao(turma.horario)})`;
        return opcao;
    });

    turmaSelect.replaceChildren(criarOpcaoPadrao("Selecione uma turma"), ...opcoes);
}

function criarOpcaoPadrao(texto) {
    const opcao = document.createElement("option");
    opcao.value = "";
    opcao.textContent = texto;
    return opcao;
}

// Define a data de hoje no input de data por padrão
function definirDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    dataInput.value = `${ano}-${mes}-${dia}`;
}

// ---------- CONTROLE DE ESTADOS DA TELA ----------

function mostrarEstado({ instrucao = false, semAlunos = false, chamada = false, erro = false }) {
    estadoInstrucao.hidden = !instrucao;
    estadoSemAlunos.hidden = !semAlunos;
    secaoChamada.hidden = !chamada;
    estadoErro.hidden = !erro;
}

// ---------- MANIPULAÇÃO DA CHAMADA ----------

function carregarChamada(turmaId, dataAula) {
    // Busca matrículas da turma
    const matriculasDaTurma = matriculas.filter(m => m.turmaId === turmaId);

    if (matriculasDaTurma.length === 0) {
        mostrarEstado({ semAlunos: true });
        return;
    }

    // Pega os dados dos alunos matriculados
    const alunosDaTurma = matriculasDaTurma.map(mat => {
        return alunos.find(aluno => aluno.email === mat.alunoEmail);
    }).filter(Boolean); // Remove nulos caso algum aluno tenha sido removido

    // Busca registros de frequência salvos para essa turma e data
    const todasFreq = listarFrequencias();
    const registroExistente = todasFreq.find(f => f.turmaId === turmaId && f.data === dataAula);
    const presentesSalvos = registroExistente ? registroExistente.presentes : [];

    // Monta as linhas da tabela
    const linhas = alunosDaTurma.map(aluno => {
        const tr = document.createElement("tr");

        const tdNome = document.createElement("td");
        tdNome.textContent = valorOuPadrao(aluno.nome);

        const tdEmail = document.createElement("td");
        tdEmail.textContent = valorOuPadrao(aluno.email);

        const tdCheck = document.createElement("td");
        tdCheck.className = "text-center";

        const inputCheck = document.createElement("input");
        inputCheck.type = "checkbox";
        inputCheck.name = "alunoPresente";
        inputCheck.value = aluno.email;
        // Se já houver registro salvo, marca conforme o histórico; senão, padrão é presente (true)
        inputCheck.checked = registroExistente ? presentesSalvos.includes(aluno.email) : true;
        inputCheck.setAttribute("aria-label", `Marcar presença de ${valorOuPadrao(aluno.nome)}`);

        tdCheck.appendChild(inputCheck);

        tr.appendChild(tdNome);
        tr.appendChild(tdEmail);
        tr.appendChild(tdCheck);

        return tr;
    });

    listaChamada.replaceChildren(...linhas);
    mostrarEstado({ chamada: true });
}

// ---------- EVENTOS E FORMULÁRIOS ----------

function configurarFormularios() {
    selecaoForm.addEventListener("submit", (evento) => {
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

        carregarChamada(turmaId, dataAula);
    });

    chamadaForm.addEventListener("submit", (evento) => {
        evento.preventDefault();

        const turmaId = turmaSelect.value;
        const dataAula = dataInput.value;

        // Captura todos os checkboxes marcados
        const checkboxes = chamadaForm.querySelectorAll("input[name='alunoPresente']:checked");
        const presentes = Array.from(checkboxes).map(cb => cb.value);

        try {
            const todasFreq = listarFrequencias();
            
            // Remove registro anterior da mesma turma e data, se existir
            const filtradas = todasFreq.filter(f => !(f.turmaId === turmaId && f.data === dataAula));

            // Adiciona o novo registro
            filtradas.push({
                turmaId: turmaId,
                data: dataAula,
                presentes: presentes,
                atualizadoEm: new Date().toISOString()
            });

            salvarFrequencias(filtradas);

            chamadaMensagem.textContent = "Frequência salva com sucesso!";
            chamadaMensagem.className = "form-message success";
        } catch (erro) {
            console.error("Erro ao salvar frequência:", erro.name);
            chamadaMensagem.textContent = "Erro ao salvar frequência. Tente novamente.";
            chamadaMensagem.className = "form-message error";
        }
    });
}

// ---------- INÍCIO ----------

function iniciarPaginaFrequencia() {
    configurarLogout();
    configurarFormularios();
    definirDataHoje();

    try {
        carregarDadosGerais();
        preencherTurmas();
        mostrarEstado({ instrucao: true });
    } catch (erro) {
        console.error("Falha ao carregar dados da frequência:", erro.name);
        mostrarEstado({ erro: true });
    }
}

if (usuarioEquipe) {
    iniciarPaginaFrequencia();
}