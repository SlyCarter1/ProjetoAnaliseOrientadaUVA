// dados.js
// Camada de dados PROVISÓRIA (LocalStorage). Com a API, só este arquivo muda.
// Depende de utilitarios.js (lerLista), carregado antes.

const CHAVE_USUARIOS = "eduMaisUsuarios";
const CHAVE_TURMAS = "eduMaisTurmas";
const CHAVE_MATRICULAS = "eduMaisMatriculas";

// ---------- GERAIS ----------

function salvarLista(chave, lista) {
    localStorage.setItem(chave, JSON.stringify(lista));
}

// Identificador provisório (será o id da API).
function gerarIdProvisorio() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `t-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Data de hoje em AAAA-MM-DD.
function dataDeHoje() {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${hoje.getFullYear()}-${mes}-${dia}`;
}

// Converte "DD/MM/AAAA" (formato antigo) para "AAAA-MM-DD".
function dataParaIso(texto) {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto || "");
    return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : (texto || "");
}

// ---------- ALUNOS ----------

// Só nome e e-mail: a senha e os dados do responsável não saem daqui (LGPD).
function listarAlunos() {
    return lerLista(CHAVE_USUARIOS)
        .filter(usuario => usuario.perfil === "aluno")
        .map(usuario => ({ nome: usuario.nome, email: usuario.email }));
}

// ---------- TURMAS ----------

// Converte turmas antigas: dá um id e passa "atividade" para "nome".
function normalizarTurmas(turmas) {
    let mudou = false;

    turmas.forEach(turma => {
        if (!turma.id) {
            turma.id = gerarIdProvisorio();
            mudou = true;
        }
        if (!turma.nome && turma.atividade) {
            turma.nome = turma.atividade;
            delete turma.atividade;
            mudou = true;
        }
    });

    return mudou;
}

// Pode lançar erro se o conteúdo salvo estiver corrompido.
function listarTurmas() {
    const turmas = lerLista(CHAVE_TURMAS);

    if (normalizarTurmas(turmas)) {
        salvarLista(CHAVE_TURMAS, turmas);
    }

    return turmas;
}

function criarTurma(dados) {
    const turmas = listarTurmas();

    const novaTurma = {
        id: gerarIdProvisorio(),
        nome: dados.nome,
        curso: dados.curso,
        vagas: dados.vagas,
        horario: dados.horario,
        educador: dados.educador
    };

    turmas.push(novaTurma);
    salvarLista(CHAVE_TURMAS, turmas);

    return novaTurma;
}

// Limite de vagas da turma (número inteiro maior que zero) ou null se não houver.
function vagasDaTurma(turma) {
    const vagas = Number(turma && turma.vagas);
    return Number.isInteger(vagas) && vagas > 0 ? vagas : null;
}

// ---------- MATRÍCULAS ----------

// Converte matrículas antigas: ganham id, turmaId (pelo nome da turma) e dataMatricula.
function normalizarMatriculas(matriculas, turmas) {
    let mudou = false;

    matriculas.forEach(matricula => {
        if (!matricula.id) {
            matricula.id = gerarIdProvisorio();
            mudou = true;
        }
        if (!matricula.turmaId && matricula.turmaNome) {
            const turma = turmas.find(item => item.nome === matricula.turmaNome);
            if (turma) {
                matricula.turmaId = turma.id;
                mudou = true;
            }
        }
        if (!matricula.dataMatricula && matricula.data) {
            matricula.dataMatricula = dataParaIso(matricula.data);
            mudou = true;
        }
    });

    return mudou;
}

function listarMatriculas() {
    const turmas = listarTurmas();
    const matriculas = lerLista(CHAVE_MATRICULAS);

    if (normalizarMatriculas(matriculas, turmas)) {
        salvarLista(CHAVE_MATRICULAS, matriculas);
    }

    return matriculas;
}

function existeMatricula(alunoEmail, turmaId) {
    return listarMatriculas().some(
        matricula =>
            matricula.alunoEmail === alunoEmail && matricula.turmaId === turmaId
    );
}

function vagasOcupadas(turmaId) {
    return listarMatriculas().filter(matricula => matricula.turmaId === turmaId).length;
}

// alunoEmail é chave TEMPORÁRIA: será trocada pelo id do aluno vindo da API.
function criarMatricula(dados) {
    const matriculas = listarMatriculas();

    const novaMatricula = {
        id: gerarIdProvisorio(),
        alunoEmail: dados.alunoEmail,
        turmaId: dados.turmaId,
        dataMatricula: dataDeHoje()
    };

    matriculas.push(novaMatricula);
    salvarLista(CHAVE_MATRICULAS, matriculas);

    return novaMatricula;
}

function cancelarMatricula(id) {
    const restantes = listarMatriculas().filter(matricula => matricula.id !== id);
    salvarLista(CHAVE_MATRICULAS, restantes);
}