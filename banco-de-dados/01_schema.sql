CREATE SCHEMA IF NOT EXISTS edumais;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS edumais.pessoa (
    pessoa_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(160) NOT NULL CHECK (length(trim(nome)) >= 3),
    email           varchar(254) NOT NULL UNIQUE,
    telefone        varchar(30),
    data_nascimento date CHECK (data_nascimento IS NULL OR data_nascimento <= CURRENT_DATE),
    perfil          varchar(20) NOT NULL CHECK (perfil IN ('aluno','educador','coordenador','administrador')),
    senha_hash      text NOT NULL,
    ativo           boolean NOT NULL DEFAULT true,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pessoa_email_normalizado CHECK (email = lower(trim(email)))
);

CREATE TABLE IF NOT EXISTS edumais.responsavel (
    responsavel_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id        bigint NOT NULL UNIQUE REFERENCES edumais.pessoa(pessoa_id) ON DELETE RESTRICT,
    nome            varchar(160) NOT NULL CHECK (length(trim(nome)) >= 3),
    telefone        varchar(30) NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edumais.turma (
    turma_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            varchar(140) NOT NULL,
    curso           varchar(140) NOT NULL,
    vagas_totais    integer NOT NULL CHECK (vagas_totais > 0),
    horario         varchar(100) NOT NULL,
    educador_id     bigint REFERENCES edumais.pessoa(pessoa_id) ON DELETE RESTRICT,
    ativa           boolean NOT NULL DEFAULT true,
    criada_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (nome, horario)
);

CREATE TABLE IF NOT EXISTS edumais.matricula (
    matricula_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    aluno_id        bigint NOT NULL REFERENCES edumais.pessoa(pessoa_id) ON DELETE RESTRICT,
    turma_id        bigint NOT NULL REFERENCES edumais.turma(turma_id) ON DELETE RESTRICT,
    data_matricula  date NOT NULL DEFAULT CURRENT_DATE,
    status          varchar(15) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','cancelada')),
    cancelada_em    timestamptz,
    criada_em       timestamptz NOT NULL DEFAULT now(),
    CHECK ((status = 'cancelada') = (cancelada_em IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_matricula_ativa_aluno_turma
    ON edumais.matricula (aluno_id, turma_id) WHERE status = 'ativa';
CREATE INDEX IF NOT EXISTS ix_matricula_turma_ativa
    ON edumais.matricula (turma_id) WHERE status = 'ativa';

-- Faça matrícula por esta função: bloqueio da turma impede ultrapassar vagas
-- quando duas requisições concorrentes tentam ocupar a última vaga.
CREATE OR REPLACE FUNCTION edumais.matricular(p_aluno_id bigint, p_turma_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, edumais
AS $$
DECLARE
    v_vagas integer;
    v_ocupadas integer;
    v_id bigint;
BEGIN
    SELECT vagas_totais INTO v_vagas
      FROM edumais.turma WHERE turma_id = p_turma_id AND ativa FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Turma inexistente ou inativa'; END IF;

    IF NOT EXISTS (SELECT 1 FROM edumais.pessoa
                   WHERE pessoa_id = p_aluno_id AND perfil = 'aluno' AND ativo) THEN
        RAISE EXCEPTION 'Aluno inexistente ou inativo';
    END IF;
    SELECT count(*) INTO v_ocupadas FROM edumais.matricula
      WHERE turma_id = p_turma_id AND status = 'ativa';
    IF v_ocupadas >= v_vagas THEN RAISE EXCEPTION 'Turma sem vagas disponíveis'; END IF;

    INSERT INTO edumais.matricula (aluno_id, turma_id)
      VALUES (p_aluno_id, p_turma_id) RETURNING matricula_id INTO v_id;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION edumais.cancelar_matricula(p_matricula_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, edumais
AS $$
BEGIN
    UPDATE edumais.matricula
       SET status = 'cancelada', cancelada_em = now()
     WHERE matricula_id = p_matricula_id AND status = 'ativa';
    IF NOT FOUND THEN RAISE EXCEPTION 'Matrícula ativa não encontrada'; END IF;
END;
$$;

-- Hash deve ser calculado no backend com algoritmo próprio para senhas
-- (ex.: Argon2id/bcrypt); jamais armazene senha em texto puro.
