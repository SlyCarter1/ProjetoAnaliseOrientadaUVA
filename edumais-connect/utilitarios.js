// utilitarios.js
// Funções compartilhadas entre as páginas da área da equipe.
// Deve ser carregado ANTES do script da página (veja o final do HTML).

// Lê uma lista do LocalStorage.
// Se a chave não existir, devolve lista vazia.
// Se o conteúdo estiver corrompido, LANÇA um erro (quem chama decide o que mostrar).
function lerLista(chave) {
    const texto = localStorage.getItem(chave);

    if (!texto) {
        return [];
    }

    const lista = JSON.parse(texto);

    if (!Array.isArray(lista)) {
        throw new Error("O conteúdo salvo não é uma lista.");
    }

    return lista;
}

// Lê o usuário conectado (sessão). Devolve null se não houver ou se estiver corrompido.
function lerUsuarioLogado() {
    try {
        return JSON.parse(sessionStorage.getItem("eduMaisUsuarioLogado"));
    } catch (erro) {
        return null;
    }
}

// Garante que só a equipe acesse a página.
// Devolve o usuário se estiver tudo certo; caso contrário redireciona e devolve null.
function exigirEquipe() {
    const usuario = lerUsuarioLogado();

    if (!usuario) {
        window.location.href = "login.html";
        return null;
    }

    if (usuario.perfil !== "equipe") {
        window.location.href = "dashboard.html";
        return null;
    }

    return usuario;
}

// Apaga a sessão quando o usuário clica em "Sair da plataforma".
function configurarLogout() {
    const botao = document.getElementById("logoutButton");

    if (!botao) {
        return;
    }

    botao.addEventListener("click", () => {
        sessionStorage.removeItem("eduMaisUsuarioLogado");
    });
}

// Escreve um texto em um elemento pelo id (se ele existir).
function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

// Deixa o texto em minúsculas e sem acentos, para a pesquisa ("joao" acha "João").
function normalizarTexto(texto) {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Calcula a idade a partir de "AAAA-MM-DD". Devolve null se a data for inválida.
function calcularIdade(nascimento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento || "")) {
        return null;
    }

    const [ano, mes, dia] = nascimento.split("-").map(Number);
    const hoje = new Date();

    let idade = hoje.getFullYear() - ano;
    const mesAtual = hoje.getMonth() + 1;

    if (mesAtual < mes || (mesAtual === mes && hoje.getDate() < dia)) {
        idade--;
    }

    return idade;
}

// Converte "AAAA-MM-DD" para "DD/MM/AAAA". Se for inválida, devolve "Não informado".
function formatarData(nascimento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento || "")) {
        return "Não informado";
    }

    const [ano, mes, dia] = nascimento.split("-");
    return `${dia}/${mes}/${ano}`;
}

// Se o valor estiver vazio, mostra "Não informado".
function valorOuPadrao(valor) {
    const texto = valor === undefined || valor === null ? "" : String(valor).trim();
    return texto ? texto : "Não informado";
}