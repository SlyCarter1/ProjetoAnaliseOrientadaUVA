-- OPCIONAL
-- CONTEÚDO FICTICIO PARA DEMONSTRAÇÃO
-- SENHA NÃO É UTILIZÁVEL

-- execute após 01_schema.sql . Remova em produção.


INSERT INTO edumais.pessoa(nome, email, telefone, data_nascimento, perfil, senha_hash) VALUES
('Fernanda Schmidt', 'fernanda@email.com', '229988776655', '1996-09-25', 'aluno', '1234'),
('Alan Cruz', 'af-cruz1996@hotmail.com', '21998710884', '1996-09-18', 'educador', '0932'),
('Carlos Thiago', 'carlos@email.com', '22912345678', NULL, 'educador', '4321')
ON CONFLICT (email) DO NOTHING;

INSERT INTO edumais.responsavel (aluno_id, nome, telefone)
SELECT pessoa_id,
       CASE email WHEN 'fernanda@email.com' THEN 'Helena Schmidt' ELSE 'Roberto Cruz' END,
       CASE email WHEN 'fernanda@email.com' THEN '22991111111' ELSE '22992222222' END
  FROM edumais.pessoa
 WHERE email IN ('fernanda@email.com', 'alan@email.com')
ON CONFLICT (aluno_id) DO NOTHING;

INSERT INTO edumais.turma (nome, curso, vagas_totais, horario, educador_id)
SELECT 'Inglês Iniciante - Manhã', 'Inglês', 20, 'Segunda e quarta, 9h', pessoa_id
  FROM edumais.pessoa WHERE email = 'carlos@email.com'
ON CONFLICT (nome, horario) DO NOTHING;

INSERT INTO edumais.turma (nome, curso, vagas_totais, horario, educador_id)
SELECT 'Programação Web Básica', 'Tecnologia', 2, 'Terça e quinta, 14h', pessoa_id
  FROM edumais.pessoa WHERE email = 'carlos@email.com'
ON CONFLICT (nome, horario) DO NOTHING;

SELECT edumais.matricular(p.pessoa_id, t.turma_id)
  FROM edumais.pessoa p CROSS JOIN edumais.turma t
 WHERE p.email IN ('fernanda@email.com', 'alan@email.com')
   AND t.nome = 'Programação Web Básica'
   AND NOT EXISTS (
       SELECT 1 FROM edumais.matricula m
        WHERE m.aluno_id = p.pessoa_id AND m.turma_id = t.turma_id AND m.status = 'ativa'
   );

SELECT edumais.matricular(p.pessoa_id, t.turma_id)
  FROM edumais.pessoa p CROSS JOIN edumais.turma t
 WHERE p.email = 'fernanda@email.com'
   AND t.nome = 'Inglês Iniciante - Manhã'
   AND NOT EXISTS (
       SELECT 1 FROM edumais.matricula m
        WHERE m.aluno_id = p.pessoa_id AND m.turma_id = t.turma_id AND m.status = 'ativa'
   );