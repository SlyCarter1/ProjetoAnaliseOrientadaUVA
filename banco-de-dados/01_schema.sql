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