// campanhas.js
// Tela de campanhas e doações (área da equipe): cadastro e listagem de campanhas.
// Depende de utilitarios.js e dados.js.

const usuarioEquipe = exigirEquipe();

const CHAVE_CAMPANHAS = "eduMaisCampanhas";

// ---------- ELEMENTOS DA PÁGINA ----------
const campanhaForm = document.getElementById("campanhaForm");
const nomeInput = document.getElementById("campanhaNome");
const metaInput = document.getElementById("campanhaMeta");
const prazoInput = document.getElementById("campanhaPrazo");
const descricaoInput = document.getElementById("campanhaDescricao");

const erroNome = document.getElementById("erroNome");
const erroMeta = document.getElementById("erroMeta");
const erroPrazo = document.getElementById("erroPrazo");
const erroDescricao = document.getElementById("erroDescricao");
const campanhaMensagem = document.getElementById("campanhaMensagem");

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaCampanha");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaCampanhas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

let campanhas = [];

// ---------- CARREGAR DADOS ----------

function carregarCampanhas() {
    return lerLista(CHAVE_CAMPANHAS);
}

function salvarCampanhas(lista) {
    salvarLista(CHAVE_CAMPANHAS, lista);
}

// ---------- FORMATAÇÃO E UTILITÁRIOS ----------

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function verificarStatus(prazo) {
    const hoje = new Date().toISOString().split("T")[0];
    if (prazo < hoje) {
        return { texto: "Encerrada", classe: "badge-encerrada" };
    }
    return { texto: "Em andamento", classe: "badge-ativa" };
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

function criarLinha(campanha) {
    const linha = document.createElement("tr");

    // Coluna Nome + Descrição secundária
    const celulaNome = document.createElement("td");
    celulaNome.append(valorOuPadrao(campanha.nome));

    if (campanha.descricao) {
        const desc = document.createElement("span");
        desc.className = "cell-secondary";
        desc.textContent = campanha.descricao;
        celulaNome.appendChild(desc);
    }
    linha.appendChild(celulaNome);

    linha.appendChild(criarCelula(formatarMoeda(campanha.meta)));
    linha.appendChild(criarCelula(formatarData(campanha.prazo)));

    // Coluna Status
    const statusInfo = verificarStatus(campanha.prazo);
    const celulaStatus = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge ${statusInfo.classe}`;
    badge.textContent = statusInfo.texto;
    celulaStatus.appendChild(badge);
    linha.appendChild(celulaStatus);

    return linha;
}

function atualizarLista() {
    const total = campanhas.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    const filtradas = campanhas.filter(c => {
        if (!termo) return true;
        const texto = normalizarTexto(`${c.nome} ${c.descricao}`);
        return texto.includes(termo);
    });

    if (filtradas.length === 0) {
        resumoResultados.textContent = "Nenhuma campanha encontrada.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtradas.map(criarLinha));

    const rotulo = total === 1 ? "campanha" : "campanhas";
    resumoResultados.textContent = `Mostrando ${filtradas.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

// ---------- VALIDAÇÕES E FORMULÁRIO ----------

function limparErros() {
    erroNome.textContent = "";
    nomeInput.setAttribute("aria-invalid", "false");

    erroMeta.textContent = "";
    metaInput.setAttribute("aria-invalid", "false");

    erroPrazo.textContent = "";
    prazoInput.setAttribute("aria-invalid", "false");

    erroDescricao.textContent = "";
    descricaoInput.setAttribute("aria-invalid", "false");
}

function configurarFormulario() {
    campanhaForm.addEventListener("submit", (evento) => {
        evento.preventDefault();
        campanhaMensagem.textContent = "";
        limparErros();

        const nomeVal = nomeInput.value.trim();
        const metaVal = parseFloat(metaInput.value);
        const prazoVal = prazoInput.value;
        const descricaoVal = descricaoInput.value.trim();

        let valido = true;

        if (!nomeVal) {
            erroNome.textContent = "Informe o título da campanha.";
            nomeInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (isNaN(metaVal) || metaVal <= 0) {
            erroMeta.textContent = "Informe um valor de meta válido.";
            metaInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!prazoVal) {
            erroPrazo.textContent = "Informe o prazo final.";
            prazoInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!descricaoVal) {
            erroDescricao.textContent = "Descreva os objetivos da campanha.";
            descricaoInput.setAttribute("aria-invalid", "true");
            valido = false;
        }

        if (!valido) {
            campanhaMensagem.textContent = "Corrija os campos indicados.";
            campanhaMensagem.className = "form-message error";
            return;
        }

        try {
            const novaCampanha = {
                id: gerarIdProvisorio(),
                nome: nomeVal,
                meta: metaVal,
                prazo: prazoVal,
                descricao: descricaoVal,
                criadoEm: new Date().toISOString()
            };

            campanhas.push(novaCampanha);
            salvarCampanhas(campanhas);

            campanhaForm.reset();
            limparErros();

            campanhaMensagem.textContent = "Campanha cadastrada com sucesso!";
            campanhaMensagem.className = "form-message success";

            atualizarLista();
            nomeInput.focus();
        } catch (erro) {
            console.error("Falha ao salvar campanha:", erro.name);
            campanhaMensagem.textContent = "Não foi possível salvar a campanha. Tente novamente.";
            campanhaMensagem.className = "form-message error";
        }
    });
}

// ---------- INÍCIO ----------

function iniciarPaginaCampanhas() {
    configurarLogout();
    configurarFormulario();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    try {
        campanhas = carregarCampanhas();
        atualizarLista();
    } catch (erro) {
        console.error("Falha ao carregar campanhas:", erro.name);
        mostrarApenas(estadoErro);
    }
}

if (usuarioEquipe) {
    iniciarPaginaCampanhas();
}