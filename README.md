# Plataforma de Gestão de Matrículas e Captação de Doações — EduMais

Projeto acadêmico desenvolvido para a disciplina de **Análise Orientada a Objetos (AOO)**, focado na modelagem e implementação de uma solução digital para a **EduMais** — ONG que atua na educação de jovens de comunidades do Rio de Janeiro por meio de programas como ensino de inglês e criação de jogos educativos.

## Escopo do Projeto

O sistema unifica duas frentes operacionais essenciais para a rotina administrativa e de captação da instituição:

1. **Cadastro e Matrícula de Alunos:** Centralização dos dados cadastrais de estudantes e responsáveis, controle de turmas e gestão do histórico de participação.
   * *Regra de Negócio:* Uma matrícula só pode ser confirmada caso haja vaga disponível na turma selecionada.
2. **Acompanhamento de Banco de Dados com Agente:** Implementação de agente IA simples para consultas e verificações do banco de dados.
   * *Regra de Negócio:* O agente só poderá retornar informações, não realizar alterações no banco em sí, para evitar quaisquer problemas de cadastro que possam envolver a LGPD.

## Arquitetura e Stack Tecnológica

A solução foi desenhada seguindo os princípios de Orientação a Objetos, separação de responsabilidades e conformidade com a **LGPD** (proteção de dados sensíveis de menores de idade e doadores):

* **Front-end:** Aplicação Web responsiva para captação externa (formulários de inscrição e doação) e interface administrativa.
* **Automação e Ingestão (Python):** Scripts responsáveis pela captura, higienização e padronização dos dados de entrada antes do envio via API REST (JSON).
* **Back-end e Regras de Negócio (Java / Spring Boot):** Núcleo orientado a objetos que implementa o modelo de domínio (`Aluno`, `Responsavel`, `Turma`, `Matricula`, `Doador`, `Doacao`, `Campanha`), validações de negócio e controle de acesso/segurança.
* **Banco de Dados (PostgreSQL):** Persistência relacional estruturada para consultas gerenciais, integridade referencial e controle de permissões.
* **Assistente Gerencial IA (Python / LangChain / Gemini):** Microsserviço *Text-to-SQL* que permite à coordenação realizar consultas em linguagem natural sobre vagas e arrecadação, operando sob usuário *read-only* e *Views* restritas para garantir a privacidade dos dados.

## Modelagem Orientada a Objetos (Domínio)

* **Módulo Acadêmico:** `Aluno`, `Responsavel`, `Turma` e `Matricula` (entidade associativa que valida a disponibilidade de vagas).
* **Módulo de Captação:** `Doador`, `Doacao` e `Campanha` (suportando doações avulsas ou vinculadas a campanhas, bem como contribuições anônimas).

## Equipe e Papéis

| Integrante | Matrícula | Cargo | Responsabilidades |
| :--- | :---: | :--- | :--- |
| **Alan Figueiredo Cruz** | 1250200054 | **Tech Lead** | Liderança técnica e arquitetural. Responsável por orquestrar a equipe, garantir que front, back e banco se integrem corretamente e assegurar que o código final reflita a modelagem orientada a objetos. |
| **Fernando Magalhães** | 1250114561 | **Product Owner (PO)** | Gerenciamento do escopo do projeto, priorização de entregas e garantia de que o sistema atende às necessidades de negócio da ONG (cadastro de vagas e acompanhamento de campanhas). |
| **João Pedro Andrade Roque** | 1250107585 | **UX/UI Designer** | Criação de wireframes, design de telas e fluxo de navegação da plataforma web, entregando a base visual estruturada para o código. |
| **Carlos Console da Silva Gomes** | 1250213423 | **Desenvolvedor Front-end** | Implementação da interface responsiva do site, transformando o design do UX/UI em código e consumindo as APIs. |
| **Carlos Tiago Nogueira de Almeida** | 1250203372 | **Desenvolvedor Back-end (LGPD)** | Construção das APIs, aplicação das regras de negócio (validação de matrícula, confirmação de doações) e blindagem de segurança dos dados sensíveis. |
| **Fernanda Schmidt** | 1250205739 | **Infraestrutura de Banco de Dados** | Estruturação, modelagem e manutenção do banco de dados, garantindo que as consultas gerenciais rodem de forma eficiente. |
| **Davi da Cruz Santana Lima** | 1250116818 | **Automation Lead** | Desenvolvimento de scripts de captura e tratamento inicial de dados (limpeza e formatação) antes do envio ao back-end. Atua também na frente da documentação inicial. |
| **Júlia Chagas Ferreira** | 1250111948 | **Especialista AOO / Modelagem** | Tradução do sistema para diagramas UML (Casos de Uso, Classes, Sequência). Responsável pela manutenção e sincronia da documentação com o código. |
| **Eduardo Fontani** | 1250111404 | **QA (Quality Assurance)** | Criação de cenários de teste junto com a modelagem, validação do sistema contra bugs e garantia de que as regras de negócio funcionam na prática. |

---
*Nota: As demandas e regras de negócio deste projeto foram elaboradas como estudo de caso acadêmico inspirado na atuação institucional da EduMais.*
