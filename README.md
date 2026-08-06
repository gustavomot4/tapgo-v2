---
tags: [readme, guia]
status: atual
tipo: guia
data: 2026-08-06
---
# TAP GO v2

<O que o sistema faz, para quem, em um parágrafo. Um não-objetivo explícito.>

**Stack:** <linguagem · framework · banco · runtime>

A verdade viva do projeto mora em `77777777_TAPGO_Project_DOCs/a_context/a_context_source.md` —
este README é a porta de entrada, não a fonte do estado.

---

## Como este projeto é feito

Pipeline de agentes de IA com portão objetivo em cada fase. O caminho completo está em
`77777777_TAPGO_Project_DOCs/b_process/a_roadmap.md`; os agentes, em `77777777_TAPGO_Project_DOCs/b_process/skills/`.

O ciclo de **toda** sessão:

> uma skill + o contexto-fonte + só o arquivo do momento → pedir **delta** → passar no
> **portão** (`77777777_TAPGO_Project_DOCs/b_process/b_checklist.md`) → registrar **D-NN/QA-NN** →
> atualizar o contexto **por substituição** → datar no changelog → commit citando os IDs.

## Como rodar

```
<comandos, do zero, copiáveis — incluindo os pré-requisitos>
```

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `python 77777777_TAPGO_Project_DOCs/scripts/check.py` | portão de higiene (roda sozinho em todo commit) |
| `<comando do projeto>` | <o que faz> |

## Estrutura do projeto

```
tapgo-v2/
├── 77777777_TAPGO_Project_DOCs/   ← TODA a documentação
│   ├── INDEX.md              mapa de navegação
│   ├── a_context/            a verdade: contexto-fonte, plano, decisões
│   ├── b_process/            como se trabalha: roteiro, checklist, backlog, skills
│   ├── c_technical_docs/     runbook e guias de operação
│   ├── d_history/            changelog datado (ninguém carrega; só escreve)
│   ├── e_qa/                 relatórios de QA, com timestamp no nome
│   └── scripts/              check.py · install_hook.py
├── src/   ← TODO o código
├── CLAUDE.md                 contrato de leitura do agente
├── .gitattributes            fim de linha LF
├── .gitignore
└── README.md                 este arquivo
```

Regra de ouro: **documentação em `77777777_TAPGO_Project_DOCs/`, código em `src/`.**
A raiz só tem o README, o CLAUDE.md e a configuração do repositório.

## Convenções

- Nomes de arquivo de doc: `prefixo_de_ordem` + `snake_case` em inglês, sem acento.
  O prefixo é a **ordem de leitura** da pasta. Saída de IA datada leva `_AAMMDD_HHMM`.
- **Uma verdade por assunto:** estado só no contexto-fonte; histórico só no changelog;
  decisão só em `c_decisions.md`. Nenhum doc repete o que outro diz — aponta.
- Todo `.md` de doc começa com YAML: `status` e `data` obrigatórios.
- Commit: `TIPO: o que mudou (por quê)`. Bug cita `QA-NN`, decisão cita `D-NN`.
- O padrão completo está em `77777777_TAPGO_Project_DOCs/b_process/e_repository_standard.md`.
