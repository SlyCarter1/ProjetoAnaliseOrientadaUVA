// dashboard-equipe.js
// Visão geral da equipe integrada ao PostgreSQL via FastAPI,
// consolidando 1 linha por aluno (RA único) em "Últimas matrículas realizadas".

const usuarioEquipe = exigirEquipe();
const API_BASE = "http://localhost:8001";

function criarCelula(texto, classe, tooltip) {
    const td = document.createElement("td");
    if (classe) td.className = classe;
    if (tooltip) td.title = tooltip;
    td.textContent = texto;
    return td;
}

function agruparMatriculasAtivasPorAluno(matriculasAtivas) {
    const mapa = new Map();

    for (const m of matriculasAtivas) {
        const chave = m.numero_matricula || String(m.aluno_id);

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                aluno_id: m.aluno_id,
                numero_matricula: m.numero_matricula,
                aluno: m.aluno,
                turmas: [],
                ultimaData: m.data_matricula,
                maiorMatriculaId: Number(m.matricula_id) || 0
            });
        }

        const grupo = mapa.get(chave);
        if (m.turma && !grupo.turmas.includes(m.turma)) {
            grupo.turmas.push(m.turma);
        }
        if ((Number(m.matricula_id) || 0) > grupo.maiorMatriculaId) {
            grupo.maiorMatriculaId = Number(m.matricula_id) || 0;
            grupo.ultimaData = m.data_matricula;
        }
    }

    return Array.from(mapa.values()).sort((a, b) => b.maiorMatriculaId - a.maiorMatriculaId);
}

async function carregarVisaoGeral() {
    if (usuarioEquipe && usuarioEquipe.nome) {
        const saudacao = document.getElementById("boasVindasEquipe");
        saudacao.textContent = `Olá, ${usuarioEquipe.nome}! Acompanhe os dados atualizados do EduMais Connect.`;
    }

    try {
        const [resAlunos, resTurmas, resMatriculas] = await Promise.all([
            fetch(`${API_BASE}/alunos`),
            fetch(`${API_BASE}/turmas`),
            fetch(`${API_BASE}/matriculas`)
        ]);

        if (!resAlunos.ok || !resTurmas.ok || !resMatriculas.ok) {
            throw new Error("Falha ao consultar API.");
        }

        const alunos = await resAlunos.json();
        const turmas = await resTurmas.json();
        const matriculas = await resMatriculas.json();

        // 1. Indicadores de Alunos
        const alunosAtivos = alunos.filter(a => a.ativo !== false);
        document.getElementById("kpiAlunosAtivos").textContent = alunosAtivos.length;
        document.getElementById("kpiAlunosTotal").textContent = `${alunos.length} cadastrado(s) no total`;

        if (alunos.length > 0) {
            const maisRecente = [...alunos].sort((a, b) => b.pessoa_id - a.pessoa_id)[0];
            document.getElementById("kpiUltimoRa").textContent = maisRecente.numero_matricula || "—";
            document.getElementById("kpiUltimoAluno").textContent = valorOuPadrao(maisRecente.nome);
        } else {
            document.getElementById("kpiUltimoRa").textContent = "—";
            document.getElementById("kpiUltimoAluno").textContent = "Nenhum aluno cadastrado";
        }

        // 2. Indicadores de Turmas e Vagas
        const turmasAtivas = turmas.filter(t => t.ativo !== false);
        const totalVagas = turmasAtivas.reduce((acc, t) => acc + (Number(t.vagas_totais) || 0), 0);
        const vagasDisponiveis = turmasAtivas.reduce((acc, t) => acc + (Number(t.vagas_disponiveis) || 0), 0);

        document.getElementById("kpiTurmasAtivas").textContent = turmasAtivas.length;
        document.getElementById("kpiVagasLivres").textContent = `${vagasDisponiveis} de ${totalVagas} vagas disponíveis`;

        // 3. Indicadores de Matrículas consolidadas
        const matriculasAtivas = matriculas.filter(m => m.status === "ativa");
        const alunosConsolidados = agruparMatriculasAtivasPorAluno(matriculasAtivas);
        const taxaOcupacao = totalVagas > 0
            ? Math.round(((totalVagas - vagasDisponiveis) / totalVagas) * 100)
            : 0;

        document.getElementById("kpiMatriculasAtivas").textContent = alunosConsolidados.length;
        document.getElementById("kpiOcupacaoGeral").textContent =
            `${matriculasAtivas.length} inscrições em turmas (${taxaOcupacao}% ocupação)`;

        // 4. Tabela de ocupação das turmas
        const tbodyTurmas = document.getElementById("listaResumoTurmas");
        const wrapperTurmas = document.getElementById("tabelaTurmasWrapper");
        const semTurmas = document.getElementById("semTurmasBox");

        if (turmasAtivas.length === 0) {
            wrapperTurmas.hidden = true;
            semTurmas.hidden = false;
        } else {
            const linhasTurmas = turmasAtivas.map(t => {
                const tr = document.createElement("tr");
                tr.appendChild(criarCelula(valorOuPadrao(t.turma)));
                tr.appendChild(criarCelula(valorOuPadrao(t.curso)));
                tr.appendChild(criarCelula(valorOuPadrao(t.educador)));
                tr.appendChild(criarCelula(valorOuPadrao(t.horario)));
                tr.appendChild(criarCelula(`${t.alunos_matriculados} / ${t.vagas_totais} (${t.vagas_disponiveis} livres)`));
                return tr;
            });
            tbodyTurmas.replaceChildren(...linhasTurmas);
            wrapperTurmas.hidden = false;
            semTurmas.hidden = true;
        }

        // 5. Tabela consolidada por aluno (RA único)
        const tbodyMat = document.getElementById("listaUltimasMatriculas");
        const wrapperMat = document.getElementById("tabelaMatriculasWrapper");
        const semMat = document.getElementById("semMatriculasBox");

        if (alunosConsolidados.length === 0) {
            wrapperMat.hidden = true;
            semMat.hidden = false;
        } else {
            const recentes = alunosConsolidados.slice(0, 5).map(g => {
                const tr = document.createElement("tr");
                const extras = g.turmas.length - 1;
                const resumoTurmas = extras > 0
                    ? `${g.turmas[0]} e +${extras}`
                    : (g.turmas[0] || "—");

                tr.appendChild(criarCelula(g.numero_matricula || "—", "ra-badge"));
                tr.appendChild(criarCelula(valorOuPadrao(g.aluno)));
                tr.appendChild(criarCelula(resumoTurmas, "", g.turmas.join(" • ")));
                tr.appendChild(criarCelula(formatarData(g.ultimaData)));
                return tr;
            });
            tbodyMat.replaceChildren(...recentes);
            wrapperMat.hidden = false;
            semMat.hidden = true;
        }
    } catch (erro) {
        console.error("Erro ao carregar visão geral:", erro.name);
        document.getElementById("estadoErro").hidden = false;
    }
}

if (usuarioEquipe) {
    configurarLogout();
    carregarVisaoGeral();
}