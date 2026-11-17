# Plataforma de Gestão de Matrículas e Consultas Inteligentes — EduMais

Projeto acadêmico desenvolvido para a disciplina de **Análise Orientada a Objetos (AOO)**, focado na modelagem e implementação de uma solução digital para a **EduMais** — ONG que atua na educação de jovens de comunidades do Rio de Janeiro por meio de programas como ensino de inglês e criação de jogos educativos[cite: 1].

## Escopo do Projeto

O sistema centraliza a captação de dados estudantis e oferece uma interface inteligente para análise administrativa da coordenação:

1. **Cadastro e Matrícula de Alunos:** Centralização dos dados cadastrais de estudantes e responsáveis, controle de turmas e gestão do histórico de participação[cite: 1].
   * *Regra de Negócio:* Uma matrícula só pode ser confirmada caso haja vaga disponível na turma selecionada[cite: 1].
2. **Consultas Gerenciais via Agente de IA:** Interface conversacional (*Text-to-SQL*) que permite aos gestores e coordenadores consultar informações sobre alunos, turmas e disponibilidade de vagas utilizando linguagem natural, sem necessidade de conhecimento técnico em banco de dados.

## Arquitetura e Stack Tecnológica

A solução foi desenhada seguindo os princípios de Orientação a Objetos, separação de responsabilidades e conformidade com a **LGPD** (proteção de dados sensíveis de menores de idade e responsáveis):

* **Front-end:** Aplicação Web responsiva para captação externa (formulários de inscrição) e painel administrativo com chat integrado para consultas gerenciais.
* **Automação e Ingestão (Python):** Scripts responsáveis pela captura, higienização e padronização dos dados de entrada antes do envio via API REST (JSON).
* **Back-end e Regras de Negócio (Java / Spring Boot):** Núcleo orientado a objetos que implementa o modelo de domínio (`Aluno`, `Responsavel`, `Turma`, `Matricula`), validações de negócio e controle de acesso/segurança[cite: 1].
* **Banco de Dados (PostgreSQL):** Persistência relacional estruturada para integridade referencial, controle de permissões e criação de *Views* gerenciais.
* **Agente de Consultas IA (Python / FastAPI / LangChain / Gemini):** Microsserviço *Text-to-SQL* que traduz perguntas em português para consultas SQL em tempo real, operando sob usuário *read-only* e *Views* restritas para garantir a privacidade dos dados.

## Modelagem Orientada a Objetos (Domínio)

* **Módulo Acadêmico:** `Aluno`, `Responsavel`, `Turma` e `Matricula` (entidade associativa que vincula o estudante à turma e valida a disponibilidade de vagas)[cite: 1].

## Equipe e Papéis

| Integrante | Matrícula | Cargo | Responsabilidades |
| :--- | :---: | :--- | :--- |
| **Alan Figueiredo Cruz** | 1250200054 | **Tech Lead** | Liderança técnica, arquitetural e desenvolvimento do Agente de IA. Responsável por orquestrar a equipe, integrar front, back e banco, e assegurar que o código reflita a modelagem orientada a objetos. |
| **Fernando Magalhães** | 1250114561 | **Product Owner (PO)** | Gerenciamento do escopo do projeto, priorização de entregas e garantia de que o sistema atende às necessidades de negócio da ONG (gestão de cadastros, vagas e consultas). |
| **João Pedro Andrade Roque** | 1250107585 | **UX/UI Designer** | Criação de wireframes, design de telas e fluxo de navegação da plataforma web e da interface de chat do agente, entregando a base visual estruturada para o código. |
| **Carlos Console da Silva Gomes** | 1250213423 | **Desenvolvedor Front-end** | Implementação da interface responsiva do site, transformando o design do UX/UI em código e consumindo as APIs do back-end e do agente de consultas. |
| **Carlos Tiago Nogueira de Almeida** | 1250203372 | **Desenvolvedor Back-end (LGPD)** | Construção das APIs, aplicação das regras de negócio (validação de matrícula e vagas) e blindagem de segurança dos dados sensíveis. |
| **Fernanda Schmidt** | 1250205739 | **Infraestrutura de Banco de Dados** | Estruturação, modelagem e manutenção do banco PostgreSQL, incluindo a criação de *Views* seguras e controle de permissões para consultas. |
| **Davi da Cruz Santana Lima** | 1250116818 | **Automation Lead** | Desenvolvimento de scripts de captura e tratamento inicial de dados (limpeza e formatação) antes do envio ao back-end. Atua também na frente da documentação inicial. |
| **Júlia Chagas Ferreira** | 1250111948 | **Especialista AOO / Modelagem** | Tradução do sistema para diagramas UML (Casos de Uso, Classes, Sequência). Responsável pela manutenção e sincronia da documentação com o código. |
| **Eduardo Fontani** | 1250111404 | **QA (Quality Assurance)** | Criação de cenários de teste junto com a modelagem, validação do sistema contra bugs e garantia de que as regras de negócio funcionam na prática. |

---
*Nota: As demandas e regras de negócio deste projeto foram elaboradas como estudo de caso acadêmico inspirado na atuação institucional da EduMais[cite: 1].*
