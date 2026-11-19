// campanhas.js
// Tela de campanhas e arrecadações integrada ao PostgreSQL via FastAPI.
// Depende apenas de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

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

async function carregarCampanhas() {
    const res = await fetch(`${API_BASE}/campanhas`);
    if (!res.ok) throw new Error("Falha ao buscar campanhas.");
    return await res.json();
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function verificarStatus(prazo) {
    const dataStr = String(prazo || "").split("T")[0];
    const hoje = new Date().toISOString().split("T")[0];
    if (dataStr && dataStr < hoje) {
        return { texto: "Encerrada", classe: "badge-encerrada" };
    }
    return { texto: "Em andamento", classe: "badge-ativa" };
}

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
        const texto = normalizarTexto(`${c.nome || ""} ${c.descricao || ""}`);
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

function limparErros() {
    [
        [erroNome, nomeInput],
        [erroMeta, metaInput],
        [erroPrazo, prazoInput],
        [erroDescricao, descricaoInput]
    ].forEach(([erro, campo]) => {
        erro.textContent = "";
        campo.setAttribute("aria-invalid", "false");
    });
}

function configurarFormulario() {
    campanhaForm.addEventListener("submit", async (evento) => {
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
            const res = await fetch(`${API_BASE}/campanhas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: nomeVal,
                    meta: metaVal,
                    prazo: prazoVal,
                    descricao: descricaoVal
                })
            });
            const dados = await res.json();

            if (!res.ok) {
                campanhaMensagem.textContent = dados.detail || "Não foi possível salvar a campanha.";
                campanhaMensagem.className = "form-message error";
                return;
            }

            campanhaForm.reset();
            limparErros();

            campanhaMensagem.textContent = dados.mensagem || "Campanha cadastrada com sucesso!";
            campanhaMensagem.className = "form-message success";

            campanhas = await carregarCampanhas();
            atualizarLista();
            nomeInput.focus();
        } catch (erro) {
            console.error("Falha ao salvar campanha:", erro.name);
            campanhaMensagem.textContent = "Falha de conexão com o servidor Python na porta 8001.";
            campanhaMensagem.className = "form-message error";
        }
    });
}

async function iniciarPaginaCampanhas() {
    configurarLogout();
    configurarFormulario();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    try {
        campanhas = await carregarCampanhas();
        atualizarLista();
    } catch (erro) {
        console.error("Falha ao carregar campanhas:", erro.name);
        mostrarApenas(estadoErro);
    }
}

if (usuarioEquipe) {
    iniciarPaginaCampanhas();
}