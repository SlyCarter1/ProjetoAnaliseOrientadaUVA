// turmas.js
// Turmas: cadastro, edição e gestão de alunos matriculados em cada turma via PostgreSQL.
// Depende apenas de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaTurma");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaTurmas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

const alunosTurmaDialog = document.getElementById("alunosTurmaDialog");
const editarTurmaDialog = document.getElementById("editarTurmaDialog");

let turmas = [];
let alunos = [];
let matriculas = [];
let turmaEmGerenciamentoId = null;

async function carregarDados() {
    const [resTurmas, resAlunos, resMatriculas] = await Promise.all([
        fetch(`${API_BASE}/turmas`),
        fetch(`${API_BASE}/alunos`),
        fetch(`${API_BASE}/matriculas`)
    ]);

    if (!resTurmas.ok || !resAlunos.ok || !resMatriculas.ok) {
        throw new Error("Erro ao consultar API.");
    }

    turmas = await resTurmas.json();
    alunos = (await resAlunos.json()).filter(a => a.ativo !== false);
    matriculas = await resMatriculas.json();
}

function mostrarApenas(blocoVisivel) {
    [tabelaWrapper, estadoVazio, estadoSemResultado, estadoErro].forEach(bloco => {
        bloco.hidden = bloco !== blocoVisivel;
    });
}

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto;
    return celula;
}

function criarLinha(turma) {
    const linha = document.createElement("tr");

    linha.appendChild(criarCelula(valorOuPadrao(turma.turma)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.curso)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.horario)));
    linha.appendChild(criarCelula(valorOuPadrao(turma.educador)));

    const celulaVagas = document.createElement("td");
    const spanVagas = document.createElement("span");
    const lotada = turma.vagas_disponiveis <= 0;
    spanVagas.className = `vagas-badge ${lotada ? "lotada" : ""}`;
    spanVagas.textContent = `${turma.alunos_matriculados} de ${turma.vagas_totais}` + (lotada ? " (Lotada)" : "");
    celulaVagas.appendChild(spanVagas);
    linha.appendChild(celulaVagas);

    const celulaAcoes = document.createElement("td");
    const grupo = document.createElement("div");
    grupo.className = "action-group";

    const btnAlunos = document.createElement("button");
    btnAlunos.type = "button";
    btnAlunos.className = "table-button";
    btnAlunos.textContent = `Gerenciar alunos (${turma.alunos_matriculados})`;
    btnAlunos.addEventListener("click", () => abrirGerenciadorAlunosTurma(turma.turma_id));

    const btnEditar = document.createElement("button");
    btnEditar.type = "button";
    btnEditar.className = "table-button";
    btnEditar.textContent = "Editar turma";
    btnEditar.addEventListener("click", () => abrirModalEditarTurma(turma));

    grupo.append(btnAlunos, btnEditar);
    celulaAcoes.appendChild(grupo);
    linha.appendChild(celulaAcoes);

    return linha;
}

function atualizarLista() {
    const total = turmas.length;

    if (total === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    const filtradas = turmas.filter(turma => {
        if (!termo) return true;
        const texto = normalizarTexto(
            `${turma.turma || ""} ${turma.curso || ""} ${turma.horario || ""} ${turma.educador || ""}`
        );
        return texto.includes(termo);
    });

    if (filtradas.length === 0) {
        resumoResultados.textContent = "Nenhuma turma encontrada.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtradas.map(criarLinha));

    const rotulo = total === 1 ? "turma" : "turmas";
    resumoResultados.textContent = `Mostrando ${filtradas.length} de ${total} ${rotulo}.`;
    mostrarApenas(tabelaWrapper);
}

async function recarregarLista() {
    try {
        await carregarDados();
        atualizarLista();
        if (turmaEmGerenciamentoId && alunosTurmaDialog.open) {
            renderizarConteudoModalTurma(turmaEmGerenciamentoId);
        }
    } catch (erro) {
        console.error("Falha ao carregar as turmas:", erro.name);
        resumoResultados.textContent = "";
        mostrarApenas(estadoErro);
    }
}

function abrirGerenciadorAlunosTurma(turmaId) {
    turmaEmGerenciamentoId = turmaId;
    document.getElementById("modalTurmaFeedback").textContent = "";
    renderizarConteudoModalTurma(turmaId);
    alunosTurmaDialog.showModal();
}

function renderizarConteudoModalTurma(turmaId) {
    const turma = turmas.find(t => t.turma_id === turmaId);
    if (!turma) return;

    document.getElementById("turmaAtualId").value = turma.turma_id;
    document.getElementById("alunosTurmaTitulo").textContent = `Alunos — ${turma.turma}`;
    document.getElementById("alunosTurmaSubtitulo").textContent =
        `${turma.curso} • ${turma.horario} • Vagas: ${turma.alunos_matriculados}/${turma.vagas_totais} (${turma.vagas_disponiveis} disponíveis)`;

    const ativasDaTurma = matriculas.filter(m => m.turma_id === turmaId && m.status === "ativa");
    const idsJaMatriculados = new Set(ativasDaTurma.map(m => m.aluno_id));

    const disponiveis = alunos.filter(a => !idsJaMatriculados.has(a.pessoa_id));
    const selectAluno = document.getElementById("selectAlunoParaTurma");
    const btnInserir = document.getElementById("btnInserirAlunoTurma");

    const opcoes = disponiveis.map(a => {
        const opt = document.createElement("option");
        opt.value = a.pessoa_id;
        opt.textContent = `[${a.numero_matricula || "S/RA"}] ${a.nome} (${a.email})`;
        return opt;
    });

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = disponiveis.length
        ? "Selecione um aluno para inserir..."
        : "Todos os alunos ativos já estão nesta turma";

    selectAluno.replaceChildren(placeholder, ...opcoes);
    selectAluno.disabled = disponiveis.length === 0 || turma.vagas_disponiveis <= 0;
    btnInserir.disabled = disponiveis.length === 0 || turma.vagas_disponiveis <= 0;

    const tbody = document.getElementById("listaAlunosDaTurma");
    const wrapper = document.getElementById("modalTabelaWrapper");
    const vazio = document.getElementById("modalSemAlunos");

    if (ativasDaTurma.length === 0) {
        wrapper.hidden = true;
        vazio.hidden = false;
        return;
    }

    wrapper.hidden = false;
    vazio.hidden = true;

    const outrasTurmas = turmas.filter(t => t.ativo !== false && t.turma_id !== turmaId);

    const linhas = ativasDaTurma.map(m => {
        const tr = document.createElement("tr");

        const tdRa = document.createElement("td");
        tdRa.className = "ra-badge";
        tdRa.textContent = m.numero_matricula || "—";
        tr.appendChild(tdRa);

        const tdNome = document.createElement("td");
        tdNome.append(m.aluno);
        const sub = document.createElement("span");
        sub.className = "cell-secondary";
        sub.textContent = m.email_aluno;
        tdNome.appendChild(sub);
        tr.appendChild(tdNome);

        tr.appendChild(criarCelula(formatarData(m.data_matricula)));

        const tdAcao = document.createElement("td");
        const grupo = document.createElement("div");
        grupo.className = "action-group";

        if (outrasTurmas.length > 0) {
            const selMover = document.createElement("select");
            selMover.style.padding = "5px 8px";
            selMover.style.borderRadius = "6px";
            selMover.style.border = "1px solid #cbd5e1";

            const optDefault = document.createElement("option");
            optDefault.value = "";
            optDefault.textContent = "Mover para...";
            selMover.appendChild(optDefault);

            outrasTurmas.forEach(ot => {
                const o = document.createElement("option");
                o.value = ot.turma_id;
                o.textContent = `${ot.turma} (${ot.vagas_disponiveis} vagas)`;
                selMover.appendChild(o);
            });

            selMover.addEventListener("change", async () => {
                if (!selMover.value) return;
                const destinoId = Number(selMover.value);
                if (!confirm(`Transferir ${m.aluno} para a turma selecionada?`)) {
                    selMover.value = "";
                    return;
                }
                await transferirAlunoDaTurma(m.matricula_id, destinoId);
            });

            grupo.appendChild(selMover);
        }

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "table-button danger";
        btnRemover.textContent = "Remover";
        btnRemover.addEventListener("click", () => removerAlunoDaTurma(m));

        grupo.appendChild(btnRemover);
        tdAcao.appendChild(grupo);
        tr.appendChild(tdAcao);

        return tr;
    });

    tbody.replaceChildren(...linhas);
}

async function transferirAlunoDaTurma(matriculaId, novaTurmaId) {
    const fb = document.getElementById("modalTurmaFeedback");
    try {
        const res = await fetch(`${API_BASE}/matriculas/${matriculaId}/transferir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nova_turma_id: novaTurmaId })
        });
        const dados = await res.json();
        fb.textContent = dados.mensagem || dados.detail;
        fb.className = `form-message ${res.ok ? "success" : "error"}`;
        await recarregarLista();
    } catch {
        fb.textContent = "Falha de conexão com o servidor.";
        fb.className = "form-message error";
    }
}

async function removerAlunoDaTurma(m) {
    if (!confirm(`Remover ${m.aluno} desta turma e liberar a vaga?`)) return;
    const fb = document.getElementById("modalTurmaFeedback");
    try {
        const res = await fetch(`${API_BASE}/matriculas/${m.matricula_id}/cancelar`, {
            method: "POST"
        });
        const dados = await res.json();
        fb.textContent = dados.mensagem || dados.detail;
        fb.className = `form-message ${res.ok ? "success" : "error"}`;
        await recarregarLista();
    } catch {
        fb.textContent = "Falha de conexão com o servidor.";
        fb.className = "form-message error";
    }
}

function abrirModalEditarTurma(turma) {
    document.getElementById("editTurmaId").value = turma.turma_id;
    document.getElementById("editTurmaNome").value = turma.turma || "";
    document.getElementById("editTurmaCurso").value = turma.curso || "";
    document.getElementById("editTurmaVagas").value = turma.vagas_totais;
    document.getElementById("editTurmaHorario").value = turma.horario || "";
    document.getElementById("editTurmaEducador").value = turma.educador === "A definir" ? "" : (turma.educador || "");
    document.getElementById("editTurmaAtivo").value = String(turma.ativo !== false);
    editarTurmaDialog.showModal();
}

function configurarModais() {
    document.getElementById("fecharAlunosTurma").addEventListener("click", () => alunosTurmaDialog.close());
    alunosTurmaDialog.addEventListener("click", (e) => {
        if (e.target === alunosTurmaDialog) alunosTurmaDialog.close();
    });

    document.getElementById("inserirAlunoTurmaForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const alunoId = document.getElementById("selectAlunoParaTurma").value;
        const turmaId = document.getElementById("turmaAtualId").value;
        if (!alunoId) return;

        const fb = document.getElementById("modalTurmaFeedback");
        try {
            const res = await fetch(`${API_BASE}/matriculas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aluno_id: Number(alunoId), turma_id: Number(turmaId) })
            });
            const dados = await res.json();
            fb.textContent = dados.mensagem || dados.detail;
            fb.className = `form-message ${res.ok ? "success" : "error"}`;
            await recarregarLista();
        } catch {
            fb.textContent = "Falha de conexão com o servidor.";
            fb.className = "form-message error";
        }
    });

    document.getElementById("fecharEditarTurma").addEventListener("click", () => editarTurmaDialog.close());
    document.getElementById("cancelarEditarTurma").addEventListener("click", () => editarTurmaDialog.close());
    editarTurmaDialog.addEventListener("click", (e) => {
        if (e.target === editarTurmaDialog) editarTurmaDialog.close();
    });

    document.getElementById("editarTurmaForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editTurmaId").value;
        const payload = {
            nome: document.getElementById("editTurmaNome").value.trim(),
            curso: document.getElementById("editTurmaCurso").value.trim(),
            vagas: Number(document.getElementById("editTurmaVagas").value),
            horario: document.getElementById("editTurmaHorario").value.trim(),
            educador: document.getElementById("editTurmaEducador").value.trim(),
            ativo: document.getElementById("editTurmaAtivo").value === "true"
        };

        try {
            const res = await fetch(`${API_BASE}/turmas/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const dados = await res.json();
            if (!res.ok) {
                alert(dados.detail || "Não foi possível atualizar a turma.");
                return;
            }
            editarTurmaDialog.close();
            await recarregarLista();
        } catch {
            alert("Falha de conexão com o servidor.");
        }
    });
}

function configurarFormularioNovaTurma() {
    const turmaForm = document.getElementById("turmaForm");
    if (!turmaForm) return;

    const turmaMensagem = document.getElementById("turmaMensagem");

    const campos = [
        { input: document.getElementById("turmaNome"), erro: document.getElementById("erroNome"), mensagem: "Informe o nome da turma.", valido: v => v !== "" },
        { input: document.getElementById("turmaCurso"), erro: document.getElementById("erroCurso"), mensagem: "Informe o curso.", valido: v => v !== "" },
        { input: document.getElementById("turmaVagas"), erro: document.getElementById("erroVagas"), mensagem: "Informe um número de vagas maior que zero.", valido: v => Number.isInteger(Number(v)) && Number(v) >= 1 },
        { input: document.getElementById("turmaHorario"), erro: document.getElementById("erroHorario"), mensagem: "Informe o horário.", valido: v => v !== "" },
        { input: document.getElementById("turmaEducador"), erro: document.getElementById("erroEducador"), mensagem: "Informe o nome do educador.", valido: v => v !== "" }
    ];

    function mostrarMensagem(texto, tipo) {
        turmaMensagem.textContent = texto;
        turmaMensagem.className = `form-message ${tipo}`;
    }

    function limparErro(campo) {
        campo.erro.textContent = "";
        campo.input.setAttribute("aria-invalid", "false");
    }

    function validarCampo(campo) {
        const ok = campo.valido(campo.input.value.trim());
        campo.erro.textContent = ok ? "" : campo.mensagem;
        campo.input.setAttribute("aria-invalid", ok ? "false" : "true");
        return ok;
    }

    campos.forEach(campo => {
        campo.input.addEventListener("input", () => limparErro(campo));
    });

    turmaForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        mostrarMensagem("", "");

        const invalidos = campos.filter(campo => !validarCampo(campo));
        if (invalidos.length > 0) {
            mostrarMensagem("Corrija os campos indicados.", "error");
            invalidos[0].input.focus();
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/turmas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: campos[0].input.value.trim(),
                    curso: campos[1].input.value.trim(),
                    vagas: Number(campos[2].input.value),
                    horario: campos[3].input.value.trim(),
                    educador: campos[4].input.value.trim(),
                    ativo: true
                })
            });
            const dados = await res.json();

            if (!res.ok) {
                mostrarMensagem(dados.detail || "Não foi possível salvar a turma.", "error");
                return;
            }

            turmaForm.reset();
            campos.forEach(limparErro);
            mostrarMensagem(dados.mensagem || "Turma cadastrada com sucesso.", "success");
            await recarregarLista();
            campos[0].input.focus();
        } catch {
            mostrarMensagem("Falha de conexão com o servidor Python na porta 8001.", "error");
        }
    });
}

async function iniciarPaginaTurmas() {
    configurarLogout();
    configurarFormularioNovaTurma();
    configurarModais();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    await recarregarLista();
}

if (usuarioEquipe) {
    iniciarPaginaTurmas();
}