import os
import re
import time
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

API_KEY = "COLE_SUA_CHAVE_NOVA_AQUI"

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5433")),
    "dbname": os.getenv("DB_NAME", "edumais"),
    "user": os.getenv("DB_USER", "edumais_equipe"),
    "password": os.getenv("DB_PASSWORD", "senha_equipe_local")
}

MODELOS_FALLBACK = [
    "gemini-3.1-flash-lite-preview",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemma-4-26b-a4b-it",
    "gemma-4-31b-it"
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

http_session = requests.Session()


# --- MODELOS DE REQUISIÇÃO ---

class PerguntaRequest(BaseModel):
    pergunta: str

class LoginRequest(BaseModel):
    email: str
    senha: str

class AlunoCreateRequest(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    senha: str = "edumais123"
    responsavel_nome: Optional[str] = None
    responsavel_telefone: Optional[str] = None
    turma_id: Optional[int] = None

class AlunoUpdateRequest(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None
    data_nascimento: Optional[str] = None
    ativo: bool = True
    responsavel_nome: Optional[str] = None
    responsavel_telefone: Optional[str] = None

class TurmaRequest(BaseModel):
    nome: str
    curso: str
    vagas: int
    horario: str
    educador: Optional[str] = None
    ativo: bool = True

class MatriculaRequest(BaseModel):
    aluno_id: int
    turma_id: int

class TransferenciaRequest(BaseModel):
    nova_turma_id: int

class FrequenciaItem(BaseModel):
    matricula_id: int
    presente: bool

class FrequenciaSalvarRequest(BaseModel):
    turma_id: int
    data_aula: str
    registros: list[FrequenciaItem]

class AcompanhamentoCreateRequest(BaseModel):
    aluno_id: int
    data_registro: str
    tema: str
    observacao: str

class CampanhaCreateRequest(BaseModel):
    nome: str
    meta: float
    prazo: str
    descricao: str

class CampanhaUpdateRequest(BaseModel):
    nome: str
    meta: float
    arrecadado: float
    prazo: str
    descricao: str
    status: str = "em_andamento"


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


def obter_ou_criar_educador(cur, nome_educador: Optional[str]) -> Optional[int]:
    if not nome_educador or not nome_educador.strip():
        return None

    cur.execute(
        """
        SELECT pessoa_id
          FROM edumais.pessoa
         WHERE perfil <> 'aluno'
           AND lower(trim(nome)) = lower(trim(%s))
         LIMIT 1
        """,
        (nome_educador,)
    )
    row = cur.fetchone()
    if row:
        return row["pessoa_id"]

    slug = re.sub(r"[^a-z0-9]+", ".", nome_educador.lower()).strip(".") or "educador"
    email_edu = f"{slug}.{int(time.time())}@edumais.org.br"
    cur.execute(
        """
        INSERT INTO edumais.pessoa (nome, email, perfil, senha_hash)
        VALUES (trim(%s), %s, 'educador', crypt('edumais123', gen_salt('bf')))
        RETURNING pessoa_id
        """,
        (nome_educador, email_edu)
    )
    return cur.fetchone()["pessoa_id"]


# --- STATUS E LOGIN ---

@app.get("/status")
def status_servidor():
    return {"status": "online"}

@app.post("/login")
def autenticar_usuario(req: LoginRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT pessoa_id, numero_matricula, nome, email, perfil, ativo
                  FROM edumais.pessoa
                 WHERE email = lower(trim(%s))
                   AND CASE
                         WHEN senha_hash LIKE '$2%%' THEN senha_hash = crypt(%s, senha_hash)
                         ELSE senha_hash = %s
                       END
                """,
                (req.email, req.senha, req.senha)
            )
            usuario = cur.fetchone()

        if not usuario:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
        if not usuario["ativo"]:
            raise HTTPException(status_code=403, detail="Este cadastro está inativo.")

        perfil_portal = "aluno" if usuario["perfil"] == "aluno" else "equipe"
        return {
            "pessoa_id": usuario["pessoa_id"],
            "numero_matricula": usuario["numero_matricula"],
            "nome": usuario["nome"],
            "email": usuario["email"],
            "perfil": perfil_portal,
            "cargo": usuario["perfil"]
        }
    finally:
        conn.close()


# --- CRUD DE ALUNOS ---

@app.get("/alunos")
def listar_alunos():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT p.pessoa_id,
                       p.numero_matricula,
                       p.nome,
                       p.email,
                       p.telefone,
                       p.data_nascimento,
                       p.ativo,
                       r.nome AS responsavel_nome,
                       r.telefone AS responsavel_telefone,
                       COUNT(m.matricula_id) FILTER (WHERE m.status = 'ativa')::int AS matriculas_ativas
                  FROM edumais.pessoa p
                  LEFT JOIN edumais.responsavel r ON r.aluno_id = p.pessoa_id
                  LEFT JOIN edumais.matricula m ON m.aluno_id = p.pessoa_id
                 WHERE p.perfil = 'aluno'
                 GROUP BY p.pessoa_id, r.nome, r.telefone
                 ORDER BY p.ativo DESC, p.nome ASC
                """
            )
            return cur.fetchall()
    finally:
        conn.close()

@app.post("/alunos")
def cadastrar_aluno(req: AlunoCreateRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            data_nasc = req.data_nascimento.strip() if req.data_nascimento and req.data_nascimento.strip() else None
            tel = req.telefone.strip() if req.telefone and req.telefone.strip() else None

            cur.execute(
                """
                INSERT INTO edumais.pessoa (nome, email, telefone, data_nascimento, perfil, senha_hash)
                VALUES (trim(%s), lower(trim(%s)), %s, %s, 'aluno', crypt(%s, gen_salt('bf')))
                RETURNING pessoa_id, numero_matricula, nome, email
                """,
                (req.nome, req.email, tel, data_nasc, req.senha)
            )
            novo_aluno = cur.fetchone()

            if req.responsavel_nome and req.responsavel_nome.strip():
                resp_tel = (req.responsavel_telefone or "").strip() or "Não informado"
                cur.execute(
                    """
                    INSERT INTO edumais.responsavel (aluno_id, nome, telefone)
                    VALUES (%s, trim(%s), %s)
                    """,
                    (novo_aluno["pessoa_id"], req.responsavel_nome, resp_tel)
                )

            if req.turma_id:
                cur.execute("SELECT edumais.matricular(%s, %s)", (novo_aluno["pessoa_id"], req.turma_id))

        conn.commit()
        msg = f"Aluno cadastrado com sucesso! RA gerado: {novo_aluno['numero_matricula']}."
        if req.turma_id:
            msg += " Matrícula na turma também realizada."
        return {"mensagem": msg, "aluno": novo_aluno}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Já existe um cadastro com este e-mail.")
    except psycopg2.errors.CheckViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Nome precisa ter no mínimo 3 letras e data de nascimento não pode ser futura.")
    except psycopg2.errors.RaiseException as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=e.diag.message_primary or "Não foi possível matricular na turma selecionada.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.put("/alunos/{pessoa_id}")
def atualizar_aluno(pessoa_id: int, req: AlunoUpdateRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            data_nasc = req.data_nascimento.strip() if req.data_nascimento and req.data_nascimento.strip() else None
            tel = req.telefone.strip() if req.telefone and req.telefone.strip() else None

            cur.execute(
                """
                UPDATE edumais.pessoa
                   SET nome = trim(%s),
                       email = lower(trim(%s)),
                       telefone = %s,
                       data_nascimento = %s,
                       ativo = %s,
                       atualizado_em = now()
                 WHERE pessoa_id = %s AND perfil = 'aluno'
                """,
                (req.nome, req.email, tel, data_nasc, req.ativo, pessoa_id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Aluno não encontrado.")

            if req.responsavel_nome and req.responsavel_nome.strip():
                resp_tel = (req.responsavel_telefone or "").strip() or "Não informado"
                cur.execute(
                    """
                    INSERT INTO edumais.responsavel (aluno_id, nome, telefone)
                    VALUES (%s, trim(%s), %s)
                    ON CONFLICT (aluno_id) DO UPDATE
                       SET nome = EXCLUDED.nome,
                           telefone = EXCLUDED.telefone
                    """,
                    (pessoa_id, req.responsavel_nome, resp_tel)
                )
            else:
                cur.execute("DELETE FROM edumais.responsavel WHERE aluno_id = %s", (pessoa_id,))

        conn.commit()
        return {"mensagem": "Dados do aluno atualizados com sucesso!"}
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso por outro usuário.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.delete("/alunos/{pessoa_id}")
def remover_ou_inativar_aluno(pessoa_id: int):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM edumais.matricula WHERE aluno_id = %s", (pessoa_id,))
            total_matriculas = cur.fetchone()[0]

            if total_matriculas > 0:
                cur.execute(
                    "UPDATE edumais.pessoa SET ativo = false, atualizado_em = now() WHERE pessoa_id = %s",
                    (pessoa_id,)
                )
                conn.commit()
                return {"mensagem": "Aluno possui histórico de matrículas e foi marcado como INATIVO (preservando integridade)."}

            cur.execute("DELETE FROM edumais.responsavel WHERE aluno_id = %s", (pessoa_id,))
            cur.execute("DELETE FROM edumais.pessoa WHERE pessoa_id = %s AND perfil = 'aluno'", (pessoa_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Aluno não encontrado.")

        conn.commit()
        return {"mensagem": "Aluno excluído permanentemente do banco."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- TURMAS (LISTAR, CRIAR E EDITAR) ---

@app.get("/turmas")
def listar_turmas():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM consulta.vw_consulta_gerencial ORDER BY turma ASC")
            return cur.fetchall()
    finally:
        conn.close()

@app.post("/turmas")
def criar_turma(req: TurmaRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            educador_id = obter_ou_criar_educador(cur, req.educador)

            cur.execute(
                """
                INSERT INTO edumais.turma (nome, curso, vagas_totais, horario, educador_id, ativa)
                VALUES (trim(%s), trim(%s), %s, trim(%s), %s, %s)
                RETURNING turma_id, nome
                """,
                (req.nome, req.curso, req.vagas, req.horario, educador_id, req.ativo)
            )
            nova = cur.fetchone()
        conn.commit()
        return {"mensagem": f"Turma '{nova['nome']}' cadastrada com sucesso!", "turma": nova}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.put("/turmas/{turma_id}")
def atualizar_turma(turma_id: int, req: TurmaRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT COUNT(*)::int AS ocupadas
                  FROM edumais.matricula
                 WHERE turma_id = %s AND status = 'ativa'
                """,
                (turma_id,)
            )
            ocupadas = cur.fetchone()["ocupadas"]
            if req.vagas < ocupadas:
                raise HTTPException(
                    status_code=400,
                    detail=f"Não é possível reduzir para {req.vagas} vagas: já existem {ocupadas} alunos matriculados."
                )

            educador_id = obter_ou_criar_educador(cur, req.educador)

            cur.execute(
                """
                UPDATE edumais.turma
                   SET nome = trim(%s),
                       curso = trim(%s),
                       vagas_totais = %s,
                       horario = trim(%s),
                       educador_id = %s,
                       ativa = %s
                 WHERE turma_id = %s
                """,
                (req.nome, req.curso, req.vagas, req.horario, educador_id, req.ativo, turma_id)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Turma não encontrada.")

        conn.commit()
        return {"mensagem": "Turma atualizada com sucesso!"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- MATRÍCULAS (INSERIR, TRANSFERIR E CANCELAR) ---

@app.get("/matriculas")
def listar_matriculas():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM consulta.vw_matriculas_equipe
                 ORDER BY (status = 'ativa') DESC, matricula_id DESC
                """
            )
            return cur.fetchall()
    finally:
        conn.close()

@app.post("/matriculas")
def realizar_matricula(req: MatriculaRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT edumais.matricular(%s, %s)", (req.aluno_id, req.turma_id))
            matricula_id = cur.fetchone()[0]
        conn.commit()
        return {"mensagem": "Matrícula realizada com sucesso!", "matricula_id": matricula_id}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Este aluno já possui matrícula ativa nessa turma.")
    except psycopg2.errors.RaiseException as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=e.diag.message_primary or "Não foi possível matricular.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/matriculas/{matricula_id}/transferir")
def transferir_matricula(matricula_id: int, req: TransferenciaRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT aluno_id, turma_id, status FROM edumais.matricula WHERE matricula_id = %s",
                (matricula_id,)
            )
            atual = cur.fetchone()
            if not atual or atual["status"] != "ativa":
                raise HTTPException(status_code=404, detail="Matrícula ativa não encontrada.")
            if atual["turma_id"] == req.nova_turma_id:
                raise HTTPException(status_code=400, detail="O aluno já está matriculado nesta turma.")

            cur.execute("SELECT edumais.cancelar_matricula(%s)", (matricula_id,))
            cur.execute("SELECT edumais.matricular(%s, %s)", (atual["aluno_id"], req.nova_turma_id))
            nova_id = cur.fetchone()["matricular"]

        conn.commit()
        return {"mensagem": "Aluno transferido de turma com sucesso!", "nova_matricula_id": nova_id}
    except HTTPException:
        conn.rollback()
        raise
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Este aluno já está matriculado na turma de destino.")
    except psycopg2.errors.RaiseException as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=e.diag.message_primary or "Turma de destino sem vagas.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/matriculas/{matricula_id}/cancelar")
def cancelar_matricula(matricula_id: int):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT edumais.cancelar_matricula(%s)", (matricula_id,))
        conn.commit()
        return {"mensagem": "Matrícula cancelada e vaga liberada!"}
    except psycopg2.errors.RaiseException as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=e.diag.message_primary or "Matrícula ativa não encontrada.")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- CONTROLE DE FREQUÊNCIA ---

@app.get("/frequencias")
def consultar_chamada(turma_id: int, data_aula: str):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT m.matricula_id,
                       p.pessoa_id AS aluno_id,
                       p.numero_matricula,
                       p.nome,
                       p.email,
                       f.presente
                  FROM edumais.matricula m
                  JOIN edumais.pessoa p ON p.pessoa_id = m.aluno_id
                  LEFT JOIN edumais.frequencia f
                    ON f.matricula_id = m.matricula_id
                   AND f.data_aula = %s
                 WHERE m.turma_id = %s
                   AND m.status = 'ativa'
                 ORDER BY p.nome ASC
                """,
                (data_aula, turma_id)
            )
            return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.post("/frequencias")
def salvar_chamada(req: FrequenciaSalvarRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for item in req.registros:
                cur.execute(
                    """
                    INSERT INTO edumais.frequencia (matricula_id, data_aula, presente, registrado_em)
                    VALUES (%s, %s, %s, now())
                    ON CONFLICT (matricula_id, data_aula) DO UPDATE
                       SET presente = EXCLUDED.presente,
                           registrado_em = now()
                    """,
                    (item.matricula_id, req.data_aula, item.presente)
                )
        conn.commit()
        return {"mensagem": f"Frequência salva com sucesso ({len(req.registros)} aluno(s) registrado(s))!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.get("/frequencias/consulta")
def consultar_historico_presenca(
    turma_id: Optional[int] = None,
    aluno_id: Optional[int] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None
):
    conn = get_conn()
    try:
        filtros = []
        params = []

        if turma_id:
            filtros.append("turma_id = %s")
            params.append(turma_id)
        if aluno_id:
            filtros.append("aluno_id = %s")
            params.append(aluno_id)
        if data_inicio:
            filtros.append("data_aula >= %s")
            params.append(data_inicio)
        if data_fim:
            filtros.append("data_aula <= %s")
            params.append(data_fim)

        where_sql = ("WHERE " + " AND ".join(filtros)) if filtros else ""

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT frequencia_id,
                       data_aula,
                       presente,
                       observacao,
                       matricula_id,
                       aluno_id,
                       numero_matricula,
                       aluno,
                       email_aluno,
                       turma_id,
                       turma,
                       curso
                  FROM consulta.vw_frequencia_equipe
                  {where_sql}
                 ORDER BY data_aula DESC, aluno ASC
                """,
                params
            )
            return cur.fetchall()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- ACOMPANHAMENTO ACADÊMICO ---

@app.get("/acompanhamentos")
def listar_acompanhamentos():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM consulta.vw_acompanhamento_equipe
                 ORDER BY acompanhamento_id DESC
                """
            )
            return cur.fetchall()
    finally:
        conn.close()

@app.post("/acompanhamentos")
def criar_acompanhamento(req: AcompanhamentoCreateRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO edumais.acompanhamento (aluno_id, data_registro, tema, observacao)
                VALUES (%s, %s, trim(%s), trim(%s))
                RETURNING acompanhamento_id
                """,
                (req.aluno_id, req.data_registro, req.tema, req.observacao)
            )
            novo_id = cur.fetchone()["acompanhamento_id"]
        conn.commit()
        return {"mensagem": "Registro salvo com sucesso!", "acompanhamento_id": novo_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- CAMPANHAS E ARRECADAÇÕES ---

@app.get("/campanhas")
def listar_campanhas():
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT campanha_id, nome, meta, arrecadado, prazo, descricao, status, criada_em
                  FROM edumais.campanha
                 ORDER BY campanha_id DESC
                """
            )
            return cur.fetchall()
    finally:
        conn.close()

@app.post("/campanhas")
def criar_campanha(req: CampanhaCreateRequest):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO edumais.campanha (nome, meta, prazo, descricao)
                VALUES (trim(%s), %s, %s, trim(%s))
                RETURNING campanha_id, nome
                """,
                (req.nome, req.meta, req.prazo, req.descricao)
            )
            nova = cur.fetchone()
        conn.commit()
        return {"mensagem": "Campanha cadastrada com sucesso!", "campanha": nova}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()

@app.put("/campanhas/{campanha_id}")
def atualizar_campanha(campanha_id: int, req: CampanhaUpdateRequest):
    if req.meta <= 0:
        raise HTTPException(status_code=400, detail="A meta precisa ser maior que zero.")
    if req.arrecadado < 0:
        raise HTTPException(status_code=400, detail="O valor arrecadado não pode ser negativo.")
    if req.status not in ("em_andamento", "encerrada"):
        raise HTTPException(status_code=400, detail="Status inválido.")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE edumais.campanha
                   SET nome = trim(%s),
                       meta = %s,
                       arrecadado = %s,
                       prazo = %s,
                       descricao = trim(%s),
                       status = %s
                 WHERE campanha_id = %s
                RETURNING campanha_id, nome, meta, arrecadado, prazo, descricao, status
                """,
                (req.nome, req.meta, req.arrecadado, req.prazo, req.descricao, req.status, campanha_id)
            )
            atualizada = cur.fetchone()
            if not atualizada:
                raise HTTPException(status_code=404, detail="Campanha não encontrada.")
        conn.commit()
        return {"mensagem": "Campanha atualizada com sucesso!", "campanha": atualizada}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


# --- AGENTE GERENCIAL TEXT-TO-SQL ---

def perguntar_gemini(prompt: str) -> tuple[str, str]:
    ultimo_erro = ""

    for modelo in MODELOS_FALLBACK:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0}
        }

        try:
            res = http_session.post(url, json=payload, timeout=(4, 20))

            if res.status_code in [429, 503]:
                print(f"Modelo {modelo} ocupado ({res.status_code}). Pulando...")
                time.sleep(1.2)
                continue

            res.raise_for_status()
            partes = res.json()["candidates"][0]["content"]["parts"]
            textos_finais = [p["text"] for p in partes if "text" in p and not p.get("thought", False)]

            print(f"Respondido por: {modelo}")
            return textos_finais[-1].strip(), modelo

        except requests.exceptions.HTTPError as e:
            print(f"Erro HTTP {e.response.status_code} no {modelo}: {e.response.text}")
            ultimo_erro = e.response.text
            continue
        except Exception as e:
            print(f"Falha no {modelo}: {e}")
            ultimo_erro = str(e)
            continue

    raise Exception(f"Todos os modelos falharam. Último detalhe: {ultimo_erro}")

def formatar_resposta_local(colunas: list[str], linhas: list[tuple]) -> str:
    if not linhas:
        return "Não encontrei nenhum registro no banco de dados para essa consulta."
    if len(linhas) == 1 and len(colunas) == 1:
        return f"**{colunas[0]}:** {linhas[0][0]}"

    itens = []
    for linha in linhas:
        campos = [f"**{col}:** {val}" for col, val in zip(colunas, linha)]
        itens.append("• " + " | ".join(campos))
    return "Aqui está o resultado da consulta:\n\n" + "\n".join(itens)

@app.post("/consultar")
def consultar_banco(req: PerguntaRequest):
    schema_info = """
    1. View consulta.vw_consulta_gerencial (resumo de turmas, educadores e vagas):
       - turma_id (BIGINT)
       - turma (VARCHAR): Nome da turma
       - curso (VARCHAR): Nome do curso
       - educador (VARCHAR): Nome do educador responsável
       - horario (VARCHAR): Dias e horários
       - vagas_totais (INTEGER)
       - alunos_matriculados (INTEGER)
       - vagas_disponiveis (INTEGER)
       - ativo (BOOLEAN)

    2. View consulta.vw_matriculas_equipe (matrículas detalhadas, RA do aluno e status):
       - matricula_id (BIGINT)
       - aluno_id (BIGINT)
       - numero_matricula (VARCHAR): RA / número de matrícula institucional do aluno (ex: 20260001)
       - aluno (VARCHAR): Nome do aluno
       - email_aluno (VARCHAR): E-mail do aluno
       - turma_id (BIGINT)
       - turma (VARCHAR): Nome da turma
       - curso (VARCHAR): Nome do curso
       - horario (VARCHAR)
       - data_matricula (DATE)
       - status (VARCHAR): 'ativa' ou 'cancelada'

    3. View consulta.vw_frequencia_equipe (presenças e faltas por aula):
       - frequencia_id (BIGINT)
       - data_aula (DATE)
       - presente (BOOLEAN)
       - aluno_id (BIGINT)
       - numero_matricula (VARCHAR)
       - aluno (VARCHAR)
       - turma (VARCHAR)
       - curso (VARCHAR)

    4. View consulta.vw_acompanhamento_equipe (observações acadêmicas por aluno):
       - acompanhamento_id (BIGINT)
       - data_registro (DATE)
       - tema (VARCHAR)
       - observacao (VARCHAR)
       - aluno_id (BIGINT)
       - numero_matricula (VARCHAR)
       - aluno (VARCHAR)

    5. Tabela edumais.campanha (campanhas, metas e status):
       - campanha_id (BIGINT)
       - nome (VARCHAR)
       - meta (NUMERIC)
       - arrecadado (NUMERIC)
       - prazo (DATE)
       - descricao (VARCHAR)
       - status (VARCHAR): 'em_andamento' ou 'encerrada'
    """

    prompt_sql = (
        f"Com base nesta estrutura PostgreSQL:\n{schema_info}\n"
        f"Escreva APENAS a consulta SQL para responder à pergunta: '{req.pergunta}'. "
        "Escolha a view/tabela mais adequada para o assunto da pergunta. "
        "Sempre dê apelidos claros em português usando AS \"Nome Legível\". "
        "Retorne apenas o comando SQL puro, sem markdown e sem explicações."
    )

    try:
        sql_gerado, modelo_ativo = perguntar_gemini(prompt_sql)
        sql_gerado = sql_gerado.replace("```sql", "").replace("```", "").replace("`", "").strip()
        print(f"SQL Executado: {sql_gerado}")

        conn = get_conn()
        conn.autocommit = True
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql_gerado)
                if cursor.description:
                    colunas = [desc[0] for desc in cursor.description]
                    resultados = cursor.fetchall()
                    resposta_final = formatar_resposta_local(colunas, resultados)
                else:
                    resposta_final = "Comando executado com sucesso no banco."
        finally:
            conn.close()

        return {
            "resposta": resposta_final,
            "sql_executado": sql_gerado,
            "modelo_usado": modelo_ativo
        }

    except Exception as e:
        print(f"Erro na consulta: {e}")
        return {"erro": "Falha na consulta.", "detalhes": str(e)}