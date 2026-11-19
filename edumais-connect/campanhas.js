// campanhas.js
// Tela de campanhas e arrecadações integrada ao PostgreSQL via FastAPI.
// Suporta cadastro, edição com valor arrecadado e alteração de status.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

const tituloFormCampanha = document.getElementById("tituloFormCampanha");
const campanhaForm = document.getElementById("campanhaForm");
const nomeInput = document.getElementById("campanhaNome");
const metaInput = document.getElementById("campanhaMeta");
const arrecadadoWrapper = document.getElementById("campoArrecadadoWrapper");
const arrecadadoInput = document.getElementById("campanhaArrecadado");
const prazoInput = document.getElementById("campanhaPrazo");
const statusWrapper = document.getElementById("campoStatusWrapper");
const statusSelect = document.getElementById("campanhaStatus");
const descricaoInput = document.getElementById("campanhaDescricao");

const erroNome = document.getElementById("erroNome");
const erroMeta = document.getElementById("erroMeta");
const erroArrecadado = document.getElementById("erroArrecadado");
const erroPrazo = document.getElementById("erroPrazo");
const erroDescricao = document.getElementById("erroDescricao");
const campanhaMensagem = document.getElementById("campanhaMensagem");
const btnSalvarCampanha = document.getElementById("btnSalvarCampanha");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaCampanha");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaCampanhas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

let campanhas = [];
let campanhaEmEdicaoId = null;

async function carregarCampanhas() {
    const res = await fetch(`${API_BASE}/campanhas`);
    if (!res.ok) throw new Error("Falha ao buscar campanhas.");
    return await res.json();
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterStatusInfo(campanha) {
    if (campanha.status === "encerrada") {
        return { texto: "Encerrada", classe: "badge-encerrada" };
    }
    const dataStr = String(campanha.prazo || "").split("T")[0];
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

function iniciarEdicao(campanha) {
    campanhaEmEdicaoId = campanha.campanha_id;
    tituloFormCampanha.textContent = `Editando: ${valorOuPadrao(campanha.nome)}`;
    arrecadadoWrapper.hidden = false;
    statusWrapper.hidden = false;
    btnCancelarEdicao.hidden = false;
    btnSalvarCampanha.textContent = "Salvar alterações";
    campanhaMensagem.textContent = "";

    nomeInput.value = campanha.nome || "";
    metaInput.value = Number(campanha.meta || 0);
    arrecadadoInput.value = Number(campanha.arrecadado || 0);
    prazoInput.value = String(campanha.prazo || "").split("T")[0];
    statusSelect.value = campanha.status === "encerrada" ? "encerrada" : "em_andamento";
    descricaoInput.value = campanha.descricao || "";

    limparErros();
    nomeInput.focus();
    campanhaForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelarEdicao() {
    campanhaEmEdicaoId = null;
    tituloFormCampanha.textContent = "Nova campanha";
    arrecadadoWrapper.hidden = true;
    statusWrapper.hidden = true;
    btnCancelarEdicao.hidden = true;
    btnSalvarCampanha.textContent = "Cadastrar campanha";
    campanhaForm.reset();
    statusSelect.value = "em_andamento";
    limparErros();
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

    const arrecadado = Number(campanha.arrecadado || 0);
    const meta = Number(campanha.meta || 0);
    const pct = meta > 0 ? Math.min(100, Math.round((arrecadado / meta) * 100)) : 0;

    const celulaValores = document.createElement("td");
    celulaValores.textContent = `${formatarMoeda(arrecadado)} / ${formatarMoeda(meta)}`;

    const infoPct = document.createElement("div");
    infoPct.className = "progresso-campanha";
    infoPct.textContent = `${pct}% da meta`;

    const barra = document.createElement("div");
    barra.className = "barra-progresso";
    const preenchida = document.createElement("div");
    preenchida.className = "barra-progresso-preenchida";
    preenchida.style.width = `${pct}%`;
    barra.appendChild(preenchida);

    celulaValores.append(infoPct, barra);
    linha.appendChild(celulaValores);

    linha.appendChild(criarCelula(formatarData(campanha.prazo)));

    const statusInfo = obterStatusInfo(campanha);
    const celulaStatus = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge ${statusInfo.classe}`;
    badge.textContent = statusInfo.texto;
    celulaStatus.appendChild(badge);
    linha.appendChild(celulaStatus);

    const celulaAcoes = document.createElement("td");
    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "table-button";
    btnEditar.textContent = "Editar";
    btnEditar.addEventListener("click", () => iniciarEdicao(campanha));
    celulaAcoes.appendChild(btnEditar);
    linha.appendChild(celulaAcoes);

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
        [erroArrecadado, arrecadadoInput],
        [erroPrazo, prazoInput],
        [erroDescricao, descricaoInput]
    ].forEach(([erro, campo]) => {
        erro.textContent = "";
        campo.setAttribute("aria-invalid", "false");
    });
}

function configurarFormulario() {
    btnCancelarEdicao.addEventListener("click", () => {
        campanhaMensagem.textContent = "";
        cancelarEdicao();
    });

    campanhaForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        campanhaMensagem.textContent = "";
        limparErros();

        const nomeVal = nomeInput.value.trim();
        const metaVal = parseFloat(metaInput.value);
        const arrecadadoVal = campanhaEmEdicaoId ? parseFloat(arrecadadoInput.value) : 0;
        const prazoVal = prazoInput.value;
        const statusVal = campanhaEmEdicaoId ? statusSelect.value : "em_andamento";
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
        if (campanhaEmEdicaoId && (isNaN(arrecadadoVal) || arrecadadoVal < 0)) {
            erroArrecadado.textContent = "Informe um valor arrecadado válido (0 ou maior).";
            arrecadadoInput.setAttribute("aria-invalid", "true");
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
            const url = campanhaEmEdicaoId
                ? `${API_BASE}/campanhas/${campanhaEmEdicaoId}`
                : `${API_BASE}/campanhas`;
            const method = campanhaEmEdicaoId ? "PUT" : "POST";
            const payload = campanhaEmEdicaoId
                ? {
                    nome: nomeVal,
                    meta: metaVal,
                    arrecadado: arrecadadoVal,
                    prazo: prazoVal,
                    descricao: descricaoVal,
                    status: statusVal
                }
                : {
                    nome: nomeVal,
                    meta: metaVal,
                    prazo: prazoVal,
                    descricao: descricaoVal
                };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const dados = await res.json();

            if (!res.ok) {
                campanhaMensagem.textContent = dados.detail || "Não foi possível salvar a campanha.";
                campanhaMensagem.className = "form-message error";
                return;
            }

            cancelarEdicao();
            campanhaMensagem.textContent = dados.mensagem || "Campanha salva com sucesso!";
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