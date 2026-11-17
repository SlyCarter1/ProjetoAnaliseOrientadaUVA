// matriculas.js
// Tela de matrículas (área da equipe): matricular um aluno em uma turma
// e consultar as matrículas já realizadas.
// Depende de utilitarios.js e dados.js (nessa ordem, no HTML).

// Só a equipe pode ver esta página.
const usuarioEquipe = exigirEquipe();

// ---------- ELEMENTOS DA PÁGINA ----------
const matriculaForm = document.getElementById("matriculaForm");
const alunoSelect = document.getElementById("matriculaAluno");
const turmaSelect = document.getElementById("matriculaTurma");
const erroAluno = document.getElementById("erroAluno");
const erroTurma = document.getElementById("erroTurma");
const matriculaBotao = document.getElementById("matriculaBotao");
const matriculaMensagem = document.getElementById("matriculaMensagem");
const avisoSemDados = document.getElementById("avisoSemDados");

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaMatricula");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaMatriculas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

// Listas carregadas (a tela une as três para mostrar cada matrícula).
let alunos = [];
let turmas = [];
let matriculas = [];

// ---------- CARREGAR DADOS ----------

function carregarDados() {
    alunos = listarAlunos().sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR")
    );
    turmas = listarTurmas();
    matriculas = listarMatriculas();
}

// Só turmas que têm id podem receber matrícula
// (turmas muito antigas, criadas sem id, ficam de fora).
function turmasMatriculaveis() {
    return turmas
        .filter(turma => turma.id)
        .sort((a, b) => (a.atividade || "").localeCompare(b.atividade || "", "pt-BR"));
}

// ---------- FORMULÁRIO ----------

function criarOpcao(valor, texto) {
    const opcao = document.createElement("option");
    opcao.value = valor;
    opcao.textContent = texto;
    return opcao;
}

function preencherSelects() {
    const opcoesAlunos = alunos.map(aluno =>
        criarOpcao(
            aluno.email,
            `${valorOuPadrao(aluno.nome)} (${valorOuPadrao(aluno.email)})`
        )
    );

    const opcoesTurmas = turmasMatriculaveis().map(turma =>
        criarOpcao(
            turma.id,
            `${valorOuPadrao(turma.atividade)} — ${valorOuPadrao(turma.horario)}`
        )
    );

    alunoSelect.replaceChildren(criarOpcao("", "Selecione um aluno"), ...opcoesAlunos);
    turmaSelect.replaceChildren(criarOpcao("", "Selecione uma turma"), ...opcoesTurmas);
}

function ativarFormulario(ativo) {
    alunoSelect.disabled = !ativo;
    turmaSelect.disabled = !ativo;
    matriculaBotao.disabled = !ativo;
}

function mostrarMensagem(texto, tipo) {
    matriculaMensagem.textContent = texto;
    matriculaMensagem.className = `form-message ${tipo}`;
}

function limparMensagem() {
    matriculaMensagem.textContent = "";
    matriculaMensagem.className = "form-message";
}

function limparErro(select, erro) {
    erro.textContent = "";
    select.setAttribute("aria-invalid", "false");
}

function mostrarErro(select, erro, texto) {
    erro.textContent = texto;
    select.setAttribute("aria-invalid", "true");
}

// Confere se algo foi selecionado. Devolve true se estiver válido.
function validarSelect(select, erro, descricao) {
    const vazio = select.value === "";

    if (vazio) {
        mostrarErro(select, erro, `Selecione ${descricao}.`);
    } else {
        limparErro(select, erro);
    }

    return !vazio;
}

function configurarFormulario() {
    alunoSelect.addEventListener("change", () => limparErro(alunoSelect, erroAluno));
    turmaSelect.addEventListener("change", () => limparErro(turmaSelect, erroTurma));

    matriculaForm.addEventListener("submit", (evento) => {
        evento.preventDefault();
        limparMensagem();

        // Valida os dois campos (sem parar no primeiro, para avisar de ambos).
        const alunoOk = validarSelect(alunoSelect, erroAluno, "um aluno");
        const turmaOk = validarSelect(turmaSelect, erroTurma, "uma turma");

        if (!alunoOk || !turmaOk) {
            mostrarMensagem("Corrija os campos indicados.", "error");
            (alunoOk ? turmaSelect : alunoSelect).focus();
            return;
        }

        const alunoEmail = alunoSelect.value;
        const turmaId = turmaSelect.value;

        try {
            // Regra provisória: o mesmo aluno não é matriculado duas vezes na mesma turma.
            if (existeMatricula(alunoEmail, turmaId)) {
                mostrarErro(turmaSelect, erroTurma, "Este aluno já está matriculado nesta turma.");
                mostrarMensagem("Matrícula não realizada.", "error");
                turmaSelect.focus();
                return;
            }

            criarMatricula({ alunoEmail, turmaId });
        } catch (erro) {
            console.error("Falha ao salvar a matrícula:", erro.name);
            mostrarMensagem("Não foi possível salvar a matrícula. Tente novamente.", "error");
            return;
        }

        matriculaForm.reset();
        limparErro(alunoSelect, erroAluno);
        limparErro(turmaSelect, erroTurma);
        mostrarMensagem("Matrícula realizada com sucesso.", "success");

        recarregarLista();
        alunoSelect.focus();
    });
}

// ---------- LISTA ----------

// Mostra só um bloco (tabela, vazio, sem resultado ou erro).
function mostrarApenas(blocoVisivel) {
    [tabelaWrapper, estadoVazio, estadoSemResultado, estadoErro].forEach(bloco => {
        bloco.hidden = bloco !== blocoVisivel;
    });
}

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto;
    return celula;
}

// Junta uma matrícula com os dados do aluno e da turma.
function detalharMatricula(matricula) {
    const aluno = alunos.find(item => item.email === matricula.alunoEmail);
    const turma = turmas.find(item => item.id === matricula.turmaId);

    return {
        nomeAluno: aluno ? valorOuPadrao(aluno.nome) : "Aluno não encontrado",
        emailAluno: aluno ? valorOuPadrao(aluno.email) : "",
        atividade: turma ? valorOuPadrao(turma.nome || turma.atividade) : "Turma não encontrada",
        horario: turma ? valorOuPadrao(turma.horario) : "—",
        data: formatarData(matricula.dataMatricula)
    };
}

// textContent (e não innerHTML): o que foi digitado nunca vira código HTML.
function criarLinha(detalhe) {
    const linha = document.createElement("tr");

    // Primeira coluna: nome do aluno e, logo abaixo, o e-mail (para diferenciar nomes iguais)
    const celulaAluno = document.createElement("td");
    celulaAluno.append(detalhe.nomeAluno);

    if (detalhe.emailAluno) {
        const email = document.createElement("span");
        email.className = "cell-secondary";
        email.textContent = detalhe.emailAluno;
        celulaAluno.appendChild(email);
    }

    linha.appendChild(celulaAluno);
    linha.appendChild(criarCelula(detalhe.atividade));
    linha.appendChild(criarCelula(detalhe.horario));
    linha.appendChild(criarCelula(detalhe.data));

    return linha;
}

function atualizarLista() {
    const total = matriculas.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    // Mais recentes primeiro (a última matrícula salva fica no topo).
    const detalhes = [...matriculas].reverse().map(detalharMatricula);

    const filtrados = detalhes.filter(detalhe => {
        if (!termo) {
            return true;
        }

        const texto = normalizarTexto(
            `${detalhe.nomeAluno} ${detalhe.emailAluno} ${detalhe.atividade}`
        );
        return texto.includes(termo);
    });

    if (filtrados.length === 0) {
        resumoResultados.textContent = "Nenhuma matrícula encontrada.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtrados.map(criarLinha));

    const rotulo = total === 1 ? "matrícula" : "matrículas";
    resumoResultados.textContent = `Mostrando ${filtrados.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

// Lê os dados de novo e atualiza a tela. Se estiverem corrompidos,
// mostra a caixa de erro em vez de quebrar a página.
function recarregarLista() {
    try {
        carregarDados();
    } catch (erro) {
        // Registra só o tipo do erro, para não expor dados no console.
        console.error("Falha ao carregar os dados:", erro.name);
        resumoResultados.textContent = "";
        ativarFormulario(false);
        mostrarApenas(estadoErro);
        return;
    }

    atualizarLista();
}

// ---------- INÍCIO ----------

function iniciarPaginaMatriculas() {
    configurarLogout();
    configurarFormulario();

    // A pesquisa não deve recarregar a página ao apertar Enter.
    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    try {
        carregarDados();
    } catch (erro) {
        console.error("Falha ao carregar os dados:", erro.name);
        ativarFormulario(false);
        mostrarApenas(estadoErro);
        return;
    }

    preencherSelects();

    // Sem alunos ou sem turmas não dá para matricular: avisa o que falta.
    const podeMatricular = alunos.length > 0 && turmasMatriculaveis().length > 0;
    ativarFormulario(podeMatricular);
    avisoSemDados.hidden = podeMatricular;

    atualizarLista();
}

if (usuarioEquipe) {
    iniciarPaginaMatriculas();
}