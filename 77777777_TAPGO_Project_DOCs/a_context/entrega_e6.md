---
tags: [contexto, tema, entrega]
status: atual
tipo: contexto
data: 2026-08-19
---
# Entrega E-6 — cada item do portão e a sua prova

> Escrito ao fechar E-6 em 2026-08-19. Mora aqui, e não no [[a_context_source|CONTEXT]], porque o
> orçamento de 4.000 caracteres de lá não comporta doze linhas de comprovante — o CONTEXT diz
> **que** E-6 fechou; **por que** ela pôde fechar está neste arquivo.
>
> **Nenhum número vivo mora aqui.** Bundle, contagem da suíte e versão são do CONTEXT; abaixo eles
> aparecem como o valor **lido no dia da entrega**, que é registro histórico e não fonte.

## O portão de E-6 ([[b_plan|PLANO]]) — 3 itens

| Item | Prova |
|---|---|
| Todo o Critério de aceite verde | os 6 de [[portao_de_aceite]], um a um, na tabela abaixo |
| Tabela de custo de [[stack]] sem linha em branco | 6 linhas preenchidas, camada e "pede cartão?" em todas; a última lacuna era o STUN, fechada por `D-71` |
| `python scripts/check.py --historico-completo` verde | rodado em 2026-08-19: orçamento, fonte única, WIP, skills, links, gitignore, IDs, sincronia de estado e **segredos na árvore + histórico completo** — dois avisos de orçamento, nenhum erro |

## Os 6 critérios de [[portao_de_aceite]]

| Critério | Verde por | Prova |
|---|---|---|
| `npx tsc --noEmit && npm run build` | dono | **rodados pelo dono em 2026-08-19, os dois limpos** — `tsc --noEmit` sem uma linha de saída, `vite build` com 93 módulos transformados e nenhum erro. **Com a ressalva já escrita:** `QA-04` segue aberto — o `include` do `tsconfig.json` não alcança o `vite.config.ts`, então este critério passa verde sobre um arquivo que ele não leu |
| Bundle inicial < 8 MB, lido da saída | agente + dono | **408.094 B = 5,10%** do teto, impresso pelo `bundle-size.mjs` na saída do build do dono em 2026-08-19 — lido, nunca estimado. O `dist/` inteiro dá 1.692.813 B, e a diferença é o que carrega depois: o chunk `cena` (Phaser) sozinho é 1.215.740 B. 278.646 B são os 32 SVGs de `T-19`; Phaser e Trystero ficam fora do inicial por `import()` (`D-27`). **Ressalva:** `QA-06` — a medição soma toda entrada `isEntry`, inclusive `medicao.html`, que o jogador nunca abre; o número real do jogador é menor, nunca maior |
| Disputa completa termina certa e roda 2x igual | agente + **dono** | suíte **531/531 em 12 arquivos**, rodada pelo dono em 2026-08-19 (4,29 s), com o determinismo rodando a linha do tempo duas vezes e comparando; o torneio inteiro conta 64 disputas em 6 sementes, e restaurar no meio chega à **mesma** linha do tempo (`D-57`) |
| Varredura de `assets/`: nada sem origem | agente | os 32 SVGs reconferidos **arquivo a arquivo por SHA-256 e bytes** contra [[licenciamento]] em `A-17`; os 32 batem, a soma dá os 278.646 B, e o texto MIT com o aviso de copyright está em `src/assets/flags/LICENSE.txt` |
| Fluxo crítico por toque em 360x640 | **dono** | `A-14` (painel do sorteio em `cpu`/`local`) e `A-17` (TAP GO Cup do menu ao campeão, só por toque, sem rolagem horizontal). `A-18` repetiu pela **página publicada**, que é onde o `base` `/tapgo-v2/` pode quebrar sem quebrar no `dev` |
| Online: taxa medida em rede real, fallback declarado | **dono** | `A-08`, 4ª ida (2026-08-12): contador `IPv4/com NAT`, sem TURN, APN forçado nos dois aparelhos — **17/17**, mediana 266 ms, **limite inferior 95% de 83,8%** contra o corte de 70% (`D-42`). Fallback declarado: TURN fora de escopo (`D-47`), erro honesto em 20 s, e até ~16% pode não conectar |

## O que a entrega NÃO inclui, e está declarado

- **A tela de convite não existe no build no ar** (`D-72`). O transporte de M6 está pronto e medido; o
  que falta é a tela, travada por `Q-11` — cujas duas saídas mexem em porta congelada de M5 (`D-13`).
  O Objetivo do CONTEXT foi corrigido para não prometer o que o build não faz.
- **A taxa de 83,8% é de UM enlace**, não de N. Com 4 jogadores a chance de todos conectarem cai
  para ~29% — a conta está em [[online_p2p]], e é ela que dimensiona qualquer modo com mais de dois.
- **`QA-04` e `QA-06`** ficam abertos sob os dois critérios acima, e estão escritos lá em vez de
  fechados de carona: nenhum dos dois é crítico, e conserto de carona é o defeito que esta fase evita.

## `D-72` — por que E-6 entregou sem a tela de convite

Íntegra da evidência de `D-72`, movida do registro pelo corte de [[registro_no_teto]] §5.1.

O critério de aceite do online é a **medição**, e ela **passou**: `A-08` deu **17/17**, limite
inferior 95% de **83,8%** contra o corte de **70%** (`D-47`). O que faltava não era qualidade — era
uma tela.

E a tela não era barata: as duas saídas de `Q-11` mexem em **porta congelada de M5** (`D-13`), logo
exigem decisão do dono e sessão de código. Segurar a entrega inteira por isso pararia CPU, 2P local
e o torneio, que estavam prontos e conferidos no aparelho.

O que **não** era aceitável era entregar em silêncio: objetivo que promete o que o build no ar não
faz é **achado de entrega**, não detalhe. Por isso o Objetivo do CONTEXT deixou de prometer "por
link de convite", e a promessa só voltou quando `Q-11` ganhou `D-73`.
