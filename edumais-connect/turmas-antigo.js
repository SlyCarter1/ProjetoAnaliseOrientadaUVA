
const turmaForm = document.getElementById("turmaForm");

const nomeTurmaInput = document.getElementById("nomeTurma");
const cursoTurmaInput = document.getElementById("cursoTurma");
const responsavelTurmaInput = document.getElementById("responsavelTurma");
const vagasTurmaInput = document.getElementById("vagasTurma");

const turmaMessage = document.getElementById("turmaMessage");
const listaTurmas = document.getElementById("listaTurmas");

// Recuperar turmas salvas
let turmas = JSON.parse(
    localStorage.getItem("eduMaisTurmas") || "[]"
);

// Exibir turmas
function mostrarTurmas() {

    listaTurmas.innerHTML = "";

    if (turmas.length === 0) {
        listaTurmas.innerHTML =
            "<p>Nenhuma turma cadastrada ainda.</p>";
        return;
    }

    turmas.forEach((turma, index) => {

        const turmaCard = document.createElement("div");

        turmaCard.className = "dashboard-card";

        turmaCard.innerHTML = `
            <h3>${turma.nome}</h3>
            <p>Curso: ${turma.curso}</p>
            <p>Responsável: ${turma.responsavel}</p>
            <p>Vagas: ${turma.vagas}</p>
            <button onclick="excluirTurma(${index})">
                Excluir turma
            </button>
        `;

        listaTurmas.appendChild(turmaCard);

    });
}

// Cadastrar turma
turmaForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const novaTurma = {
        nome: nomeTurmaInput.value.trim(),
        curso: cursoTurmaInput.value,
        responsavel: responsavelTurmaInput.value.trim(),
        vagas: Number(vagasTurmaInput.value)
    };

    if (
        !novaTurma.nome ||
        !novaTurma.curso ||
        !novaTurma.responsavel ||
        !Number.isInteger(novaTurma.vagas) ||
        novaTurma.vagas < 1
    ) {
        turmaMessage.style.color = "red";
        turmaMessage.textContent =
            "Preencha todos os campos corretamente.";
        return;
    }

    turmas.push(novaTurma);

    localStorage.setItem(
        "eduMaisTurmas",
        JSON.stringify(turmas)
    );

    turmaMessage.style.color = "green";
    turmaMessage.textContent =
        "Turma cadastrada com sucesso!";

    turmaForm.reset();

    mostrarTurmas();

});

// Excluir turma
function excluirTurma(index) {

    turmas.splice(index, 1);

    localStorage.setItem(
        "eduMaisTurmas",
        JSON.stringify(turmas)
    );

    mostrarTurmas();

}

// Mostrar turmas ao abrir a página
mostrarTurmas();
