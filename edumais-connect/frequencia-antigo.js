
const usuarioLogado = JSON.parse(
    sessionStorage.getItem("eduMaisUsuarioLogado")
);

// Verificar acesso da equipe
if (!usuarioLogado) {
    window.location.href = "login.html";
} else if (usuarioLogado.perfil !== "equipe") {
    window.location.href = "dashboard.html";
}

const turmaSelect = document.getElementById("turmaFrequencia");
const dataInput = document.getElementById("dataFrequencia");
const listaFrequencia = document.getElementById("listaFrequencia");
const salvarButton = document.getElementById("salvarFrequencia");
const frequenciaMessage = document.getElementById("frequenciaMessage");

const turmas = JSON.parse(
    localStorage.getItem("eduMaisTurmas") || "[]"
);

const usuarios = JSON.parse(
    localStorage.getItem("eduMaisUsuarios") || "[]"
);

let frequencias = JSON.parse(
    localStorage.getItem("eduMaisFrequencias") || "[]"
);

// Definir a data atual
const hoje = new Date();
const dataAtual = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0")
].join("-");

dataInput.value = dataAtual;

// Carregar as turmas disponíveis
function carregarTurmas() {
    turmas.forEach((turma) => {
        const option = document.createElement("option");
        option.value = turma.nome;
        option.textContent = turma.nome;
        turmaSelect.appendChild(option);
    });
}

// Mostrar alunos matriculados na turma
function mostrarAlunos() {
    listaFrequencia.innerHTML = "";
    frequenciaMessage.textContent = "";

    const turmaSelecionada = turmaSelect.value;
    const dataSelecionada = dataInput.value;

    if (!turmaSelecionada || !dataSelecionada) {
        listaFrequencia.textContent =
            "Selecione uma turma e uma data.";
        return;
    }

    const matriculas = JSON.parse(
        localStorage.getItem("eduMaisMatriculas") || "[]"
    );

    const alunosMatriculados = matriculas.filter(
        matricula => matricula.turmaNome === turmaSelecionada
    );

    if (alunosMatriculados.length === 0) {
        listaFrequencia.textContent =
            "Não existem alunos matriculados nesta turma.";
        return;
    }

    const frequenciaSalva = frequencias.find(
        frequencia =>
            frequencia.turmaNome === turmaSelecionada &&
            frequencia.data === dataSelecionada
    );

    alunosMatriculados.forEach((matricula) => {
        const aluno = usuarios.find(
            usuario => usuario.email === matricula.alunoEmail
        );

        if (!aluno) return;

        const registroAnterior = frequenciaSalva?.alunos.find(
            registro => registro.email === aluno.email
        );

        const linha = document.createElement("div");
        linha.className = "dashboard-card";

        const nome = document.createElement("h3");
        nome.textContent = aluno.nome;

        const email = document.createElement("p");
        email.textContent = aluno.email;

        const label = document.createElement("label");
        label.textContent = "Situação: ";

        const select = document.createElement("select");
        select.className = "statusFrequencia";
        select.dataset.email = aluno.email;

        const presente = document.createElement("option");
        presente.value = "presente";
        presente.textContent = "Presente";

        const ausente = document.createElement("option");
        ausente.value = "ausente";
        ausente.textContent = "Ausente";

        select.appendChild(presente);
        select.appendChild(ausente);

        if (registroAnterior) {
            select.value = registroAnterior.status;
        } else {
            select.value = "presente";
        }

        label.appendChild(select);

        linha.appendChild(nome);
        linha.appendChild(email);
        linha.appendChild(label);

        listaFrequencia.appendChild(linha);
    });
}

// Salvar os registros de frequência
salvarButton.addEventListener("click", () => {
    const turmaSelecionada = turmaSelect.value;
    const dataSelecionada = dataInput.value;

    if (!turmaSelecionada || !dataSelecionada) {
        frequenciaMessage.style.color = "red";
        frequenciaMessage.textContent =
            "Selecione uma turma e uma data.";
        return;
    }

    const seletores = document.querySelectorAll(".statusFrequencia");

    if (seletores.length === 0) {
        frequenciaMessage.style.color = "red";
        frequenciaMessage.textContent =
            "Não existem alunos para registrar.";
        return;
    }

    const registros = Array.from(seletores).map((select) => {
        const aluno = usuarios.find(
            usuario => usuario.email === select.dataset.email
        );

        return {
            nome: aluno.nome,
            email: aluno.email,
            status: select.value
        };
    });

    const indiceExistente = frequencias.findIndex(
        frequencia =>
            frequencia.turmaNome === turmaSelecionada &&
            frequencia.data === dataSelecionada
    );

    const novoRegistro = {
        turmaNome: turmaSelecionada,
        data: dataSelecionada,
        alunos: registros
    };

    if (indiceExistente >= 0) {
        frequencias[indiceExistente] = novoRegistro;
    } else {
        frequencias.push(novoRegistro);
    }

    localStorage.setItem(
        "eduMaisFrequencias",
        JSON.stringify(frequencias)
    );

    frequenciaMessage.style.color = "green";
    frequenciaMessage.textContent =
        "Frequência salva com sucesso!";
});

// Atualizar a lista quando mudar turma ou data
turmaSelect.addEventListener("change", mostrarAlunos);
dataInput.addEventListener("change", mostrarAlunos);

// Encerrar sessão
const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("eduMaisUsuarioLogado");
});

// Inicializar página
carregarTurmas();
