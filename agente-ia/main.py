import time
import sqlite3
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

API_KEY = "insert API here at demonstration"

# Lista de modelos por ordem de prioridade (se o primeiro der demanda alta ou cota, pula pro próximo)
MODELOS_FALLBACK = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
]

app = FastAPI()

# Libera o Front-end para fazer requisições
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PerguntaRequest(BaseModel):
    pergunta: str

def perguntar_gemini(prompt: str) -> str:
    ultimo_erro = ""
    
    for modelo in MODELOS_FALLBACK:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0,
                "thinkingConfig": {"thinkingBudget": 0}
            }
        }
        
        try:
            res = requests.post(url, json=payload, timeout=30)
            
            # Se der demanda alta (503) ou limite de cota (429), avisa no terminal e tenta o próximo modelo
            if res.status_code in [429, 503]:
                print(f"Modelo {modelo} ocupado ({res.status_code}). Tentando modelo reserva...")
                time.sleep(1)
                continue
                
            res.raise_for_status()
            return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            
        except requests.exceptions.HTTPError as e:
            ultimo_erro = e.response.text
            continue
        except Exception as e:
            ultimo_erro = str(e)
            continue
            
    raise Exception(f"Todos os modelos falharam. Último detalhe: {ultimo_erro}")

@app.post("/consultar")
def consultar_banco(req: PerguntaRequest):
    schema_info = """
    Tabela: vw_consulta_gerencial
    Colunas:
    - turma (TEXT): Nome da turma
    - vagas_totais (INTEGER): Total de vagas da turma
    - alunos_matriculados (INTEGER): Quantidade de alunos já matriculados
    """
    
    prompt_sql = (
        f"Com base nesta estrutura de banco SQLite:\n{schema_info}\n"
        f"Escreva APENAS a consulta SQL (SELECT) para responder à pergunta: '{req.pergunta}'. "
        "Não use blocos de markdown (```sql), não explique nada, retorne só o comando SQL puro."
    )
    
    try:
        # 1. Gera o SQL via REST puro com fallback automático
        sql_gerado = perguntar_gemini(prompt_sql)
        sql_gerado = sql_gerado.replace("```sql", "").replace("```", "").strip()
        print(f"SQL Gerado: {sql_gerado}")

        # 2. Executa no banco de teste
        conn = sqlite3.connect("teste_edumais.db")
        cursor = conn.cursor()
        cursor.execute(sql_gerado)
        resultados = cursor.fetchall()
        conn.close()

        # 3. Formata a resposta final em português
        prompt_resposta = (
            f"Pergunta do gerente da ONG EduMais: '{req.pergunta}'\n"
            f"Resultado bruto do banco de dados: {resultados}\n"
            "Responda à pergunta em português de forma clara, direta e amigável."
        )
        resposta_final = perguntar_gemini(prompt_resposta)
        
        return {"resposta": resposta_final, "sql_executado": sql_gerado}
        
    except Exception as e:
        print(f"Erro na consulta: {e}")
        return {"erro": "Falha na consulta.", "detalhes": str(e)}