
// Verificar quem está conectado
const usuarioLogado = JSON.parse(
    sessionStorage.getItem("eduMaisUsuarioLogado")
);

// Impedir acesso sem login ou com perfil de aluno
if (!usuarioLogado) {
    window.location.href = "login.html";
} else if (usuarioLogado.perfil !== "equipe") {
    window.location.href = "dashboard.html";
} else {
    // Mostrar o nome de quem está conectado
    const primeiroNome = usuarioLogado.nome.split(" ")[0];

    document.getElementById("teamGreeting").textContent =
        `Olá, ${primeiroNome}!`;
}

// Fazer logout
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("eduMaisUsuarioLogado");
});
// Contabilizar alunos cadastrados
const usuarios = JSON.parse(
    localStorage.getItem("eduMaisUsuarios") || "[]"
);

const alunos = usuarios.filter(
    usuario => usuario.perfil === "aluno"
);

// Atualizar indicador de alunos
document.getElementById("totalAlunos").textContent =
    alunos.length;
    // Contabilizar turmas cadastradas
const turmas = JSON.parse(
    localStorage.getItem("eduMaisTurmas") || "[]"
);

// Atualizar indicador de turmas
document.getElementById("totalTurmas").textContent =
    turmas.length;
    // Contabilizar matrículas realizadas
const matriculas = JSON.parse(
    localStorage.getItem("eduMaisMatriculas") || "[]"
);

document.getElementById("totalMatriculas").textContent =
    matriculas.length;