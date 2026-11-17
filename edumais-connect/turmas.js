// turmas.js
// Turmas (área da equipe): cadastro, lista, pesquisa e vagas ocupadas.
// Depende de utilitarios.js e dados.js (nessa ordem, no HTML).

const usuarioEquipe = exigirEquipe();

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaTurma");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaTurmas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

let turmas = [];
let matriculas = [];

// ---------- LISTA ----------

function carregarDados() {
    turmas = listarTurmas().sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR")
    );
    matriculas = listarMatriculas();
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

function textoDeVagas(turma) {
    const ocupadas = matriculas.filter(m => m.turmaId === turma.id).length;
    const limite = vagasDaTurma(turma);

    return limite === null
        ? `${ocupadas} (limite não definido)`
        : `${ocupadas} de ${limite}`;
}

// textContent (e não innerHTML): o que foi digitado nunca vira código HTML.
function criarLinha(turma) {
    const linha = document.createElement("tr");

    linha.appendChild(criarCelula(valorOuPadrao(turma.nome)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.curso)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.horario)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.educador)));
    linha.appendChild(criarCelula(textoDeVagas(turma)));

    return linha;
}

function atualizarLista() {
    const total = turmas.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    const filtradas = turmas.filter(turma => {
        if (!termo) {
            return true;
        }

        const texto = normalizarTexto(
            `${turma.nome || ""} ${turma.curso || ""} ${turma.horario || ""} ${turma.educador || ""}`
        );
        return texto.includes(termo);
    });

    if (filtradas.length === 0) {
        resumoResultados.textContent = "Nenhuma turma encontrada.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtradas.map(criarLinha));

    const rotulo = total === 1 ? "turma" : "turmas";
    resumoResultados.textContent = `Mostrando ${filtradas.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

function recarregarLista() {
    try {
        carregarDados();
    } catch (erro) {
        console.error("Falha ao carregar as turmas:", erro.name);
        resumoResultados.textContent = "";
        mostrarApenas(estadoErro);
        return;
    }

    atualizarLista();
}

// ---------- FORMULÁRIO ----------

function configurarFormulario() {
    const turmaForm = document.getElementById("turmaForm");

    if (!turmaForm) {
        return;
    }

    const turmaMensagem = document.getElementById("turmaMensagem");

    const campos = [
        {
            input: document.getElementById("turmaNome"),
            erro: document.getElementById("erroNome"),
            mensagem: "Informe o nome da turma.",
            valido: valor => valor !== ""
        },
        {
            input: document.getElementById("turmaCurso"),
            erro: document.getElementById("erroCurso"),
            mensagem: "Informe o curso.",
            valido: valor => valor !== ""
        },
        {
            input: document.getElementById("turmaVagas"),
            erro: document.getElementById("erroVagas"),
            mensagem: "Informe um número de vagas maior que zero.",
            valido: valor => Number.isInteger(Number(valor)) && Number(valor) >= 1
        },
        {
            input: document.getElementById("turmaHorario"),
            erro: document.getElementById("erroHorario"),
            mensagem: "Informe o horário.",
            valido: valor => valor !== ""
        },
        {
            input: document.getElementById("turmaEducador"),
            erro: document.getElementById("erroEducador"),
            mensagem: "Informe o nome do educador.",
            valido: valor => valor !== ""
        }
    ];

    function mostrarMensagem(texto, tipo) {
        turmaMensagem.textContent = texto;
        turmaMensagem.className = `form-message ${tipo}`;
    }

    function limparErro(campo) {
        campo.erro.textContent = "";
        campo.input.setAttribute("aria-invalid", "false");
    }

    function validarCampo(campo) {
        const ok = campo.valido(campo.input.value.trim());

        campo.erro.textContent = ok ? "" : campo.mensagem;
        campo.input.setAttribute("aria-invalid", ok ? "false" : "true");

        return ok;
    }

    campos.forEach(campo => {
        campo.input.addEventListener("input", () => limparErro(campo));
    });

    turmaForm.addEventListener("submit", (evento) => {
        evento.preventDefault();
        mostrarMensagem("", "");

        const invalidos = campos.filter(campo => !validarCampo(campo));

        if (invalidos.length > 0) {
            mostrarMensagem("Corrija os campos indicados.", "error");
            invalidos[0].input.focus();
            return;
        }

        try {
            criarTurma({
                nome: campos[0].input.value.trim(),
                curso: campos[1].input.value.trim(),
                vagas: Number(campos[2].input.value),
                horario: campos[3].input.value.trim(),
                educador: campos[4].input.value.trim()
            });
        } catch (erro) {
            console.error("Falha ao salvar a turma:", erro.name);
            mostrarMensagem("Não foi possível salvar a turma. Tente novamente.", "error");
            return;
        }

        turmaForm.reset();
        campos.forEach(limparErro);
        mostrarMensagem("Turma cadastrada com sucesso.", "success");

        recarregarLista();
        campos[0].input.focus();
    });
}

// ---------- INÍCIO ----------

function iniciarPaginaTurmas() {
    configurarLogout();
    configurarFormulario();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    recarregarLista();
}

if (usuarioEquipe) {
    iniciarPaginaTurmas();
}