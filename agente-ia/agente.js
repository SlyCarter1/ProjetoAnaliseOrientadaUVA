const API_IA_URL = "http://localhost:8001/consultar";

document.addEventListener("DOMContentLoaded", () => {
    const formConsulta = document.getElementById("form-agente");
    const inputPergunta = document.getElementById("input-pergunta");
    const btnEnviar = document.getElementById("btn-enviar");
    const areaResposta = document.getElementById("area-resposta");

    // Função auxiliar para transformar **negrito** e quebras de linha do Python em HTML limpo
    function formatarTextoParaHTML(texto) {
        return texto
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
    }

    formConsulta.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pergunta = inputPergunta.value.trim();
        if (!pergunta) return;

        // Trava o botão e mostra feedback imediato
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Consultando...";
        areaResposta.innerHTML = `<p class="loading">Analisando base de dados da EduMais...</p>`;

        try {
            const response = await fetch(API_IA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pergunta })
            });

            const dados = await response.json();

            if (dados.erro) {
                areaResposta.innerHTML = `
                    <div class="alerta-erro">
                        <strong>Não foi possível concluir a consulta:</strong> ${dados.detalhes || dados.erro}
                    </div>
                `;
                return;
            }

            areaResposta.innerHTML = `
                <div class="card-resposta">
                    <div class="texto-resposta">${formatarTextoParaHTML(dados.resposta)}</div>
                    <details class="detalhes-tecnicos" style="margin-top: 12px; font-size: 0.85rem; color: #555;">
                        <summary style="cursor: pointer;">Ver auditoria SQL (${dados.modelo_usado})</summary>
                        <pre style="background: #1e1e1e; color: #00ff88; padding: 10px; border-radius: 6px; overflow-x: auto; margin-top: 6px;">${dados.sql_executado}</pre>
                    </details>
                </div>
            `;
        } catch (err) {
            areaResposta.innerHTML = `
                <div class="alerta-erro">
                    <strong>Servidor de IA offline:</strong> Verifique se o uvicorn está rodando na porta 8001.
                </div>
            `;
            console.error(err);
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = "Perguntar";
        }
    });
});