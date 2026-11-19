# Banco PostgreSQL do EduMais

Material preparado a partir do escopo e do protótipo existente em `agente-ia`e `edumais-connect`. O projeto atual ainda usa LocalStorage no front-end e SQLite no agente; esses scripts estruturam a migração do modelo para PostgreSQL.

## Arquivos

1. `01_schema.sql`: tabelas, integridade, índices, e funções transacionais para matrícula/cancelamento.
2. `views_permissoes.sql`: views de consulta e permissões para aplicação, equipe, e agente de IA.
3. `03_dados_demo.sql`: dados fictícios opcionais para demonstração (**não usar em produção**).

## Modelo

- `pessoa`: identidade de aluno/equipe, contato, e hash de senha; email único.
- `responsavel`: dados do responsável vinculados ao aluno.
- `turma`: curso, horário, educador e capacidade.
- `matricula`: vínculo aluno-tumra com status e trilha de cancelamento.
- `consulta.vw_consulta_gerencial`: turma e contagens agregadas, sem nome, email, ou dados de responsáveis. Adequada ao agente Text-to-SQL.
- `consulta.vw_matriculas_equipe`: dados identificáveis para equipe, não concedida ao agente.

## Instalação

Crie o banco PostgreSQL e os roles com um administrador. Crie `edumais_app`, `edumais_ia`, e `edumais_equipe` como roles de login no ambiente; defina credenciais fora dos arquivos SQL. Depois execute `01_schema.sql`, `02_views_permissoes.sql` e, se necessário, `03_dados_demo.sql`, **nessa ordem**.

O script de permissões pressupõe que os três roles já existem. O role proprietário deve ser usado somente para implementação/manutenção; nunca pela aplicação ou pelo agente.

## Regra de vagas

O backend deve chamar `SELECT edumais.matricular(<id_aluno>, <id_turma>);`. A função bloqueia a linha da turma durante a operação e rejeita aluno inativo, turma inativa, duplicidade ou falta de vagas. Para cancelar, a equipe autorizada chama `SELECT edumais.cancelar_matricula(<id_matricula>);`. Não conte matrículas canceladas como ocupadas.

## Segurança e integração

- Conecte o agente com `edumais_ia`; ele só recebe `SELECT`sobre a view agregada.
- Conecte o painel/equipe com credencial própria e conceda acessp à view de equipe apenas aos usuários autorizados.
- A senha de cada usuário deve ser armazenada como hash forte produzido pelo backend(Argon2id ou bcrypt), nunca em texto puro.
- O backend deve validar autenticação e autorização antes de chamar operações. A role da aplicação não deve ser compartilhado com o agente.
- Para maior isolamento no deploy, execute o agente em transação somente leitura (`SET default_transaction_read_only = on`) e imponha limite de tempo/linhas no serviço.
- A view gerencial minimiza exposição, mas não usbstitui controles legais, gestão de consentimento, retenção, e segurança operacional exigidos para dados de menores.

## Observação de compatibilidade

O `main.py` atual importa `sqlite3` e abre `teste_edumais.db`. A integração PostgreSQL exige substituir esse acesso por um driver PostgreSQL e usar apenas `consulta.vw_consulta_gerencial`; também é necessário validar que a instrução recebida é um único `SELECT`permitido. A migração do front-end LocalStorage para uma API fica no backend Java/Spring previsto no README do projeto.