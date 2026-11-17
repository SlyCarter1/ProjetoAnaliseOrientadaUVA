// acompanhamento.js
// Tela de acompanhamento acadêmico (área da equipe): cadastro de notas de evolução e histórico.
// Depende de utilitarios.js e dados.js.

const usuarioEquipe = exigirEquipe();

const CHAVE_ACOMPANHAMENTO = "eduMaisAcompanhamentos";

// ---------- ELEMENTOS DA PÁGINA ----------
const acompanhamentoForm = document.getElementById("acompanhamentoForm");
const alunoSelect = document.getElementById("acompanhamentoAluno");
const dataInput = document.getElementById("acompanhamentoData");
const temaInput = document.getElementById("acompanhamentoTema");
const obsInput = document.getElementById("acompanhamentoObs");

const erroAluno = document.getElementById("erroAluno");
const erroData = document.getElementById("erroData");
const erroTema = document.getElementById("erroTema");
const erroObs = document.getElementById("erroObs");
const acompanhamentoMensagem = document.getElementById("acompanhamentoMensagem");

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaAcompanhamento");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaAcompanhamentos");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

let alunos = [];
let acompanhamentos = [];

// ---------- CARREGAR DADOS ----------

function carregarDadosGerais() {
    alunos = listarAlunos().sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    acompanhamentos = lerLista(CHAVE_ACOMPANHAMENTO);
}

function salvarAcompanhamentos(lista) {
    salvarLista(CHAVE_ACOMPANHAMENTO, lista);
}

// ---------- INICIALIZAÇÃO DOS SELECTS E DATAS ----------

function preencherAlunos() {
    const opcoes = alunos.map(aluno => {
        const opcao = document.createElement("option");
        opcao.value = aluno.email;
        opcao.textContent = `${valorOuPadrao(aluno.nome)} (${valorOuPadrao(aluno.email)})`;
        return opcao;
    });

    alunoSelect.replaceChildren(criarOpcaoPadrao("Selecione um aluno"), ...opcoes);
}

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

// ---------- MOSTRAR NA TELA ----------

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

function detalharAcompanhamento(item) {
    const aluno = alunos.find(a => a.email === item.alunoEmail);
    return {
        data: formatarData(item.data),
        nomeAluno: aluno ? valorOuPadrao(aluno.nome) : "Aluno não encontrado",
        emailAluno: aluno ? valorOuPadrao(aluno.email) : (item.alunoEmail || ""),
        tema: valorOuPadrao(item.tema),
        obs: valorOuPadrao(item.obs)
    };
}

function criarLinha(detalhe) {
    const linha = document.createElement("tr");

    linha.appendChild(criarCelula(detalhe.data));

    // Coluna do aluno com nome e e-mail secundário
    const celulaAluno = document.createElement("td");
    celulaAluno.append(detalhe.nomeAluno);

    if (detalhe.emailAluno) {
        const email = document.createElement("span");
        email.className = "cell-secondary";
        email.textContent = detalhe.emailAluno;
        celulaAluno.appendChild(email);
    }
    linha.appendChild(celulaAluno);

    linha.appendChild(criarCelula(detalhe.tema));
    linha.appendChild(criarCelula(detalhe.obs));

    return linha;
}

function atualizarLista() {
    const total = acompanhamentos.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    // Mais recentes primeiro
    const detalhes = [...acompanhamentos].reverse().map(detalharAcompanhamento);

    const filtrados = detalhes.filter(item => {
        if (!termo) return true;
        const texto = normalizarTexto(`${item.nomeAluno} ${item.emailAluno} ${item.tema} ${item.obs}`);
        return texto.includes(termo);
    });

    if (filtrados.length === 0) {
        resumoResultados.textContent = "Nenhum registro encontrado.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtrados.map(criarLinha));

    const rotulo = total === 1 ? "registro" : "registros";
    resumoResultados.textContent = `Mostrando ${filtrados.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

// ---------- FORMULÁRIO E VALIDAÇÕES ----------

function limparErros() {
    erroAluno.textContent = "";
    alunoSelect.setAttribute("aria-invalid", "false");

    erroData.textContent = "";
    dataInput.setAttribute("aria-invalid", "false");

    erroTema.textContent = "";
    temaInput.setAttribute("aria-invalid", "false");

    erroObs.textContent = "";
    obsInput.setAttribute("aria-invalid", "false");
}

function configurarFormulario() {
    acompanhamentoForm.addEventListener("submit", (evento) => {
        evento.preventDefault();
        acompanhamentoMensagem.textContent = "";
        limparErros();

        const alunoEmail = alunoSelect.value;
        const dataVal = dataInput.value;
        const temaVal = temaInput.value.trim();
        const obsVal = obsInput.value.trim();

        let valido = true;

        if (!alunoEmail) {
            erroAluno.textContent = "Selecione um aluno.";
            alunoSelect.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!dataVal) {
            erroData.textContent = "Informe a data do registro.";
            dataInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!temaVal) {
            erroTema.textContent = "Informe o tema trabalhado.";
            temaInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!obsVal) {
            erroObs.textContent = "Escreva as observações sobre o progresso.";
            obsInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!valido) {
            acompanhamentoMensagem.textContent = "Corrija os campos indicados.";
            acompanhamentoMensagem.className = "form-message error";
            return;
        }

        try {
            const novoRegistro = {
                id: gerarIdProvisorio(),
                alunoEmail: alunoEmail,
                data: dataVal,
                tema: temaVal,
                obs: obsVal
            };

            acompanhamentos.push(novoRegistro);
            salvarAcompanhamentos(acompanhamentos);

            acompanhamentoForm.reset();
            definirDataHoje();
            limparErros();

            acompanhamentoMensagem.textContent = "Registro salvo com sucesso!";
            acompanhamentoMensagem.className = "form-message success";

            atualizarLista();
            alunoSelect.focus();
        } catch (erro) {
            console.error("Falha ao salvar acompanhamento:", erro.name);
            acompanhamentoMensagem.textContent = "Não foi possível salvar o registro. Tente novamente.";
            acompanhamentoMensagem.className = "form-message error";
        }
    });
}

// ---------- INÍCIO ----------

function iniciarPaginaAcompanhamento() {
    configurarLogout();
    configurarFormulario();
    definirDataHoje();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    try {
        carregarDadosGerais();
        preencherAlunos();
        atualizarLista();
    } catch (erro) {
        console.error("Falha ao carregar dados:", erro.name);
        mostrarApenas(estadoErro);
    }
}

if (usuarioEquipe) {
    iniciarPaginaAcompanhamento();
}