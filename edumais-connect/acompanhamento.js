// acompanhamento.js
// Tela de acompanhamento acadêmico integrada ao PostgreSQL via FastAPI.
// Depende apenas de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

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

async function carregarDadosGerais() {
    const [resAlunos, resAcomp] = await Promise.all([
        fetch(`${API_BASE}/alunos`),
        fetch(`${API_BASE}/acompanhamentos`)
    ]);

    if (!resAlunos.ok || !resAcomp.ok) {
        throw new Error("Falha ao carregar dados.");
    }

    alunos = (await resAlunos.json())
        .filter(a => a.ativo !== false)
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));

    acompanhamentos = await resAcomp.json();
}

function preencherAlunos() {
    const opcoes = alunos.map(aluno => {
        const opcao = document.createElement("option");
        opcao.value = aluno.pessoa_id;
        opcao.textContent = `[${aluno.numero_matricula || "S/RA"}] ${valorOuPadrao(aluno.nome)} (${valorOuPadrao(aluno.email)})`;
        return opcao;
    });

    alunoSelect.replaceChildren(criarOpcaoPadrao("Selecione um aluno"), ...opcoes);
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

function criarLinha(item) {
    const linha = document.createElement("tr");

    linha.appendChild(criarCelula(formatarData(item.data_registro)));

    const celulaAluno = document.createElement("td");
    const ra = document.createElement("span");
    ra.className = "ra-badge";
    ra.textContent = `[${item.numero_matricula || "—"}] `;
    celulaAluno.append(ra, valorOuPadrao(item.aluno));

    if (item.email_aluno) {
        const email = document.createElement("span");
        email.className = "cell-secondary";
        email.textContent = item.email_aluno;
        celulaAluno.appendChild(email);
    }
    linha.appendChild(celulaAluno);

    linha.appendChild(criarCelula(valorOuPadrao(item.tema)));
    linha.appendChild(criarCelula(valorOuPadrao(item.observacao)));

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

    const filtrados = acompanhamentos.filter(item => {
        if (!termo) return true;
        const texto = normalizarTexto(
            `${item.numero_matricula || ""} ${item.aluno || ""} ${item.email_aluno || ""} ${item.tema || ""} ${item.observacao || ""}`
        );
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

function limparErros() {
    [
        [erroAluno, alunoSelect],
        [erroData, dataInput],
        [erroTema, temaInput],
        [erroObs, obsInput]
    ].forEach(([erro, campo]) => {
        erro.textContent = "";
        campo.setAttribute("aria-invalid", "false");
    });
}

function configurarFormulario() {
    acompanhamentoForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        acompanhamentoMensagem.textContent = "";
        limparErros();

        const alunoId = alunoSelect.value;
        const dataVal = dataInput.value;
        const temaVal = temaInput.value.trim();
        const obsVal = obsInput.value.trim();

        let valido = true;

        if (!alunoId) {
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
            const res = await fetch(`${API_BASE}/acompanhamentos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aluno_id: Number(alunoId),
                    data_registro: dataVal,
                    tema: temaVal,
                    observacao: obsVal
                })
            });
            const dados = await res.json();

            if (!res.ok) {
                acompanhamentoMensagem.textContent = dados.detail || "Não foi possível salvar o registro.";
                acompanhamentoMensagem.className = "form-message error";
                return;
            }

            acompanhamentoForm.reset();
            definirDataHoje();
            limparErros();

            acompanhamentoMensagem.textContent = dados.mensagem || "Registro salvo com sucesso!";
            acompanhamentoMensagem.className = "form-message success";

            await carregarDadosGerais();
            atualizarLista();
            alunoSelect.focus();
        } catch (erro) {
            console.error("Falha ao salvar acompanhamento:", erro.name);
            acompanhamentoMensagem.textContent = "Falha de conexão com o servidor Python na porta 8001.";
            acompanhamentoMensagem.className = "form-message error";
        }
    });
}

async function iniciarPaginaAcompanhamento() {
    configurarLogout();
    configurarFormulario();
    definirDataHoje();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    try {
        await carregarDadosGerais();
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