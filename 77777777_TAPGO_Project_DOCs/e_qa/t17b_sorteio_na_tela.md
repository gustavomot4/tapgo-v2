---
tags: [nota, qa]
status: atual
---
# T-17b — o sorteio na tela (`QA-15`, `D-49`, `QA-16`)

> Evidência longa de três linhas do [[c_decisions|DECISIONS]], que tem teto de 2 frases por linha.
> Nenhum número de estado mora aqui: bundle, suíte e versão só no [[a_context_source|CONTEXT]].

## `QA-15` — eram três promessas, não uma

O achado nomeava `src/ui/rotas.ts`. A varredura da sessão encontrou mais duas, ambas em
`src/ui/tela_selecoes.ts`, e ambas visíveis para o jogador — pior que a do comentário:

| Onde | Dizia | Diz |
|---|---|---|
| `rotas.ts`, comentário de `LADO_DO_HUMANO` | "`'A'` cobra primeiro (`FIRST` de M2)" | que o lado do humano **não** diz quem cobra primeiro; o primeiro sai de `state().turn` |
| `tela_selecoes.ts`, rótulos do modo `local` | "Quem cobra primeiro" / "Quem cobra depois" | "Seleção da esquerda" / "Seleção da direita" — as posições do placar da cobrança |
| `tela_selecoes.ts`, subtítulo do modo `cpu` | "Você cobra primeiro." | "Um sorteio decide quem começa." |

Os rótulos do `local` eram o caso mais caro: a tela de seleções é **anterior** à criação da sessão,
e antes dela a ordem não existe. Qualquer palavra sobre ordem ali é chute com cara de contrato.

**O portão virou teste.** "Nenhuma promessa de ordem fixa sobrando em M7" é portão sobre TEXTO, e
texto volta a crescer na sessão seguinte. `ui.test.ts` varre `src/ui/` procurando sujeito fixo
colado a "cobra/começa/bate primeiro", e também o nome da constante de M2. Como em `T-15`, o
padrão vem com caso negativo escrito: sem ele, um erro de digitação no regex deixaria o portão
verde à toa — e o texto correto ("Um sorteio decide quem começa", "Sorteio: X cobra primeiro")
está no teste provando que ele não é pego.

## `D-49` — painel, não tela

O card pedia "tela da moeda". A entrega é um painel dentro da tela de cobrança porque
`tela_inicio.ts` declara o portão de UX do fluxo crítico: **começar uma disputa fecha em 2 toques**
com as preferências salvas. Tela própria com "ok, entendi" faria 3, e o portão cairia por causa de
uma animação.

O painel some sozinho: em `cpu`, na 1ª cobrança resolvida; em `local`, já no 1º toque — entre o
chute e a defesa o aparelho trocou de mão, e "quem cobra fica com o aparelho" estaria mandando
quem defende fazer o contrário do que a tela pede.

**Onde a lógica mora:** `sorteioDoPrimeiro()` e `instrucaoDoSorteio()` são funções puras em
`rotulos.ts`, e é por isso que a suíte as cobre sem navegador. Nenhum lado literal entrou em M7: a
sabotagem que fixa `'A'` reprova 2 testes, conferida à mão nesta sessão.

## `QA-16` — `hidden` que não esconde

`.aviso { display: flex }` é declaração de **autor**; `[hidden] { display: none }` é do
**navegador**. No cascade o autor ganha, então todo `aviso.hidden = true` do projeto não esconde
nada: a caixa de erro vazia — borda `--perigo`, ~30 px — está na tela desde `T-10`, inclusive
durante a disputa, onde ela come altura em 360x640.

Alcança `tela_cobranca.ts` (`erro`), `tela_selecoes.ts` (`avisoErro`) e a caixa de erro da criação
da sessão. A correção é uma linha (`.aviso[hidden] { display: none }`), mas muda o layout de três
telas e é anterior a esta tarefa — regra 4, fica registrado e não consertado de carona. O
`.sorteio` que nasceu aqui já traz a própria linha `[hidden]`, com o motivo escrito ao lado.

> **Fechado em 2026-08-13, e por uma regra global, não por classe.** A linha por classe é
> justamente a lista que ninguém mantém: `.campo__sem-canvas` (`display: grid`, escondido durante
> a disputa) tinha o mesmo defeito e não estava nas três telas contadas acima. A folha passou a ter
> um `[hidden] { display: none !important }` no topo, e o `.sorteio[hidden]` daqui saiu por
> redundante. O portão virou "nenhuma OUTRA regra declara `display` com `!important`".

## O que esta sessão NÃO cobriu

- **O modo `online`**, que segue em `'A'` por `Q-11`: sem semente compartilhada os dois aparelhos
  divergiriam na 1ª cobrança. A tela não precisou de ramo novo — `sorteioDoPrimeiro()` lê `turn`,
  qualquer que seja a origem dele.
- **O portão de aparelho real** (`A-14`). `vitest` roda em Node sem DOM e o sandbox não tem
  navegador: nenhuma tela de M7 é verificável por lá, só os módulos puros e os portões de disco.
