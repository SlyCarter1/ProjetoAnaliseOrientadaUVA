
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

    // Buscar os registros de frequência
    const frequencias = JSON.parse(
        localStorage.getItem("eduMaisFrequencias") || "[]"
    );

    // Filtrar somente as frequências do aluno conectado
    const registrosAluno = [];

    frequencias.forEach(frequencia => {

        frequencia.alunos.forEach(aluno => {

            if (aluno.email === usuarioLogado.email) {
                registrosAluno.push({
                    turma: frequencia.turmaNome,
                    data: frequencia.data,
                    status: aluno.status
                });
            }

        });

    });

    // Contabilizar presenças e faltas
    const totalAulas = registrosAluno.length;

    const totalPresencas = registrosAluno.filter(
        registro => registro.status.toLowerCase() === "presente"
    ).length;

    const totalFaltas = registrosAluno.filter(
        registro => registro.status.toLowerCase() === "ausente"
    ).length;

    // Calcular percentual de frequência
    const percentual = totalAulas > 0
        ? Math.round((totalPresencas / totalAulas) * 100)
        : 0;

    // Atualizar os indicadores
    document.getElementById("totalAulas").textContent =
        totalAulas;

    document.getElementById("totalPresencas").textContent =
        totalPresencas;

    document.getElementById("totalFaltas").textContent =
        totalFaltas;

    document.getElementById("percentualFrequencia").textContent =
        percentual + "%";

    // Mostrar histórico de frequência
    const historico = document.getElementById(
        "historicoFrequencia"
    );

    historico.innerHTML = "";

    if (registrosAluno.length === 0) {

        historico.textContent =
            "Nenhum registro de frequência encontrado.";

    } else {

        registrosAluno.forEach(registro => {

            const card = document.createElement("div");

            card.className = "dashboard-card";

            const dataFormatada = registro.data
                .split("-")
                .reverse()
                .join("/");

            card.innerHTML = `
                <h3>${registro.turma}</h3>
                <p>Data: ${dataFormatada}</p>
                <p>Situação: ${registro.status}</p>
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
