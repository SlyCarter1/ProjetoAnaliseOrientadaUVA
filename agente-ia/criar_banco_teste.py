import sqlite3

# Cria um arquivo de banco local chamado teste_edumais.db
conexao = sqlite3.connect("teste_edumais.db")
cursor = conexao.cursor()

# Cria a mesma View segura que vamos usar no PostgreSQL
cursor.execute("DROP TABLE IF EXISTS vw_consulta_gerencial")
cursor.execute("""
CREATE TABLE vw_consulta_gerencial (
    turma TEXT,
    vagas_totais INTEGER,
    alunos_matriculados INTEGER
)
""")

# Coloca alguns dados fictícios da EduMais para você testar
dados_teste = [
    ("Inglês Iniciante - Manhã", 20, 15),
    ("Criação de Jogos Educativos", 15, 15),
    ("Programação Web Básica", 25, 18),
    ("Inglês Intermediário - Tarde", 20, 12)
]

cursor.executemany("INSERT INTO vw_consulta_gerencial VALUES (?, ?, ?)", dados_teste)
conexao.commit()
conexao.close()

print("Banco de teste criado com sucesso!")