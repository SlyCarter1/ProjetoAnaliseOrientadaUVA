// alunos.js
// Tela de gerenciamento de alunos (área da equipe):
// lista, pesquisa, filtro por idade, detalhes e CRUD integrado ao PostgreSQL.
// Depende de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

// ---------- ELEMENTOS DA PÁGINA ----------
const filtrosForm = document.getElementById("filtrosForm");
const buscaInput = document.getElementById("buscaAluno");
const filtroIdadeSelect = document.getElementById("filtroIdade");
const resumoResultados = document.getElementById("resumoResultados");
const feedbackMensagem = document.getElementById("feedbackMensagem");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaAlunos");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

// Modal de detalhes
const detalhesDialog = document.getElementById("detalhesDialog");
const fecharDetalhesBotao = document.getElementById("fecharDetalhes");

// Modal de cadastro/edição
const btnNovoAluno = document.getElementById("btnNovoAluno");
const formAlunoDialog = document.getElementById("formAlunoDialog");
const fecharFormAlunoBotao = document.getElementById("fecharFormAluno");
const cancelarFormAlunoBotao = document.getElementById("cancelarFormAluno");
const formAluno = document.getElementById("formAluno");

let todosOsAlunos = [];

// ---------- FEEDBACK VISUAL ----------

function exibirFeedback(mensagem, tipo = "sucesso") {
    feedbackMensagem.textContent = mensagem;
    feedbackMensagem.className = `feedback-toast ${tipo}`;
    feedbackMensagem.hidden = false;
    setTimeout(() => {
        feedbackMensagem.hidden = true;
    }, 5000);
}

// ---------- CARREGAR DADOS DO POSTGRESQL ----------

async function carregarAlunosDoBanco() {
    const resposta = await fetch(`${API_BASE}/alunos`);
    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
    }
    const lista = await resposta.json();

    // Normaliza os campos do PostgreSQL para manter compatibilidade com utilitarios.js
    return lista
        .map(item => ({
            id: item.pessoa_id,
            nome: item.nome,
            email: item.email,
            telefone: item.telefone,
            nascimento: item.data_nascimento,
            ativo: item.ativo,
            nomeResponsavel: item.responsavel_nome,
            telefoneResponsavel: item.responsavel_telefone,
            matriculasAtivas: item.matriculas_ativas
        }))
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
}

// ---------- PESQUISA E FILTROS ----------

function filtrarAlunos() {
    const termo = normalizarTexto(buscaInput.value.trim());
    const faixa = filtroIdadeSelect.value;

    return todosOsAlunos.filter(aluno => {
        const textoDoAluno = normalizarTexto(`${aluno.nome || ""} ${aluno.email || ""}`);

        if (termo && !textoDoAluno.includes(termo)) {
            return false;
        }

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

function criarLinha(aluno) {
    const linha = document.createElement("tr");
    const idade = calcularIdade(aluno.nascimento);

    linha.appendChild(criarCelula(valorOuPadrao(aluno.nome)));
    linha.appendChild(criarCelula(idade === null ? "—" : `${idade} anos`));
    linha.appendChild(criarCelula(valorOuPadrao(aluno.email)));

    // Coluna Situação (Ativo / Inativo)
    const celulaStatus = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = `status-tag ${aluno.ativo ? "ativo" : "inativo"}`;
    tag.textContent = aluno.ativo ? "Ativo" : "Inativo";
    celulaStatus.appendChild(tag);
    linha.appendChild(celulaStatus);

    // Coluna Ações
    const celulaAcao = document.createElement("td");
    const grupoAcoes = document.createElement("div");
    grupoAcoes.className = "action-group";

    const btnDetalhes = document.createElement("button");
    btnDetalhes.type = "button";
    btnDetalhes.className = "table-button";
    btnDetalhes.textContent = "Ver detalhes";
    btnDetalhes.setAttribute("aria-label", `Ver detalhes de ${valorOuPadrao(aluno.nome)}`);
    btnDetalhes.addEventListener("click", () => abrirDetalhes(aluno));

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "table-button";
    btnEditar.textContent = "Editar";
    btnEditar.setAttribute("aria-label", `Editar ${valorOuPadrao(aluno.nome)}`);
    btnEditar.addEventListener("click", () => abrirModalEdicao(aluno));

    const btnRemover = document.createElement("button");
    btnRemover.type = "button";
    btnRemover.className = "table-button danger";
    btnRemover.textContent = aluno.matriculasAtivas > 0 ? "Inativar" : "Excluir";
    btnRemover.setAttribute("aria-label", `Remover ou inativar ${valorOuPadrao(aluno.nome)}`);
    btnRemover.addEventListener("click", () => removerOuInativarAluno(aluno));

    grupoAcoes.append(btnDetalhes, btnEditar, btnRemover);
    celulaAcao.appendChild(grupoAcoes);
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

// ---------- DETALHES (modal visualização) ----------

function abrirDetalhes(aluno) {
    const idade = calcularIdade(aluno.nascimento);

    definirTexto("detalhesTitulo", valorOuPadrao(aluno.nome));
    definirTexto("detNome", valorOuPadrao(aluno.nome));
    definirTexto("detEmail", valorOuPadrao(aluno.email));
    definirTexto("detNascimento", formatarData(aluno.nascimento));
    definirTexto("detIdade", idade === null ? "Não informado" : `${idade} anos`);
    definirTexto("detTelefone", valorOuPadrao(aluno.telefone));
    definirTexto("detSituacao", aluno.ativo ? "Ativo" : "Inativo");
    definirTexto("detRespNome", valorOuPadrao(aluno.nomeResponsavel));
    definirTexto("detRespTelefone", valorOuPadrao(aluno.telefoneResponsavel));

    detalhesDialog.showModal();
}

// ---------- CADASTRO / EDIÇÃO (modal formulário) ----------

function abrirModalCadastro() {
    formAluno.reset();
    document.getElementById("campoAlunoId").value = "";
    document.getElementById("campoSenha").value = "edumais123";
    document.getElementById("campoSenha").required = true;
    document.getElementById("grupoSenha").hidden = false;
    document.getElementById("grupoAtivo").hidden = true;

    definirTexto("formAlunoTitulo", "Cadastrar novo aluno");
    definirTexto("btnSalvarAluno", "Salvar aluno");
    formAlunoDialog.showModal();
}

function abrirModalEdicao(aluno) {
    formAluno.reset();
    document.getElementById("campoAlunoId").value = aluno.id;
    document.getElementById("campoNome").value = aluno.nome || "";
    document.getElementById("campoEmail").value = aluno.email || "";
    document.getElementById("campoTelefone").value = aluno.telefone || "";
    document.getElementById("campoNascimento").value = aluno.nascimento || "";
    document.getElementById("campoAtivo").value = String(aluno.ativo);
    document.getElementById("campoRespNome").value = aluno.nomeResponsavel || "";
    document.getElementById("campoRespTelefone").value = aluno.telefoneResponsavel || "";

    document.getElementById("campoSenha").required = false;
    document.getElementById("grupoSenha").hidden = true;
    document.getElementById("grupoAtivo").hidden = false;

    definirTexto("formAlunoTitulo", `Editar aluno: ${aluno.nome}`);
    definirTexto("btnSalvarAluno", "Atualizar dados");
    formAlunoDialog.showModal();
}

async function salvarFormularioAluno(evento) {
    evento.preventDefault();

    const id = document.getElementById("campoAlunoId").value;
    const payload = {
        nome: document.getElementById("campoNome").value,
        email: document.getElementById("campoEmail").value,
        telefone: document.getElementById("campoTelefone").value,
        data_nascimento: document.getElementById("campoNascimento").value,
        senha: document.getElementById("campoSenha").value,
        ativo: document.getElementById("campoAtivo").value === "true",
        responsavel_nome: document.getElementById("campoRespNome").value,
        responsavel_telefone: document.getElementById("campoRespTelefone").value
    };

    const url = id ? `${API_BASE}/alunos/${id}` : `${API_BASE}/alunos`;
    const metodo = id ? "PUT" : "POST";

    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.detail || "Não foi possível salvar os dados do aluno.");
            return;
        }

        formAlunoDialog.close();
        exibirFeedback(dados.mensagem || "Operação realizada com sucesso!", "sucesso");
        await recarregarTabela();
    } catch (erro) {
        alert("Falha de conexão com o servidor Python na porta 8001.");
    }
}

async function removerOuInativarAluno(aluno) {
    const acaoTexto = aluno.matriculasAtivas > 0 ? "inativar" : "excluir";
    if (!confirm(`Deseja realmente ${acaoTexto} o cadastro de ${aluno.nome}?`)) {
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE}/alunos/${aluno.id}`, {
            method: "DELETE"
        });
        const dados = await resposta.json();

        if (!resposta.ok) {
            exibirFeedback(dados.detail || "Não foi possível concluir a operação.", "erro");
            return;
        }

        exibirFeedback(dados.mensagem, "sucesso");
        await recarregarTabela();
    } catch (erro) {
        exibirFeedback("Falha de conexão com o servidor Python na porta 8001.", "erro");
    }
}

function configurarModais() {
    fecharDetalhesBotao.addEventListener("click", () => detalhesDialog.close());
    detalhesDialog.addEventListener("click", (evento) => {
        if (evento.target === detalhesDialog) {
            detalhesDialog.close();
        }
    });

    btnNovoAluno.addEventListener("click", abrirModalCadastro);
    fecharFormAlunoBotao.addEventListener("click", () => formAlunoDialog.close());
    cancelarFormAlunoBotao.addEventListener("click", () => formAlunoDialog.close());
    formAlunoDialog.addEventListener("click", (evento) => {
        if (evento.target === formAlunoDialog) {
            formAlunoDialog.close();
        }
    });

    formAluno.addEventListener("submit", salvarFormularioAluno);
}

// ---------- INÍCIO ----------

async function recarregarTabela() {
    try {
        todosOsAlunos = await carregarAlunosDoBanco();
        atualizarLista();
    } catch (erro) {
        console.error("Falha ao carregar os alunos:", erro.name);
        resumoResultados.textContent = "";
        mostrarApenas(estadoErro);
    }
}

async function iniciarPaginaAlunos() {
    configurarLogout();
    configurarModais();

    filtrosForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);
    filtroIdadeSelect.addEventListener("change", atualizarLista);

    await recarregarTabela();
}

if (usuarioEquipe) {
    iniciarPaginaAlunos();
}