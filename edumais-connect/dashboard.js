// dashboard.js
// Painel exclusivo do aluno: exibe apenas suas próprias turmas, presenças e acompanhamentos.
// Depende de utilitarios.js e dados.js.

function obterAlunoLogado() {
    const usuario = lerUsuarioLogado(); // Usa sua função de sessão do utilitarios.js
    if (!usuario) {
        window.location.href = "login.html";
        return null;
    }
    if (usuario.perfil === "equipe") {
        window.location.href = "dashboard-equipe.html";
        return null;
    }
    return usuario;
}

const alunoAtual = obterAlunoLogado();

function iniciarPainelAluno() {
    configurarLogout();

    // Saudação personalizada
    const saudacao = document.getElementById("saudacaoAluno");
    if (saudacao && alunoAtual.nome) {
        const primeiroNome = alunoAtual.nome.trim().split(" ")[0];
        saudacao.textContent = `Olá, ${primeiroNome}!`;
    }

    // 1. Buscar matrículas e turmas do aluno
    const todasMatriculas = listarMatriculas();
    const minhasMatriculas = todasMatriculas.filter(m => m.alunoEmail === alunoAtual.email);
    const todasTurmas = listarTurmas();

    document.getElementById("alunoTotalTurmas").textContent = minhasMatriculas.length;

    const listaTurmasEl = document.getElementById("listaTurmasAluno");
    const wrapperTurmas = document.getElementById("wrapperTurmasAluno");
    const semTurmas = document.getElementById("estadoSemTurmasAluno");

    if (minhasMatriculas.length === 0) {
        wrapperTurmas.hidden = true;
        semTurmas.hidden = false;
    } else {
        const linhasTurmas = minhasMatriculas.map(mat => {
            const turma = todasTurmas.find(t => t.id === mat.turmaId);
            const tr = document.createElement("tr");

            const tdNome = document.createElement("td");
            tdNome.textContent = turma ? valorOuPadrao(turma.nome || turma.atividade) : "Turma não encontrada";

            const tdHorario = document.createElement("td");
            tdHorario.textContent = turma ? valorOuPadrao(turma.horario) : "—";

            const tdData = document.createElement("td");
            tdData.textContent = formatarData(mat.dataMatricula);

            tr.append(tdNome, tdHorario, tdData);
            return tr;
        });

        listaTurmasEl.replaceChildren(...linhasTurmas);
        wrapperTurmas.hidden = false;
        semTurmas.hidden = true;
    }

    // 2. Contar presenças do aluno
    const todasFrequencias = lerLista("eduMaisFrequencia");
    const totalPresencas = todasFrequencias.filter(f =>
        Array.isArray(f.presentes) && f.presentes.includes(alunoAtual.email)
    ).length;

    document.getElementById("alunoTotalPresencas").textContent = totalPresencas;

    // 3. Buscar acompanhamentos pedagógicos do aluno
    const todosAcompanhamentos = lerLista("eduMaisAcompanhamentos");
    const meusAcompanhamentos = todosAcompanhamentos
        .filter(a => a.alunoEmail === alunoAtual.email)
        .reverse();

    document.getElementById("alunoTotalAcompanhamentos").textContent = meusAcompanhamentos.length;

    const listaAcompEl = document.getElementById("listaAcompAluno");
    const wrapperAcomp = document.getElementById("wrapperAcompAluno");
    const semAcomp = document.getElementById("estadoSemAcompAluno");

    if (meusAcompanhamentos.length === 0) {
        wrapperAcomp.hidden = true;
        semAcomp.hidden = false;
    } else {
        const linhasAcomp = meusAcompanhamentos.map(item => {
            const tr = document.createElement("tr");

            const tdData = document.createElement("td");
            tdData.textContent = formatarData(item.data);

            const tdTema = document.createElement("td");
            tdTema.textContent = valorOuPadrao(item.tema);

            const tdObs = document.createElement("td");
            tdObs.textContent = valorOuPadrao(item.obs);

            tr.append(tdData, tdTema, tdObs);
            return tr;
        });

        listaAcompEl.replaceChildren(...linhasAcomp);
        wrapperAcomp.hidden = false;
        semAcomp.hidden = true;
    }
}

if (alunoAtual) {
    iniciarPainelAluno();
}