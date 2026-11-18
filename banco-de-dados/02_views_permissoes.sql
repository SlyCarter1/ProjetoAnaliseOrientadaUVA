-- Execute como proprietário do banco após 01_schema.sql

CREATE SCHEMA IF NOT EXISTS consulta;

CREATE OR REPLACE VIEW consulta.vw_consulta_gerencial
WITH (security_barrier = true) AS
SELECT 
        t.turma_id,
        t.nome AS turma,
        t.curso,
        t.horario,
        t.vagas_totais,
        count(m.matricula_id)::integer AS alunos_matriculados,
        greatest(t.vagas_totais - count(m.matricula_id)::integer, 0) AS vagas_disponiveis
FROM edumais.turma AS t
LEFT JOIN edumais.matricula AS m
 on m.turma_id = t.turma_id AND m.status = 'ativa'
WHERE t.ativa
GROUP BY t.turma_id, t.nome, t.curso, t.horario, t.vagas_totais;

-- visão opercaional ideentificavel, somente para equipe autorizada
CREATE OR REPLACE VIEW consulta.vw_matriculas_equipe
WITH (security_barrier = true) AS
SELECT 
        m.matricula_id,
        p.nome AS aluno,
        p.email AS email_aluno,
        t.nome AS turma,
        t.horario,
        m.data_matricula,
        m.status
FROM edumais.matricula AS m
JOIN edumais.pessoa AS p ON p.pessoa_id = m.aluno_id
JOIN edumais.turma AS t ON t.turma_id = m.turma_id;

-- Crie os roles uma única vez no ambiente. Não inclua senhas neste arquivo:
-- CREATE ROLE edumais_owner NOLOGIN;
-- CREATE ROLE edumais_app LOGIN;
-- CREATE ROLE edumais_ia LOGIN;
-- CREATE ROLE edumais_equipe LOGIN;

-- Configure senhas/segredos fora do SQL (secret manager ou variável protegida).

REVOKE ALL ON SCHEMA edumais, consulta FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA edumais FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA edumais FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA edumais FROM PUBLIC;

-- agente text-to-sql: leitura apenas da visão agregada, sem PII

GRANT USAGE ON SCHEMA consulta TO edumais_ia;
GRANT SELCT ON consulta.vw_consulta_gerencial TO edumais_ia;
REVOKE ALL ON consulta.vw_matriculas_equipe FROM edumais_ia;
GRANT USAGE ON SCHEMA consutla TO edumais_equipe;
GRANT SELECT ON consulta.vw_consulta_gerencial, consulta.vw_matriculas_equipe TO edumais_equipe;

