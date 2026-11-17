
// Verificar quem está conectado
const usuarioLogado = JSON.parse(
    sessionStorage.getItem("eduMaisUsuarioLogado")
);

// Impedir acesso sem login ou com perfil incorreto
if (!usuarioLogado) {
    window.location.href = "login.html";
} else if (usuarioLogado.perfil !== "aluno") {
    window.location.href = "dashboard-equipe.html";
} else {

    // Buscar os acompanhamentos salvos
    const acompanhamentos = JSON.parse(
        localStorage.getItem("eduMaisAcompanhamentos") || "[]"
    );

    // Filtrar somente os registros do aluno conectado
    const acompanhamentosAluno = acompanhamentos.filter(
        registro => registro.alunoEmail === usuarioLogado.email
    );

    // Localizar a área de histórico
    const historico = document.getElementById(
        "historicoAcompanhamento"
    );

    historico.innerHTML = "";

    // Verificar se existem registros
    if (acompanhamentosAluno.length === 0) {

        historico.textContent =
            "Nenhum acompanhamento registrado ainda.";

    } else {

        acompanhamentosAluno.forEach(registro => {

            const card = document.createElement("div");

            card.className = "dashboard-card";

            card.innerHTML = `
                <h3>${registro.categoria}</h3>
                <p>${registro.observacao}</p>
                <p><strong>Data:</strong> ${registro.data}</p>
            `;

            historico.appendChild(card);

        });

    }

}

// Encerrar sessão
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("eduMaisUsuarioLogado");
});
