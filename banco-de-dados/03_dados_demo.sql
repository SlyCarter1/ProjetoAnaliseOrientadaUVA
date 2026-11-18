-- OPCIONAL
-- CONTEÚDO FICTICIO PARA DEMONSTRAÇÃO
-- SENHA NÃO É UTILIZÁVEL

-- execute após 01_schema.sql . Remova em produção.


INSERT INTO edumais.pessoa(nome, email, telefone, data_nascimento, perfil, senha_hash) VALUES
('Fernanda Schmidt', 'fernanda@email.com', '229988776655', '1996-09-25', 'aluno', '1234'),
('Alan Cruz', 'alan@email.com', '22987766544', '1996-01-01', 'aluno', '0000'),
('Carlos Thiago', 'carlos@email.com', '22912345678', NULL, 'educador', '4321')
ON CONFLICT (email) DO NOTHING;

INSERT INTO edumais.responsavel (aluno_id,nome,telefone)
SELECT pessoa_id, CASE email WHEN 'ana.demo@example.org' THEN 'Maria Souza' ELSE 'Paulo Lima' END,
       CASE email WHEN 'ana.demo@example.org' THEN '21991111111' ELSE '21992222222' END
  FROM edumais.pessoa WHERE email IN ('ana.demo@example.org','bruno.demo@example.org')
ON CONFLICT (aluno_id) DO NOTHING;

INSERT INTO edumais.turma (nome,curso,vagas_totais,horario,educador_id)
SELECT 'Inglês Iniciante - Manhã','Inglês',20,'Segunda e quarta, 9h',pessoa_id
  FROM edumais.pessoa WHERE email='carla.demo@example.org'
ON CONFLICT (nome,horario) DO NOTHING;

SELECT edumais.matricular(p.pessoa_id,t.turma_id)
  FROM edumais.pessoa p CROSS JOIN edumais.turma t
 WHERE p.email='ana.demo@example.org' AND t.nome='Inglês Iniciante - Manhã'
   AND NOT EXISTS (SELECT 1 FROM edumais.matricula m
                    WHERE m.aluno_id=p.pessoa_id AND m.turma_id=t.turma_id AND m.status='ativa');