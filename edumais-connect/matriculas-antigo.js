
const matriculaForm = document.getElementById("matriculaForm");

const alunoSelect = document.getElementById("alunoMatricula");
const turmaSelect = document.getElementById("turmaMatricula");

const matriculaMessage = document.getElementById("matriculaMessage");
const listaMatriculas = document.getElementById("listaMatriculas");

// Recuperar dados salvos
const usuarios = JSON.parse(
    localStorage.getItem("eduMaisUsuarios") || "[]"
);

const turmas = JSON.parse(
    localStorage.getItem("eduMaisTurmas") || "[]"
);

let matriculas = JSON.parse(
    localStorage.getItem("eduMaisMatriculas") || "[]"
);

// Carregar alunos no campo de seleção
function carregarAlunos() {

    const alunos = usuarios.filter(
        usuario => usuario.perfil === "aluno"
    );

    alunos.forEach((aluno, index) => {

        const option = document.createElement("option");

        option.value = aluno.email;
        option.textContent = aluno.nome;

        alunoSelect.appendChild(option);

    });

}

// Carregar turmas no campo de seleção
function carregarTurmas() {

    turmas.forEach((turma, index) => {

        const option = document.createElement("option");

        option.value = index;
        option.textContent = turma.nome;

        turmaSelect.appendChild(option);

    });

}

// Mostrar matrículas
function mostrarMatriculas() {

    listaMatriculas.innerHTML = "";

    if (matriculas.length === 0) {

        listaMatriculas.innerHTML =
            "<p>Nenhuma matrícula realizada ainda.</p>";

        return;
    }

    matriculas.forEach((matricula, index) => {

        const card = document.createElement("div");

        card.className = "dashboard-card";

        card.innerHTML = `
            <h3>${matricula.alunoNome}</h3>
            <p>Curso: ${matricula.curso}</p>
            <p>Turma: ${matricula.turmaNome}</p>
            <p>E-mail: ${matricula.alunoEmail}</p>
            <button onclick="cancelarMatricula(${index})">
                Cancelar matrícula
            </button>
        `;

        listaMatriculas.appendChild(card);

    });

}

// Realizar matrícula
matriculaForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const emailAluno = alunoSelect.value;
    const indiceTurma = Number(turmaSelect.value);

    const aluno = usuarios.find(
        usuario => usuario.email === emailAluno &&
        usuario.perfil === "aluno"
    );

    const turma = turmas[indiceTurma];

    if (!aluno || !turma) {

        matriculaMessage.style.color = "red";
        matriculaMessage.textContent =
            "Selecione um aluno e uma turma válidos.";

        return;
    }

    // Verificar matrícula duplicada
    const jaMatriculado = matriculas.some(
        matricula =>
            matricula.alunoEmail === aluno.email &&
            matricula.turmaNome === turma.nome
    );

    if (jaMatriculado) {

        matriculaMessage.style.color = "red";
        matriculaMessage.textContent =
            "Este aluno já está matriculado nesta turma.";

        return;
    }

    // Verificar limite de vagas
    const vagasOcupadas = matriculas.filter(
        matricula => matricula.turmaNome === turma.nome
    ).length;

    if (vagasOcupadas >= turma.vagas) {

        matriculaMessage.style.color = "red";
        matriculaMessage.textContent =
            "Esta turma não possui vagas disponíveis.";

        return;
    }

    const novaMatricula = {
        alunoNome: aluno.nome,
        alunoEmail: aluno.email,
        turmaNome: turma.nome,
        curso: turma.curso,
        data: new Date().toLocaleDateString("pt-BR")
    };

    matriculas.push(novaMatricula);

    localStorage.setItem(
        "eduMaisMatriculas",
        JSON.stringify(matriculas)
    );

    matriculaMessage.style.color = "green";
    matriculaMessage.textContent =
        "Matrícula realizada com sucesso!";

    matriculaForm.reset();

    mostrarMatriculas();

});

// Cancelar matrícula
function cancelarMatricula(index) {

    matriculas.splice(index, 1);

    localStorage.setItem(
        "eduMaisMatriculas",
        JSON.stringify(matriculas)
    );

    mostrarMatriculas();

}

// Inicializar página
carregarAlunos();
carregarTurmas();
mostrarMatriculas();

// Disponibilizar função para os botões
window.cancelarMatricula = cancelarMatricula;
