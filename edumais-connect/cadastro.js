
const cadastroForm = document.getElementById("cadastroForm");
const perfilInput = document.getElementById("perfil");
const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const nascimentoInput = document.getElementById("nascimento");
const telefoneInput = document.getElementById("telefone");

const responsavelFields = document.getElementById("responsavelFields");
const nomeResponsavelInput = document.getElementById("nomeResponsavel");
const telefoneResponsavelInput = document.getElementById("telefoneResponsavel");

// Mostrar os campos somente para alunos
function atualizarCamposResponsavel() {

    const ehAluno = perfilInput.value === "aluno";

    responsavelFields.style.display = ehAluno ? "block" : "none";

    nomeResponsavelInput.required = ehAluno;
    telefoneResponsavelInput.required = ehAluno;
}

// Atualizar quando o perfil for alterado
perfilInput.addEventListener("change", atualizarCamposResponsavel);

// Executar ao abrir a página
atualizarCamposResponsavel();

const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");
const cadastroMessage = document.getElementById("cadastroMessage");

cadastroForm.addEventListener("submit", (event) => {

    event.preventDefault();

    const perfil = perfilInput.value;
    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const nascimento = nascimentoInput.value;
    const telefone = telefoneInput.value.trim();
    const senha = senhaInput.value;
    const nomeResponsavel = nomeResponsavelInput.value.trim();
const telefoneResponsavel = telefoneResponsavelInput.value.trim();
    const confirmarSenha = confirmarSenhaInput.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    cadastroMessage.style.color = "red";

    if (nome.length < 3) {
        cadastroMessage.textContent = "O nome precisa ter pelo menos 3 caracteres.";
        return;
    }

    if (!emailRegex.test(email)) {
        cadastroMessage.textContent = "Digite um e-mail válido.";
        return;
    }

    if (!nascimento) {
        cadastroMessage.textContent = "Informe sua data de nascimento.";
        return;
    }

    const dataNascimento = new Date(nascimento + "T00:00:00");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataNascimento > hoje) {
        cadastroMessage.textContent = "A data de nascimento não pode ser futura.";
        return;
    }

    if (telefone.length < 8) {
        cadastroMessage.textContent = "Digite um telefone válido.";
        return;
    }

if (perfil === "aluno") {

    if (nomeResponsavel.length < 3) {
        cadastroMessage.textContent =
            "Informe o nome completo do responsável.";
        return;
    }

    if (telefoneResponsavel.length < 8) {
        cadastroMessage.textContent =
            "Digite um telefone válido para o responsável.";
        return;
    }

}


    if (senha.length < 6) {
        cadastroMessage.textContent = "A senha precisa ter pelo menos 6 caracteres.";
        return;
    }

    if (senha !== confirmarSenha) {
        cadastroMessage.textContent = "As senhas não são iguais.";
        return;
    }

    const usuarios = JSON.parse(
        localStorage.getItem("eduMaisUsuarios") || "[]"
    );

    const usuarioExiste = usuarios.some(
        usuario => usuario.email === email
    );

    if (usuarioExiste) {
        cadastroMessage.textContent = "Este e-mail já possui cadastro.";
        return;
    }

    
const novoUsuario = {
    nome: nome,
    email: email,
    nascimento: nascimento,
    telefone: telefone,
    nomeResponsavel: perfil === "aluno" ? nomeResponsavel : "",
    telefoneResponsavel: perfil === "aluno" ? telefoneResponsavel : "",
    senha: senha,
    perfil: perfil
};


    usuarios.push(novoUsuario);

    localStorage.setItem(
        "eduMaisUsuarios",
        JSON.stringify(usuarios)
    );

    cadastroMessage.style.color = "green";
    cadastroMessage.textContent =
        "Cadastro realizado com sucesso! Agora você pode entrar.";

    cadastroForm.reset();
    atualizarCamposResponsavel();

});

