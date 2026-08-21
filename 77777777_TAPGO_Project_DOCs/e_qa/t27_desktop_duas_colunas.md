---
tags: [nota, qa]
status: atual
---
# T-27 — o desktop em duas colunas (`D-86`, `P-1`, `P-7`, `QA-31`)

> Evidência longa das linhas de `D-86` e `QA-31` no [[c_decisions|DECISIONS]] e no [[d_qa|QA]],
> que têm teto de 2 frases por linha.
> Nenhum número de estado mora aqui: bundle, suíte e versão só no [[a_context_source|CONTEXT]].

## O que existia antes, e por que não era defeito de CSS

`src/ui/estilo.css` tinha **um** teto — `max-width: 420px` — e **um** ponto de quebra,
`@media (min-width: 480px)`, que não alargava nada: só desenhava a borda e a sombra do cartão.
Em 1280x800 sobravam ~860px por construção, e em 1920, ~1500.

Isso nunca foi um defeito a consertar. O portão de `T-20` cobrava "360x640 **e** no desktop", mas
o que ele cobra no desktop é **ausência de rolagem horizontal**, não composição — e a folha
passava nesse portão. O que faltava era decisão, e decisão de gosto é do dono (regra 6). Por isso
esta sessão apresentou três direções antes de escrever a primeira linha de CSS.

## As três direções apresentadas, e o que o dono escolheu

| | Direção | Custo | O que resolvia | O que não resolvia |
|---|---|---|---|---|
| A | A mesma coluna, mais larga (720px, grade a 3 colunas) | ~15 linhas de CSS, zero TypeScript | metade de `P-7` | em 1280 ainda sobravam ~560px; `P-1` virava "o celular um pouco mais largo" |
| **B** | **Duas colunas na mesma folha** | CSS + uma classe por tela em 3 arquivos de M7 | **`P-1` e `P-7` juntos** | as telas sem par continuam coluna |
| C | Trilho fixo de 320px + palco | TypeScript nas 8 telas | botão sempre visível em todas | trilho vazio em `campeao` e `torneio_novo` |

**O dono escolheu B**, e ela virou `D-86`.

## A regra de `D-86` cabe numa frase

**A largura da folha é declarada pela TELA, não pela folha.** Acima de 1024px o teto deixa de ser
um número global e passa a ser uma pergunta — *esta tela tem conteúdo que emparelha?*

| Classe | Folha | Quem usa | Por quê |
|---|---|---|---|
| `.tela--largo` | 1040px, grade de 2 colunas | seleções, torneio | as duas grades de `P-7`; a próxima disputa e a tabela do grupo |
| `.tela--disputa` | 760px | cobrança | não emparelha nada — o conteúdo é o campo, e o limite dele é de ALTURA |
| _(nenhuma)_ | 460px | início, convite, fim, campeão, torneio novo | um menu de 4 botões não tem o que pôr em duas colunas |

`:has(> .tela--…)` no `.tapgo` é o que deixa a filha declarar a largura da mãe. A folha já usava
`:has()` em `.cartao` e `.segmento` desde `T-20`, então não é técnica nova aqui.

`.par` é a classe que a tela põe no bloco que tem irmão para ficar ao lado. É classe explícita, e
não regra estrutural por `nth-child`, porque a tela de torneio **troca a tabela por uma caixa de
aviso** no estado de erro — contar filhos quebraria exatamente nesse estado.

## Por que a cobrança é mais estreita que as telas de duas colunas

`.campo` tem `aspect-ratio: 36/26`: cada pixel de largura vira 0,72 de altura. Numa folha de
1040px o campo teria ~720px de altura **sozinho**, e a disputa começaria fora da dobra de um
monitor de 800. O campo passou a ser limitado pela altura disponível:

```css
width: min(100%, calc(58vh * 36 / 26));
```

`min(100%, …)` é o guarda: numa janela baixa e larga o campo volta a ser limitado pela folha, e
nunca ultrapassa os 100% que causariam rolagem lateral. Medido em 1920x1080, onde `58vh` daria
867px de largura e o campo saiu com os 710 da folha.

## A armadilha que custou uma medição

A primeira escrita capava os blocos de ação com `max-width: 420px; margin-inline: auto`. **Margem
automática desliga o esticamento do item de grade e de flex**, que passa a se dimensionar pelo
conteúdo: o "Começar" saiu com **100px** de largura — um alvo MENOR que o do celular, dentro de
uma folha três vezes maior. A saída é `justify-self: center` na grade (`.tela--largo`) e
`align-self: center` no flex de coluna (`.tela--disputa`), sempre com `width: 100%` e o teto.

Segunda armadilha da mesma regra: o seletor da cobrança pedia `.grupo.empurra`, e ali o bloco da
saída é `<div class="empurra">` **sem** `grupo`. A regra não casava com nada — e regra morta é
pior que regra ausente, porque parece cobertura.

## Medido no sandbox, em `dist/` (build oficial, não dev server)

| Tela | 360x640 | 1280x800 |
|---|---|---|
| seleções — cartões por linha na tela inteira | 2 | **4** |
| seleções — altura total | 2.719 px | **1.590 px** |
| seleções — folha | 360 px | 1.040 px |
| cobrança — campo | 336 x 243 px | **642 x 464 px**, base em 709 (dentro da dobra) |
| torneio — próxima disputa × tabela | empilhadas | lado a lado, as duas em `y = 137` |
| rolagem horizontal | nenhuma | nenhuma |

Conferidos também 1023px (a folha volta a 420 e a grade a 2 cartões — o ponto de quebra pega),
1024px exato e 1920x1080 (a folha para em 1040 e o campo no teto de 100%).

**O que o sandbox NÃO produz:** a pane do navegador fica escondida e não compõe quadros, então
não houve captura de tela — só geometria e estilo computado. Se as duas colunas ficam **bonitas**
é olho humano, e é o que `A-30` pede.

## O campo (`A-30`, 2026-08-21): o número passou, e trouxe dois achados

O dono respondeu **4** — *"aparecem 4 seleções, duas minhas e duas do adversário"* —, com as
grades lado a lado e sem barra horizontal. `D-86` está no monitor dele, e `T-27` tem campo.

**O card pediu UM inteiro, e é a primeira vez em seis que a forma funciona.** `A-25`..`A-29`
fecharam por "tudo certo" global. O inteiro não só veio: ele veio acompanhado de dois defeitos que
**nenhuma** das minhas cinco medições de viewport tinha visto.

### Achado 1 — o critério de `D-86` estava escrito sobre a TELA, e devia estar sobre o COMPONENTE

*"já no TAP GO Cup aparecem apenas 2"*. A tela de começar o torneio (`tela_torneio_novo.ts`) usa a
**mesma** `grade()` de 32 cartões da tela de seleções. Ficou de fora porque o critério que escrevi
foi *"esta tela tem par a formar?"* — e escolher UMA seleção não forma par. O critério certo era
*"esta tela tem a mesma grade?"*.

O conserto é `.solo`: o bloco atravessa as duas colunas (o padrão) e quem vira grade de 4 é a
**grade**, não a tela. Dá 241px por cartão, contra os 238px das telas emparelhadas — a mesma
leitura, que é exatamente o que o achado pedia. Em 360x640 continua 2 cartões de 164px.

### Achado 2 — `QA-31` piorou por causa de `D-86`, e veio com foto

O "Sair da disputa" de 144px já era estreito antes; com `D-86` o bloco passou a ser centrado em
420px dentro de um cartão de 760, e o botão virou **órfão no meio**. Medindo na foto do dono: o
cartão tem ~1035px de imagem, o botão começa em x≈290 — que é a borda esquerda de um bloco de 420
CSS px centrado, na escala de 1,36 da captura. Bate.

O conserto é `grupo` na classe do bloco: `<button>` não estica dentro de um `<div>` de bloco, e
`.grupo` é flex de coluna. **Isto muda também o 360x640**, onde o botão vai de 144 para 336px — é
a largura que o "Voltar" de toda outra tela sempre teve.

## `QA-31` — como ele foi registrado, e por que não foi consertado na hora

Na tela de cobrança o "Sair da disputa" tem **144px** de largura dentro de um bloco de 336 (em
360x640) — o `<button>` não estica porque o pai é um `<div>` de bloco, e não um `.grupo` de flex
como nas outras telas. Medido **antes e depois** desta sessão, nos dois viewports, com o mesmo
número: é de `T-10`, não de `D-86` (regra 4).

**Fechado em 2026-08-21**, quando o dono o fotografou: um achado que a sessão declarou e não
consertou virou o defeito mais visível da entrega dela. A regra 4 continua certa — o que faltou
foi ver que `D-86` o AGRAVAVA, e isso não é conserto de carona, é consequência da própria tarefa.
