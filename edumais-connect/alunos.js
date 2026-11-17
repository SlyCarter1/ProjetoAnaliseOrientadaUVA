// alunos.js
// Tela de gerenciamento de alunos (área da equipe):
// lista, pesquisa, filtro por idade e detalhes com dados do responsável.
// Depende de utilitarios.js.

// Só a equipe pode ver esta página.
const usuarioEquipe = exigirEquipe();

// ---------- ELEMENTOS DA PÁGINA ----------
const filtrosForm = document.getElementById("filtrosForm");
const buscaInput = document.getElementById("buscaAluno");
const filtroIdadeSelect = document.getElementById("filtroIdade");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaAlunos");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

const detalhesDialog = document.getElementById("detalhesDialog");
const fecharDetalhesBotao = document.getElementById("fecharDetalhes");

// Guarda todos os alunos carregados (a pesquisa filtra a partir desta lista).
let todosOsAlunos = [];

// ---------- CARREGAR DADOS ----------

// Pega os usuários com perfil "aluno" e coloca em ordem alfabética.
function carregarAlunos() {
    return lerLista("eduMaisUsuarios")
        .filter(usuario => usuario.perfil === "aluno")
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}

// ---------- PESQUISA E FILTROS ----------

function filtrarAlunos() {
    const termo = normalizarTexto(buscaInput.value.trim());
    const faixa = filtroIdadeSelect.value;

    return todosOsAlunos.filter(aluno => {
        // Pesquisa por nome ou e-mail
        const textoDoAluno = normalizarTexto(`${aluno.nome || ""} ${aluno.email || ""}`);

        if (termo && !textoDoAluno.includes(termo)) {
            return false;
        }

        // Filtro por faixa de idade
        if (faixa !== "todos") {
            const idade = calcularIdade(aluno.nascimento);

            if (idade === null) {
                return false;
            }
            if (faixa === "menores" && idade >= 18) {
                return false;
            }
            if (faixa === "maiores" && idade < 18) {
                return false;
            }
        }

        return true;
    });
}

// ---------- MOSTRAR NA TELA ----------

// Mostra só um bloco (tabela, vazio, sem resultado ou erro) e esconde os outros.
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

// Monta uma linha da tabela. Usa textContent (e não innerHTML) para que
// nomes digitados pelos usuários nunca sejam interpretados como código HTML.
function criarLinha(aluno) {
    const linha = document.createElement("tr");

    const idade = calcularIdade(aluno.nascimento);

    linha.appendChild(criarCelula(valorOuPadrao(aluno.nome)));
    linha.appendChild(criarCelula(idade === null ? "—" : `${idade} anos`));
    linha.appendChild(criarCelula(valorOuPadrao(aluno.email)));

    const celulaAcao = document.createElement("td");
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "table-button";
    botao.textContent = "Ver detalhes";
    botao.setAttribute("aria-label", `Ver detalhes de ${valorOuPadrao(aluno.nome)}`);
    botao.addEventListener("click", () => abrirDetalhes(aluno));

    celulaAcao.appendChild(botao);
    linha.appendChild(celulaAcao);

    return linha;
}

function atualizarLista() {
    const total = todosOsAlunos.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const filtrados = filtrarAlunos();

    if (filtrados.length === 0) {
        resumoResultados.textContent = "Nenhum aluno encontrado.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtrados.map(criarLinha));

    const rotulo = total === 1 ? "aluno" : "alunos";
    resumoResultados.textContent = `Mostrando ${filtrados.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

// ---------- DETALHES (janela) ----------

function abrirDetalhes(aluno) {
    const idade = calcularIdade(aluno.nascimento);

    definirTexto("detalhesTitulo", valorOuPadrao(aluno.nome));
    definirTexto("detNome", valorOuPadrao(aluno.nome));
    definirTexto("detEmail", valorOuPadrao(aluno.email));
    definirTexto("detNascimento", formatarData(aluno.nascimento));
    definirTexto("detIdade", idade === null ? "Não informado" : `${idade} anos`);
    definirTexto("detTelefone", valorOuPadrao(aluno.telefone));
    definirTexto("detRespNome", valorOuPadrao(aluno.nomeResponsavel));
    definirTexto("detRespTelefone", valorOuPadrao(aluno.telefoneResponsavel));

    detalhesDialog.showModal();
}

function configurarDetalhes() {
    fecharDetalhesBotao.addEventListener("click", () => detalhesDialog.close());

    // Clicar fora da janela (no fundo escuro) também fecha.
    detalhesDialog.addEventListener("click", (evento) => {
        if (evento.target === detalhesDialog) {
            detalhesDialog.close();
        }
    });
}

// ---------- INÍCIO ----------

function iniciarPaginaAlunos() {
    configurarLogout();
    configurarDetalhes();

    // O formulário de filtros não deve recarregar a página ao apertar Enter.
    filtrosForm.addEventListener("submit", (evento) => evento.preventDefault());

    try {
        todosOsAlunos = carregarAlunos();
    } catch (erro) {
        // Registra só o tipo do erro, para não expor dados pessoais no console.
        console.error("Falha ao carregar os alunos:", erro.name);
        resumoResultados.textContent = "";
        mostrarApenas(estadoErro);
        return;
    }

    buscaInput.addEventListener("input", atualizarLista);
    filtroIdadeSelect.addEventListener("change", atualizarLista);

    atualizarLista();
}

if (usuarioEquipe) {
    iniciarPaginaAlunos();
}