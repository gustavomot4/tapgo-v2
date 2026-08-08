---
tags: [contexto, tema, portao]
status: atual
tipo: contexto
data: 2026-08-08
---
# Portão de aceite — o que reprova a entrega do projeto

> Leia antes de fechar tarefa, declarar etapa fechada ou entregar. Saiu do
> [[a_context_source|CONTEXT]] em `A-11`, íntegro e sem uma palavra reescrita, porque o orçamento
> de 4.000 caracteres de lá não comportava os dois.
>
> **Nenhum número medido mora aqui.** Estes são limiares; o valor **atual** de cada um (bundle
> lido de `dist/`, contagem da suíte, versão) vive só no "Estado atual" do CONTEXT, e é lá que se
> confere se o limiar foi respeitado.

## Os seis critérios

- `npx tsc --noEmit && npm run build` verdes na máquina do dono.
- Bundle inicial **< 8 MB** — número lido da saída do build, não estimado.
- Teste de sistema: disputa completa (5 cobranças + alternadas) termina com o placar correto e roda 2x com o mesmo resultado.
- Varredura de `assets/`: nenhum arquivo sem origem declarada em [[licenciamento]].
- Fluxo crítico jogável por toque em viewport 360x640.
- Online: taxa de conexão medida em rede móvel real, com fallback declarado quando falha.

## Como cada um reprova

**`tsc --noEmit && npm run build`** é o portão mais barato e o mais fácil de fingir: ele só cobre o
que o `include` do `tsconfig.json` alcança. Hoje não alcança o `vite.config.ts` — é o `QA-04`, e
enquanto ele estiver aberto este critério passa verde sobre um arquivo que não leu.

**Bundle < 8 MB** é o gatilho de revisão de `D-02`: estourar não é "otimizar depois", é reabrir a
escolha de engine. O número tem de sair da saída do build, nunca de estimativa — e hoje a medição
soma toda entrada `isEntry`, inclusive página que o jogador nunca abre (`QA-06`).

**Disputa completa 2x com o mesmo resultado** é o que prova que o motor é determinístico e que o
gerador com semente de M1 não vazou para lugar nenhum. Rodar uma vez não é o critério: o critério é
a segunda rodada bater com a primeira.

**Varredura de `assets/`** existe porque asset sem procedência é a restrição de marca sendo violada
em silêncio. O critério é ausência de arquivo não declarado, não presença de declaração.

**Toque em 360x640** é o recorte mobile-first que define o produto. Fluxo crítico jogável quer dizer
jogável de ponta a ponta por toque, não "os botões aparecem".

**Taxa de conexão em rede móvel real** é o único critério que o sandbox de um agente não produz —
precisa de dois aparelhos e de rede de operadora, e por isso é ação do dono. O corte e as saídas
possíveis estão em [[online_p2p]] e o critério de decisão em [[m6_transporte_notas]].
