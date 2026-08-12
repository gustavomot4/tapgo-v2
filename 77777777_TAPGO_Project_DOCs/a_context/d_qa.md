---
tags: [qa, registro]
status: atual
---
# QA.md — achados de revisão (QA-NN)

> **Saiu do [[c_decisions|DECISIONS]] em 2026-08-12 por `D-50` (`A-13`).** Motivo: os três registros
> tinham ciclo de vida diferente e um orçamento só, e era esta seção que crescia mais rápido —
> 6 dos achados estão abertos, e achado aberto não se arquiva.
> **Decisão permanente e questão do dono continuam no [[c_decisions|DECISIONS]]**; aqui fica só QA.
> **Append-only**, mesma regra de lá: achado novo = linha nova, e o ID nunca é reciclado.
> **Teto: 2 frases por linha** (colunas de prosa: "O que quebrava" e "Correção"). Evidência longa
> vira nota em `e_qa/<slug>.md` linkada aqui.
> **Orçamento: 8.000 caracteres**, aviso em 6.400, cobrado por `scripts/check.py` — medido **sem** o
> padding de alinhamento das tabelas, senão um `Ctrl+S` do editor consome orçamento sem uma palavra nova.

> Citado no commit assim: `fix: QA-NN …`. Passagens de revisão: 1. Critério e evidência: [[decisions_archive]].

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-04 | 2026-08-07 | MÉDIO | `tsconfig.json` (`D-14`) × `vite.config.ts` (T-05) | `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de tipo no build só estoura no `vite build` | Acrescentar `"vite.config.ts"` ao `include` — de outro dono, regra 4; porquê em [[questoes_abertas_notas]] | _(aberto)_ |
| QA-06 | 2026-08-07 | MÉDIO | `src/scripts/bundle-size.mjs` (M9) | Soma **toda** entrada `isEntry` no "bundle inicial": com `D-33`, o gatilho de `D-02` lê página que o jogador nunca abre | Medir só o grafo de `index.html` — não feito aqui porque é de M9 e muda um portão (regra 4) | _(aberto)_ |
| QA-08 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Anfitrião sorteava sala nova a cada toque: medição de `A-08` daria 0% | `D-38` | ✔ `T-15` 2026-08-08 (`bd68d0f`) |
| QA-07 | 2026-08-08 | BAIXO | `Q-08` e `Q-09`, no próprio registro | Prazo de decisão vencido com a questão ainda aberta: `Q-08` dizia "antes de E-3" (fechada) e `Q-09` "antes de T-10" (feita) | O dono redata o prazo ou responde a questão — `A-10` não mexe em prazo alheio (regra 6) | _(aberto)_ |
| QA-11 | 2026-08-08 | CRÍTICO | Árvore de trabalho × git | **T-13 nunca foi commitada:** `src/session/index.ts` tem 208 linhas fora do git e `src/tests/session_online.test.ts` é untracked, mas o CONTEXT lista `online` T-13 como Pronto e a suíte como 220/220 | O dono commita e empurra T-13 (`D-35`/`D-36`), ou diz por que está segurando — `origin/main` é o que o Pages publica | _(aberto)_ |
| QA-09 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Índice da rotação por aparelho dessincronizava as salas e não ressincronizava | Índice e 6 chars do ID na tela dos dois | ✔ `T-15` 2026-08-08 (`31b39d9`) |
| QA-12 | 2026-08-08 | CRÍTICO · ARQUIVADO | `src/medicao.ts` | Sortear sala nova não zerava a rotação — achado em campo | Índice separado da estatística | ✔ `T-15` 2026-08-08 |
| QA-14 | 2026-08-08 | ALTO | `src/medicao_par.ts` (`D-44`) | `host↔host` era classificado como "mesma rede local" pelo TIPO do candidato, ignorando a FAIXA do endereço: em IPv6 não há NAT e o `host` já é global, então o melhor resultado possível saía rotulado como o mais inútil (`P2P direto em 0 de 1`) | Classificar pela faixa: público × público com prefixos /64 diferentes é `host-direto`; 100.64/10 é `host-cgnat`; privado segue local | ✔ 2026-08-08 |
| QA-13 | 2026-08-08 | CRÍTICO | `src/medicao.ts` (`D-44`) | A Trystero reaproveita um pool de 20 conexões entre salas, e esvaziar a lista observada por tentativa descartava justamente a que conectava: **11 de 12 pares não lidos** em campo (o 12º era leitura boa: IPv6, ver `QA-14`) | Escolher a conexão pelo **estado vivo**, não pela janela de criação; e "par não lido" passa a dizer o que faltou | ✔ 2026-08-12 (17/17 lidos em campo) |
| QA-10 | 2026-08-08 | MÉDIO | `src/medicao.ts` (`D-33`) | Erro de configuração soma tentativa **e** falha: erro do operador entra na taxa que decide a revisão de `D-01`, enviesando para baixo | Não contar tentativa quando o canal nunca abriu — muda denominador de portão, logo `D-NN` (regra 4) | _(aberto)_ |
| QA-05 | 2026-08-07 | MÉDIO | `src/tests/teams.test.ts` | Escreve por extenso os 6 termos da lista-morta: o portão de marca de M7 (`grep` zero em `src/`) devolve 6 | Montar as agulhas em tempo de execução, como `core.test.ts` e `ui.test.ts` — outro dono (regra 4) | _(aberto)_ |
| QA-15 | 2026-08-12 | MÉDIO | `src/ui/rotas.ts` (M7) | Promete que `A` cobra primeiro; com o sorteio de `T-17` o humano pode começar defendendo e a tela mente | Tela da moeda, metade `frontend-uiux` de `T-17` | ✔ `T-17b` 2026-08-12 (3 promessas, não 1) |
| QA-16 | 2026-08-12 | MÉDIO | `src/ui/estilo.css` (M7, desde `T-10`) | `.aviso { display: flex }` é regra de autor e vence o `[hidden]` do navegador: a caixa de erro **vazia** fica visível nas 3 telas que a usam | `.aviso[hidden] { display: none }` — de outra sessão (regra 4), ver [[t17b_sorteio_na_tela]] | _(aberto)_ |
