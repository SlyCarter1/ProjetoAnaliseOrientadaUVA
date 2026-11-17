
// Verificar quem está conectado
const usuarioLogado = JSON.parse(
    sessionStorage.getItem("eduMaisUsuarioLogado")
);

// Impedir acesso sem login ou sem perfil da equipe
if (!usuarioLogado) {
    window.location.href = "login.html";
} else if (usuarioLogado.perfil !== "equipe") {
    window.location.href = "dashboard.html";
}

// Identificar os elementos da página
const acompanhamentoForm = document.getElementById("acompanhamentoForm");
const alunoSelect = document.getElementById("alunoAcompanhamento");
const categoriaSelect = document.getElementById("categoriaAcompanhamento");
const observacaoInput = document.getElementById("observacaoAcompanhamento");
const acompanhamentoMessage = document.getElementById("acompanhamentoMessage");
const listaAcompanhamentos = document.getElementById("listaAcompanhamentos");
const filtroAluno = document.getElementById("filtroAluno");

// Buscar alunos cadastrados
const usuarios = JSON.parse(
    localStorage.getItem("eduMaisUsuarios") || "[]"
);

const alunos = usuarios.filter(
    usuario => usuario.perfil === "aluno"
);

// Buscar acompanhamentos salvos
let acompanhamentos = JSON.parse(
    localStorage.getItem("eduMaisAcompanhamentos") || "[]"
);

// Carregar alunos nos campos de seleção
function carregarAlunos() {
    alunos.forEach(aluno => {
        const opcaoCadastro = document.createElement("option");
        opcaoCadastro.value = aluno.email;
        opcaoCadastro.textContent = aluno.nome;
        alunoSelect.appendChild(opcaoCadastro);

        const opcaoFiltro = document.createElement("option");
        opcaoFiltro.value = aluno.email;
        opcaoFiltro.textContent = aluno.nome;
        filtroAluno.appendChild(opcaoFiltro);
    });
}

// Exibir histórico de acompanhamentos
function mostrarAcompanhamentos() {
    listaAcompanhamentos.innerHTML = "";

    const emailFiltro = filtroAluno.value;

    const registrosFiltrados = acompanhamentos.filter(registro => {
        return !emailFiltro || registro.alunoEmail === emailFiltro;
    });

    if (registrosFiltrados.length === 0) {
        listaAcompanhamentos.textContent =
            "Nenhum acompanhamento encontrado.";
        return;
    }

    registrosFiltrados.forEach(registro => {
        const card = document.createElement("div");
        card.className = "dashboard-card";

        const nome = document.createElement("h3");
        nome.textContent = registro.alunoNome;

        const categoria = document.createElement("p");
        categoria.textContent = "Categoria: " + registro.categoria;

        const data = document.createElement("p");
        data.textContent = "Data: " + registro.data;

        const observacao = document.createElement("p");
        observacao.textContent = "Observações: " + registro.observacao;

        card.appendChild(nome);
        card.appendChild(categoria);
        card.appendChild(data);
        card.appendChild(observacao);

        listaAcompanhamentos.appendChild(card);
    });
}

// Salvar novo acompanhamento
acompanhamentoForm.addEventListener("submit", event => {
    event.preventDefault();

    const emailAluno = alunoSelect.value;
    const categoria = categoriaSelect.value;
    const observacao = observacaoInput.value.trim();

    const aluno = alunos.find(
        usuario => usuario.email === emailAluno
    );

    if (!aluno || !categoria || !observacao) {
        acompanhamentoMessage.style.color = "red";
        acompanhamentoMessage.textContent =
            "Preencha todos os campos corretamente.";
        return;
    }

    const novoRegistro = {
        alunoNome: aluno.nome,
        alunoEmail: aluno.email,
        categoria: categoria,
        observacao: observacao,
        data: new Date().toLocaleDateString("pt-BR")
    };

    acompanhamentos.push(novoRegistro);

    localStorage.setItem(
        "eduMaisAcompanhamentos",
        JSON.stringify(acompanhamentos)
    );

    acompanhamentoMessage.style.color = "green";
    acompanhamentoMessage.textContent =
        "Acompanhamento salvo com sucesso!";

    acompanhamentoForm.reset();

    mostrarAcompanhamentos();
});acompanhamentos.push

// Atualizar histórico ao trocar o filtro
filtroAluno.addEventListener("change", mostrarAcompanhamentos);

// Encerrar sessão ao sair
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("eduMaisUsuarioLogado");
});

// Inicializar página
carregarAlunos();
mostrarAcompanhamentos();
