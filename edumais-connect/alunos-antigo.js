
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

// Buscar alunos cadastrados
let usuarios = JSON.parse(
    localStorage.getItem("eduMaisUsuarios") || "[]"
);

const listaAlunos = document.getElementById("listaAlunos");

// Mostrar alunos na tela
function mostrarAlunos() {
    listaAlunos.innerHTML = "";

    const alunos = usuarios.filter(
        usuario => usuario.perfil === "aluno"
    );

    if (alunos.length === 0) {
        listaAlunos.textContent = "Nenhum aluno cadastrado.";
        return;
    }

    alunos.forEach((aluno) => {
        const card = document.createElement("div");
        card.className = "dashboard-card";

        const nome = document.createElement("h3");
        nome.textContent = aluno.nome;

        const email = document.createElement("p");
        email.textContent = "E-mail: " + aluno.email;

        const nascimento = document.createElement("p");
        nascimento.textContent =
            "Nascimento: " + aluno.nascimento;

        const telefone = document.createElement("p");
        telefone.textContent =
            "Telefone: " + aluno.telefone;

        const excluir = document.createElement("button");
        excluir.textContent = "Excluir aluno";

        excluir.addEventListener("click", () => {
            excluirAluno(aluno.email);
        });

        card.appendChild(nome);
        card.appendChild(email);
        card.appendChild(nascimento);
        card.appendChild(telefone);
        card.appendChild(excluir);

        listaAlunos.appendChild(card);
    });
}

// Excluir aluno e suas matrículas
function excluirAluno(email) {
    const confirmar = confirm(
        "Tem certeza de que deseja excluir este aluno?"
    );

    if (!confirmar) {
        return;
    }

    usuarios = usuarios.filter(
        usuario => usuario.email !== email
    );

    localStorage.setItem(
        "eduMaisUsuarios",
        JSON.stringify(usuarios)
    );

    let matriculas = JSON.parse(
        localStorage.getItem("eduMaisMatriculas") || "[]"
    );

    matriculas = matriculas.filter(
        matricula => matricula.alunoEmail !== email
    );

    localStorage.setItem(
        "eduMaisMatriculas",
        JSON.stringify(matriculas)
    );

    mostrarAlunos();
}

// Encerrar sessão ao sair
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("eduMaisUsuarioLogado");
});

// Carregar a lista
mostrarAlunos();
    