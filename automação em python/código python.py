import requests

# URL base da API configurada no backend Spring Boot (`ong-backend`)
BASE_URL = "http://localhost:8080/api/ong"  # Ajuste conforme o mapeamento do OngController

def cadastrar_aluno(nome, responsavel):
    """Envia os dados do aluno para serem salvos via AlunoRepository."""
    url = f"{BASE_URL}/alunos"
    payload = {
        "nome": nome,
        "responsavel": responsavel
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code in [200, 201]:
            print("Aluno cadastrado com sucesso pelo backend Spring Boot!")
            return response.json()
        else:
            print(f"Erro ao cadastrar aluno: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Erro de conexão com o backend: {e}")

def registrar_atividade(aluno_id, tipo, observacao):
    """Registra frequência ou acompanhamento pedagógico via RegistroRepository."""
    url = f"{BASE_URL}/registros"
    payload = {
        "alunoId": aluno_id,
        "tipo": tipo,  # Ex: FREQUENCIA, ACOMPANHAMENTO
        "observacao": observacao
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code in [200, 201]:
            print("Registro salvo com sucesso no banco de dados!")
            return response.json()
        else:
            print(f"Erro ao salvar registro: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Erro de conexão com o backend: {e}")

if __name__ == "__main__":
    print("Iniciando automação integrada ao backend EduMais...")
    
    # Exemplo de fluxo executado pela automação em Python:
    # 1. Cadastrar um novo aluno
    # aluno_criado = cadastrar_aluno("Lucas Souza", "Ana Souza")
    
    # 2. Se cadastrado com sucesso, registrar frequência/acompanhamento
    # if aluno_criado and "id" in aluno_criado:
    #     registrar_atividade(aluno_criado["id"], "FREQUENCIA", "Presente na aula de programação.")