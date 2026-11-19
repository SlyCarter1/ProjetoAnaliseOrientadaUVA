// matriculas.js
// Tela de matrículas consolidada por aluno (RA único), integrada ao PostgreSQL via FastAPI.
// Depende apenas de utilitarios.js.

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

const matriculaForm = document.getElementById("matriculaForm");
const alunoSelect = document.getElementById("matriculaAluno");
const turmaSelect = document.getElementById("matriculaTurma");
const erroAluno = document.getElementById("erroAluno");
const erroTurma = document.getElementById("erroTurma");
const matriculaBotao = document.getElementById("matriculaBotao");
const matriculaMensagem = document.getElementById("matriculaMensagem");
const avisoSemDados = document.getElementById("avisoSemDados");

const buscaForm = document.getElementById("buscaForm");
const buscaInput = document.getElementById("buscaMatricula");
const resumoResultados = document.getElementById("resumoResultados");

const tabelaWrapper = document.getElementById("tabelaWrapper");
const corpoTabela = document.getElementById("listaMatriculas");
const estadoVazio = document.getElementById("estadoVazio");
const estadoSemResultado = document.getElementById("estadoSemResultado");
const estadoErro = document.getElementById("estadoErro");

const gerenciarAlunoDialog = document.getElementById("gerenciarAlunoDialog");

let alunos = [];
let turmas = [];
let matriculas = [];
let alunoEmGerenciamentoId = null;

async function carregarDados() {
    const [resAlunos, resTurmas, resMatriculas] = await Promise.all([
        fetch(`${API_BASE}/alunos`),
        fetch(`${API_BASE}/turmas`),
        fetch(`${API_BASE}/matriculas`)
    ]);

    if (!resAlunos.ok || !resTurmas.ok || !resMatriculas.ok) {
        throw new Error("Erro ao consultar API.");
    }

    const todosAlunos = await resAlunos.json();
    alunos = todosAlunos.filter(a => a.ativo !== false);
    turmas = await resTurmas.json();
    matriculas = await resMatriculas.json();
}

function criarOpcao(valor, texto) {
    const opcao = document.createElement("option");
    opcao.value = valor;
    opcao.textContent = texto;
    return opcao;
}

function preencherSelects() {
    const opcoesAlunos = alunos.map(aluno =>
        criarOpcao(
            aluno.pessoa_id,
            `[${aluno.numero_matricula || "S/RA"}] ${valorOuPadrao(aluno.nome)} (${valorOuPadrao(aluno.email)})`
        )
    );

    const turmasAtivas = turmas.filter(t => t.ativo !== false);
    const opcoesTurmas = turmasAtivas.map(turma => {
        const nomeTurma = turma.turma || turma.nome || "Turma sem nome";
        const livres = turma.vagas_disponiveis;
        const statusVaga = livres > 0
            ? `${livres}/${turma.vagas_totais} vagas livres`
            : `LOTADA (0/${turma.vagas_totais})`;

        return criarOpcao(
            turma.turma_id,
            `${nomeTurma} — ${valorOuPadrao(turma.horario)} (${statusVaga})`
        );
    });

    alunoSelect.replaceChildren(criarOpcao("", "Selecione um aluno"), ...opcoesAlunos);
    turmaSelect.replaceChildren(criarOpcao("", "Selecione uma turma"), ...opcoesTurmas);
}

function ativarFormulario(ativo) {
    alunoSelect.disabled = !ativo;
    turmaSelect.disabled = !ativo;
    matriculaBotao.disabled = !ativo;
}

function mostrarMensagem(texto, tipo) {
    matriculaMensagem.textContent = texto;
    matriculaMensagem.className = `form-message ${tipo}`;
}

function limparMensagem() {
    matriculaMensagem.textContent = "";
    matriculaMensagem.className = "form-message";
}

function limparErro(select, erro) {
    erro.textContent = "";
    select.setAttribute("aria-invalid", "false");
}

function mostrarErro(select, erro, texto) {
    erro.textContent = texto;
    select.setAttribute("aria-invalid", "true");
}

function validarSelect(select, erro, descricao) {
    const vazio = select.value === "";
    if (vazio) {
        mostrarErro(select, erro, `Selecione ${descricao}.`);
    } else {
        limparErro(select, erro);
    }
    return !vazio;
}

function configurarFormulario() {
    alunoSelect.addEventListener("change", () => limparErro(alunoSelect, erroAluno));
    turmaSelect.addEventListener("change", () => limparErro(turmaSelect, erroTurma));

    matriculaForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparMensagem();

        const alunoOk = validarSelect(alunoSelect, erroAluno, "um aluno");
        const turmaOk = validarSelect(turmaSelect, erroTurma, "uma turma");

        if (!alunoOk || !turmaOk) {
            mostrarMensagem("Corrija os campos indicados.", "error");
            (alunoOk ? turmaSelect : alunoSelect).focus();
            return;
        }

        try {
            const resposta = await fetch(`${API_BASE}/matriculas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aluno_id: Number(alunoSelect.value),
                    turma_id: Number(turmaSelect.value)
                })
            });
            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarErro(turmaSelect, erroTurma, dados.detail || "Não foi possível matricular.");
                mostrarMensagem(dados.detail || "Matrícula não realizada.", "error");
                return;
            }

            matriculaForm.reset();
            limparErro(alunoSelect, erroAluno);
            limparErro(turmaSelect, erroTurma);
            mostrarMensagem(dados.mensagem || "Matrícula realizada com sucesso!", "success");

            await recarregarTudo();
            alunoSelect.focus();
        } catch {
            mostrarMensagem("Falha de conexão com o servidor Python na porta 8001.", "error");
        }
    });
}

// ---------- AGRUPAMENTO POR ALUNO (1 LINHA POR RA) ----------

function agruparMatriculasPorAluno() {
    const mapa = new Map();

    for (const m of matriculas) {
        if (!mapa.has(m.aluno_id)) {
            mapa.set(m.aluno_id, {
                aluno_id: m.aluno_id,
                numero_matricula: m.numero_matricula,
                aluno: m.aluno,
                email_aluno: m.email_aluno,
                todas: [],
                ativas: [],
                canceladas: [],
                ultimaData: m.data_matricula
            });
        }
        const grupo = mapa.get(m.aluno_id);
        grupo.todas.push(m);
        if (m.status === "ativa") {
            grupo.ativas.push(m);
        } else {
            grupo.canceladas.push(m);
        }
    }

    // Ordena: quem tem turma ativa primeiro, depois ordem alfabética
    return Array.from(mapa.values()).sort((a, b) => {
        const aTemAtiva = a.ativas.length > 0 ? 1 : 0;
        const bTemAtiva = b.ativas.length > 0 ? 1 : 0;
        if (bTemAtiva !== aTemAtiva) return bTemAtiva - aTemAtiva;
        return (a.aluno || "").localeCompare(b.aluno || "", "pt-BR");
    });
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

function criarLinhaConsolidada(grupo) {
    const linha = document.createElement("tr");
    const temAtivas = grupo.ativas.length > 0;

    // 1. Aluno / RA
    const celulaAluno = document.createElement("td");
    const ra = document.createElement("span");
    ra.className = "ra-badge";
    ra.textContent = `[${grupo.numero_matricula || "—"}] `;
    celulaAluno.append(ra, valorOuPadrao(grupo.aluno));

    if (grupo.email_aluno) {
        const email = document.createElement("span");
        email.className = "cell-secondary";
        email.textContent = grupo.email_aluno;
        celulaAluno.appendChild(email);
    }
    linha.appendChild(celulaAluno);

    // 2. Turma(s) — Ex.: "Programação Web Básica e +1"
    const celulaTurmas = document.createElement("td");
    if (temAtivas) {
        const principal = grupo.ativas[0];
        const extras = grupo.ativas.length - 1;
        const tituloTurma = extras > 0
            ? `${principal.turma} e +${extras}`
            : principal.turma;

        celulaTurmas.append(tituloTurma);
        celulaTurmas.title = grupo.ativas.map(t => t.turma).join(" • ");

        if (extras > 0) {
            const sub = document.createElement("span");
            sub.className = "cell-secondary";
            sub.textContent = `${grupo.ativas.length} turmas ativas`;
            celulaTurmas.appendChild(sub);
        }
    } else {
        celulaTurmas.append("Nenhuma turma ativa");
        if (grupo.canceladas.length > 0) {
            const sub = document.createElement("span");
            sub.className = "cell-secondary";
            sub.textContent = `Última: ${grupo.canceladas[0].turma}`;
            celulaTurmas.appendChild(sub);
        }
    }
    linha.appendChild(celulaTurmas);

    // 3. Curso / Horário
    const celulaCurso = document.createElement("td");
    if (temAtivas) {
        const principal = grupo.ativas[0];
        const extras = grupo.ativas.length - 1;
        celulaCurso.append(extras > 0 ? `${principal.curso} e +${extras}` : valorOuPadrao(principal.curso));

        const hor = document.createElement("span");
        hor.className = "cell-secondary";
        hor.textContent = extras > 0
            ? `${principal.horario} (+${extras})`
            : valorOuPadrao(principal.horario);
        celulaCurso.appendChild(hor);
    } else {
        celulaCurso.textContent = "—";
    }
    linha.appendChild(celulaCurso);

    // 4. Data mais recente
    linha.appendChild(criarCelula(formatarData(grupo.ultimaData)));

    // 5. Situação geral
    const celulaStatus = document.createElement("td");
    const tag = document.createElement("span");
    tag.className = `status-tag ${temAtivas ? "ativa" : "cancelada"}`;
    tag.textContent = temAtivas ? "Ativa" : "Cancelada";
    celulaStatus.appendChild(tag);
    linha.appendChild(celulaStatus);

    // 6. Ação única: Gerenciar turmas deste aluno
    const celulaAcao = document.createElement("td");
    const btnGerenciar = document.createElement("button");
    btnGerenciar.type = "button";
    btnGerenciar.className = "table-button";
    btnGerenciar.textContent = temAtivas
        ? `Gerenciar (${grupo.ativas.length})`
        : "Gerenciar";
    btnGerenciar.addEventListener("click", () => abrirModalAluno(grupo.aluno_id));
    celulaAcao.appendChild(btnGerenciar);
    linha.appendChild(celulaAcao);

    return linha;
}

function atualizarLista() {
    const grupos = agruparMatriculasPorAluno();
    const totalAlunos = grupos.length;

    if (totalAlunos === 0) {
        resumoResultados.textContent = "";
        mostrarApenas(estadoVazio);
        return;
    }

    const termo = normalizarTexto(buscaInput.value.trim());

    const filtrados = grupos.filter(g => {
        if (!termo) return true;
        const todasTurmasECursos = g.todas.map(m => `${m.turma || ""} ${m.curso || ""}`).join(" ");
        const texto = normalizarTexto(
            `${g.numero_matricula || ""} ${g.aluno || ""} ${g.email_aluno || ""} ${todasTurmasECursos}`
        );
        return texto.includes(termo);
    });

    if (filtrados.length === 0) {
        resumoResultados.textContent = "Nenhuma matrícula encontrada.";
        mostrarApenas(estadoSemResultado);
        return;
    }

    corpoTabela.replaceChildren(...filtrados.map(criarLinhaConsolidada));

    const totalAtivas = matriculas.filter(m => m.status === "ativa").length;
    const rotuloAluno = totalAlunos === 1 ? "aluno" : "alunos";
    resumoResultados.textContent = `Mostrando ${filtrados.length} de ${totalAlunos} ${rotuloAluno} (${totalAtivas} inscrições ativas no total).`;
    mostrarApenas(tabelaWrapper);
}

// ---------- MODAL: GERENCIAR TODAS AS TURMAS DO ALUNO ----------

function abrirModalAluno(alunoId) {
    alunoEmGerenciamentoId = alunoId;
    document.getElementById("modalAlunoFeedback").textContent = "";
    renderizarConteudoModalAluno(alunoId);
    gerenciarAlunoDialog.showModal();
}

function renderizarConteudoModalAluno(alunoId) {
    const grupos = agruparMatriculasPorAluno();
    const grupo = grupos.find(g => g.aluno_id === alunoId);
    const alunoInfo = alunos.find(a => a.pessoa_id === alunoId);

    const nome = grupo?.aluno || alunoInfo?.nome || "Aluno";
    const ra = grupo?.numero_matricula || alunoInfo?.numero_matricula || "—";
    const email = grupo?.email_aluno || alunoInfo?.email || "";

    document.getElementById("gerenciarAlunoTitulo").textContent = `[${ra}] ${nome}`;
    document.getElementById("gerenciarAlunoSubtitulo").textContent =
        `${email} • ${grupo ? grupo.ativas.length : 0} turma(s) ativa(s)`;

    // Select para matricular o aluno em uma nova turma diretamente do modal
    const idsAtivos = new Set((grupo?.ativas || []).map(m => m.turma_id));
    const turmasDisponiveis = turmas.filter(t => t.ativo !== false && !idsAtivos.has(t.turma_id));

    const selectModal = document.getElementById("modalNovaTurmaSelect");
    const btnAddModal = document.getElementById("btnAdicionarTurmaModal");

    const opcoes = turmasDisponiveis.map(t =>
        criarOpcao(t.turma_id, `${t.turma} — ${t.horario} (${t.vagas_disponiveis}/${t.vagas_totais} vagas)`)
    );
    selectModal.replaceChildren(
        criarOpcao("", turmasDisponiveis.length ? "Selecione uma turma para adicionar..." : "Aluno já inscrito em todas as turmas"),
        ...opcoes
    );
    selectModal.disabled = turmasDisponiveis.length === 0;
    btnAddModal.disabled = turmasDisponiveis.length === 0;

    // Tabela com todas as turmas (ativas + histórico) do aluno
    const tbody = document.getElementById("listaTurmasDoAluno");
    const lista = grupo ? grupo.todas : [];

    const linhas = lista.map(m => {
        const tr = document.createElement("tr");

        tr.appendChild(criarCelula(valorOuPadrao(m.turma)));

        const tdCurso = document.createElement("td");
        tdCurso.append(valorOuPadrao(m.curso));
        const sub = document.createElement("span");
        sub.className = "cell-secondary";
        sub.textContent = valorOuPadrao(m.horario);
        tdCurso.appendChild(sub);
        tr.appendChild(tdCurso);

        tr.appendChild(criarCelula(formatarData(m.data_matricula)));

        const tdStatus = document.createElement("td");
        const tag = document.createElement("span");
        tag.className = `status-tag ${m.status === "ativa" ? "ativa" : "cancelada"}`;
        tag.textContent = m.status === "ativa" ? "Ativa" : "Cancelada";
        tdStatus.appendChild(tag);
        tr.appendChild(tdStatus);

        const tdAcao = document.createElement("td");
        if (m.status === "ativa") {
            const acoes = document.createElement("div");
            acoes.className = "action-group";

            const destinos = turmas.filter(t => t.ativo !== false && !idsAtivos.has(t.turma_id));
            if (destinos.length > 0) {
                const selMover = document.createElement("select");
                selMover.style.padding = "5px 8px";
                selMover.style.borderRadius = "6px";
                selMover.style.border = "1px solid #cbd5e1";

                selMover.appendChild(criarOpcao("", "Mover para..."));
                destinos.forEach(d => {
                    selMover.appendChild(criarOpcao(d.turma_id, `${d.turma} (${d.vagas_disponiveis} vagas)`));
                });

                selMover.addEventListener("change", async () => {
                    if (!selMover.value) return;
                    const destinoId = Number(selMover.value);
                    if (!confirm(`Transferir ${nome} da turma "${m.turma}" para a turma selecionada?`)) {
                        selMover.value = "";
                        return;
                    }
                    await executarTransferenciaModal(m.matricula_id, destinoId);
                });

                acoes.appendChild(selMover);
            }

            const btnCancelar = document.createElement("button");
            btnCancelar.type = "button";
            btnCancelar.className = "table-button danger";
            btnCancelar.textContent = "Cancelar";
            btnCancelar.addEventListener("click", () => executarCancelamentoModal(m));

            acoes.appendChild(btnCancelar);
            tdAcao.appendChild(acoes);
        } else {
            tdAcao.textContent = "—";
        }
        tr.appendChild(tdAcao);

        return tr;
    });

    tbody.replaceChildren(...linhas);
}

async function executarTransferenciaModal(matriculaId, novaTurmaId) {
    const fb = document.getElementById("modalAlunoFeedback");
    try {
        const res = await fetch(`${API_BASE}/matriculas/${matriculaId}/transferir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nova_turma_id: novaTurmaId })
        });
        const dados = await res.json();
        fb.textContent = dados.mensagem || dados.detail;
        fb.className = `form-message ${res.ok ? "success" : "error"}`;
        await recarregarTudo();
    } catch {
        fb.textContent = "Falha de conexão com o servidor.";
        fb.className = "form-message error";
    }
}

async function executarCancelamentoModal(m) {
    if (!confirm(`Cancelar a inscrição de ${m.aluno} na turma "${m.turma}" e liberar a vaga?`)) return;
    const fb = document.getElementById("modalAlunoFeedback");
    try {
        const res = await fetch(`${API_BASE}/matriculas/${m.matricula_id}/cancelar`, {
            method: "POST"
        });
        const dados = await res.json();
        fb.textContent = dados.mensagem || dados.detail;
        fb.className = `form-message ${res.ok ? "success" : "error"}`;
        await recarregarTudo();
    } catch {
        fb.textContent = "Falha de conexão com o servidor.";
        fb.className = "form-message error";
    }
}

function configurarModalAluno() {
    document.getElementById("fecharGerenciarAluno").addEventListener("click", () => gerenciarAlunoDialog.close());
    document.getElementById("concluirGerenciarAluno").addEventListener("click", () => gerenciarAlunoDialog.close());
    gerenciarAlunoDialog.addEventListener("click", (e) => {
        if (e.target === gerenciarAlunoDialog) gerenciarAlunoDialog.close();
    });

    document.getElementById("adicionarTurmaModalForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const turmaId = document.getElementById("modalNovaTurmaSelect").value;
        if (!turmaId || !alunoEmGerenciamentoId) return;

        const fb = document.getElementById("modalAlunoFeedback");
        try {
            const res = await fetch(`${API_BASE}/matriculas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aluno_id: alunoEmGerenciamentoId, turma_id: Number(turmaId) })
            });
            const dados = await res.json();
            fb.textContent = dados.mensagem || dados.detail;
            fb.className = `form-message ${res.ok ? "success" : "error"}`;
            await recarregarTudo();
        } catch {
            fb.textContent = "Falha de conexão com o servidor.";
            fb.className = "form-message error";
        }
    });
}

// ---------- INÍCIO ----------

async function recarregarTudo() {
    try {
        await carregarDados();
        preencherSelects();
        const podeMatricular = alunos.length > 0 && turmas.length > 0;
        ativarFormulario(podeMatricular);
        avisoSemDados.hidden = podeMatricular;
        atualizarLista();

        if (alunoEmGerenciamentoId && gerenciarAlunoDialog.open) {
            renderizarConteudoModalAluno(alunoEmGerenciamentoId);
        }
    } catch (erro) {
        console.error("Falha ao carregar os dados:", erro.name);
        resumoResultados.textContent = "";
        ativarFormulario(false);
        mostrarApenas(estadoErro);
    }
}

async function iniciarPaginaMatriculas() {
    configurarLogout();
    configurarFormulario();
    configurarModalAluno();

    buscaForm.addEventListener("submit", (evento) => evento.preventDefault());
    buscaInput.addEventListener("input", atualizarLista);

    await recarregarTudo();
}

if (usuarioEquipe) {
    iniciarPaginaMatriculas();
}