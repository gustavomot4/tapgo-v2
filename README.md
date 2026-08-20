---
tags: [readme, guia]
status: atual
tipo: guia
data: 2026-08-19
---
# TAP GO v2

Jogo web de disputa de pênaltis, mobile-first, jogável em qualquer navegador sem instalar nada.
Uma partida leva cerca de um minuto: 5 cobranças alternadas, contra a CPU ou contra alguém no
mesmo aparelho, e um torneio de 32 seleções (a **TAP GO Cup**) que sobrevive a fechar o navegador.
Tudo por toque, desenhado para uma tela de 360x640.

**Não-objetivo:** não é simulador de futebol — sem partida completa, sem elenco, sem transferências.
E nenhuma marca de terceiro: as seleções são nome de país e bandeira, nada mais.

**Estado:** v2.0.0, entregue em 2026-08-19. O modo **online por link de convite não está publicado**
— o transporte P2P existe e foi medido em rede móvel real (17/17, limite inferior 95% de 83,8%), mas
a tela de convite não foi construída. Está declarado, não esquecido.

**Stack:** TypeScript · Vite · Phaser 3 · Trystero (P2P) · GitHub Pages — build 100% estático,
sem backend, sem conta, sem dado pessoal coletado.

**Joga aqui:** https://gustavomot4.github.io/tapgo-v2/

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

Pré-requisito: Node 20+.

```
npm install
npx vite
```

O jogo abre em `http://localhost:5173/tapgo-v2/`. O subcaminho não é enfeite: é o mesmo `base` que
o GitHub Pages usa, e rodar sem ele esconde os 404 que só apareceriam em produção.

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `python 77777777_TAPGO_Project_DOCs/scripts/check.py` | portão de higiene (roda sozinho em todo commit) |
| `npx vite` | servidor de desenvolvimento (não há script `dev` no `package.json`) |
| `npm run build` | build de produção em `dist/` — imprime o peso do bundle no fim (`bundle-size.mjs`), e é esse número que o portão de 8 MB cobra |
| `npm test` | suíte Vitest (motor de regras, torneio e determinismo) |
| `npm run typecheck` | checagem de tipos (`tsc --noEmit`) |

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
