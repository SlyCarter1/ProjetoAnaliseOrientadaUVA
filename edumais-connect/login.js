
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const emailInput = document.getElementById("email");

// Mostrar ou ocultar senha
togglePassword.addEventListener("click", () => {
    const passwordIsHidden = passwordInput.type === "password";

    passwordInput.type = passwordIsHidden ? "text" : "password";

    togglePassword.textContent = passwordIsHidden
        ? "Ocultar"
        : "Mostrar";
});

// Realizar login
loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    const usuarios = JSON.parse(
        localStorage.getItem("eduMaisUsuarios") || "[]"
    );

    // Procurar usuário cadastrado
    const usuarioEncontrado = usuarios.find(
        usuario => usuario.email === email && usuario.senha === password
    );

    // Verificar se o usuário existe
    if (!usuarioEncontrado) {
        loginMessage.style.color = "red";
        loginMessage.textContent = "E-mail ou senha incorretos.";
        return;
    }

    // Identificar o tipo de usuário
    const perfil = usuarioEncontrado.perfil || "aluno";

    // Guardar os dados do usuário conectado
    const usuarioLogado = {
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
        perfil: perfil
    };

    sessionStorage.setItem(
        "eduMaisUsuarioLogado",
        JSON.stringify(usuarioLogado)
    );

    // Direcionar para o ambiente correto
    if (perfil === "equipe") {
        window.location.href = "dashboard-equipe.html";
    } else {
        window.location.href = "dashboard.html";
    }
});
