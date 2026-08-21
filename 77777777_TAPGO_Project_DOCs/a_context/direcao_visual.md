---
tags: [tema, visual]
status: atual
---
# Direção visual — noite de estádio (`D-65`)

Restrição **permanente**, não estilo de uma tela: as **3** telas de `T-14` herdam esta folha, e
toda tela nova nasce dentro dela. A íntegra da evidência de `D-65` mora aqui desde o corte de
`e_qa/registro_no_teto.md` §5.1 — a linha do registro guarda o ponteiro.

## As regras da folha

| regra | por quê |
|---|---|
| superfície em degradê com sombra **e** realce — nunca cor chapada | é o que dá noite de estádio sem asset |
| verde do gramado como **acento**, não como fundo | fundo verde puxa a tela para "campo de futebol", e o jogo é a cobrança |
| bandeira em **retângulo**, nunca em disco | ver abaixo — é medida, não gosto |
| capa e profundidade feitas **só de degradê** (zero asset) | é o que mantém a capa sob o teto de `D-02` |
| movimento restrito a `opacity` / `transform` | o resto obriga o navegador a refazer layout a cada quadro |

## Por que retângulo e não disco

`object-fit: cover` num círculo corta a faixa de baixo de **toda** tricolor horizontal, e as **32**
bandeiras de `T-19` são **4:3**. O disco não perde "um pouco de borda": ele apaga uma das três
faixas em cada bandeira desse formato — que é a maioria do catálogo de [[m4_lista_das_32]].

## Zero asset é orçamento, não estética

A capa inteira é degradê porque asset novo entra no bundle, e o bundle responde ao teto de `D-02`
([[stack]]). Quem quiser trocar degradê por imagem paga em bytes medidos no `dist/`, e a conta do
`D-62` (`?no-inline`, [[m4_catalogo_notas]]) mostra o que um asset de catálogo já custa.
