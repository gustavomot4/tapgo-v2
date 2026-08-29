---
tags: [qa, nota]
status: atual
---
# `QA-10` — o erro de configuração no denominador, e o portão que não o mede

> Nota de evidência de `QA-10`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> Escrita em sessão de **evolução** (auditoria, skill `guardrails-review`, 2026-08-28):
> **zero linha de código de produção alterada**. As saídas vivas com o custo completo, as mortas
> com o número que as matou, e o portão pedido **reprovado com medida** antes de qualquer escolha.
> A escolha é do dono (regra 6): ela muda um denominador de portão.
> **RESPONDIDA no mesmo dia — `D-96`: saídas (c)+(b), e o portão novo.** A implementação é `T-38`
> (`src/medicao.ts` só, skill `backend-bff`). Esta nota **não foi reescrita** depois da escolha: o
> que está abaixo é a medição que a produziu, inclusive as saídas preteridas com o número que as
> preteriu. `QA-10` segue ABERTO até `T-38` entregar.

## O mecanismo, lido do disco

`tentativa()` embrulha **uma** chamada num `try` — `joinRoom(id, ice)` (`src/medicao.ts:206-218`).
O `catch` escreve o motivo em `#estado` e devolve `{ ok: false, ms: 0 }`. `rodarUma()` então soma
**uma tentativa e uma falha** (`src/medicao.ts:245-255`), sem distinguir de um `'failed'` que veio
de 20 s de rede. Erro do operador entra na taxa que dispara a revisão de `D-01`, e o viés é para
baixo — a direção de `QA-08`.

### Duas correções ao próprio texto de `QA-10`, medidas

1. **`newRoomId()` não é capturado por `tentativa()`.** A linha do registro atribui a ela a exceção
   de contexto inseguro; `newRoomId` só é chamada por `hostRoom()`, dentro do clique de "Sortear
   sala" (`src/medicao.ts:459`), **fora** do `try`. Em contexto inseguro a base nunca é sorteada,
   `base` fica `''` e o botão "Tentativa" segue desabilitado (`src/medicao.ts:379`): **nenhuma
   tentativa é contada**. A metade `newRoomId` do achado não contamina denominador nenhum.
   Verificado: nem `newRoomId` nem `hostRoom` aparecem no corpo de `tentativa()`.
2. **O erro é tudo-ou-nada, nunca parcial.** O que faz `joinRoom` lançar é o formato de `base`
   (`ROOM_ID_RE`, `src/net/index.ts:197` e `579-587`), e `idDaTentativa` só rotaciona — preserva
   comprimento e alfabeto (`src/medicao_sala.ts:33-36`). Base inválida ⇒ **as 9 tentativas lançam**,
   medido. O convidado nunca produz taxa enviesada: produz **0,0%**, que é o número mais crível e
   mais falso que este projeto já pagou.

## O portão pedido, medido — e reprovado

Portão do card: *a taxa medida antes e depois sobre a mesma amostra de `e_qa/`*. A amostra é a de
`A-08` ([[backlog_archive]], e as idas em `d_history/a_changelog.md`), e ela **não contém um único
erro de configuração**:

| rodada | antes | depois | Δ |
|---|---|---|---|
| Wi-Fi × Wi-Fi (controle, 1ª ida) | 4/4 = 100,0% | 4/4 = 100,0% | 0,0 pp |
| Claro 5G × Wi-Fi (mista, 1ª ida) | 4/4 = 100,0% | 4/4 = 100,0% | 0,0 pp |
| Claro 5G × Claro 5G (1ª ida) | 5/5 = 100,0% | 5/5 = 100,0% | 0,0 pp |
| 1ª ida com `T-16` | 12/12 = 100,0% | 12/12 = 100,0% | 0,0 pp |
| 3ª ida (IPv6) | 1/1 = 100,0% | 1/1 = 100,0% | 0,0 pp |
| **4ª ida `IPv4/com NAT` (a que fechou E-4)** | 17/17 = 100,0% | 17/17 = 100,0% | 0,0 pp |
| **TOTAL** | **43/43 = 100,0%** | **43/43 = 100,0%** | **0,0 pp** |

Limite inferior 95% de `D-42`: **93,3% antes, 93,3% depois**. As 6 tentativas pré-`T-15` (0%, Wi-Fi
e 5G) também não entram: ali `joinRoom` **aceitou** o ID e a falha veio dos 20 s (`QA-08`) — e o
próprio registro já as declara fora da medição de E-4.

**Este portão aprova as quatro saídas abaixo e aprova também não fazer nada**, com o mesmo número.
Ele mede a taxa; a decisão move as *tentativas descartadas*, que na amostra valem zero. Portão que
não pede a variável da decisão não separa saída de omissão.

## O achado que muda a conversa: a saída de `QA-10` não toca o número que vira registro

Cenário-título do achado (`?m=` truncado no fim, 9 toques em cada aparelho), medido:

| aparelho | regra de hoje | com a saída de `QA-10` |
|---|---|---|
| **convidado** (tem a base truncada) | 0/9 = 0,0% | 0/0 = "—" |
| **anfitrião** (base íntegra, 20 s por toque) | 0/9 = 0,0% | **0/9 = 0,0%** |

`joinRoom` não lança no anfitrião: a base dele é válida, o canal abre, e o que ele registra são
nove `'failed'` de 20 s — **180 s de espera humana** virando falha de rede. E o resumo que virou
linha de registro na 1ª ida é o **do anfitrião** ([[m6_transporte_notas]]). A saída que `QA-10`
propõe limpa o número do aparelho que o registro não usa.

## E o guarda de `QA-09` é cego exatamente a esta truncatura

O procedimento manda comparar `#índice · 6 chars` nas duas telas antes do toque. Com a base cortada
**no fim**, os 6 primeiros caracteres da rotação coincidem com os do anfitrião em **20 a 21 dos 30
índices** (200 bases sorteadas, `rotuloDaTentativa` real). Nesses índices o operador lê
"sincronizado" com uma base que não existe. Truncatura no meio o guarda pega; a do link colado à
mão, que é o procedimento, ele não pega.

## A mensagem que o código promete deixar na tela é apagada no mesmo turno

O comentário de `src/medicao.ts:209-210` justifica contar a falha porque *"o motivo fica na tela —
número sujo é pior que número ausente"*. `rodarUma()` sobrescreve `#estado` incondicionalmente logo
após o `await` (`src/medicao.ts:256`), e o operador lê **`falhou após 0 ms`**. A premissa da regra
de hoje não é verdadeira desde que a linha existe: doc × comportamento, e é a defesa do próprio
`QA-10` que cai.

## As saídas, com custo

| | saída | custo medido | o que ela move |
|---|---|---|---|
| **(a)** | não contar a tentativa que lançou (o que `QA-10` propõe) | ~4 linhas em `medicao.ts` + 1 campo no retorno de `tentativa()`; **1 linha de `D-NN`** (~500 chars num registro com 679 livres) | convidado 0/9 → 0/0. **Anfitrião: nada.** Não alcança base de 26 chars válidos porém errada (não lança) |
| **(b)** | (a) + contador visível "descartadas por configuração: N" na tela e no resumo | ~6 linhas + 1 linha por contador no texto colável; mesmo `D-NN` | o mesmo que (a), **mais** separar "0/0 porque descartei" de "0/0 porque ninguém tocou" — a frente *ausente × zero* |
| **(c)** | recusar a base antes da 1ª tentativa: a primeira exceção desabilita "Tentativa" e escreve a mensagem que não é sobrescrita | ~4 linhas, **zero conhecimento do formato de M6**; a variante com `ROOM_ID_RE` custa ou abrir superfície de M6 (o preço que reprovou `D-39`/`D-40`) ou duplicar a constante — a suíte já duplica esse regex de propósito (`src/tests/medicao.test.ts:25`) | convidado para de contar **e** para de tocar; o anfitrião **deixa de queimar 20 s por toque**. Única família que move o número que vira registro |
| **(d)** | não mexer; rebaixar `QA-10` a BAIXO com a lacuna declarada | 1 linha em `d_qa.md`, **zero** no registro de decisões | nada. Defensável só se o dono aceitar que a próxima ida pode render 0% sem uma linha de rede exercitada — e o guarda de `QA-09` não avisa |

**Nenhuma delas conserta a base de 26 caracteres do alfabeto porém errada** (autocorreção trocando
um símbolo por outro válido): ali `joinRoom` aceita, e os 20 s entram como falha de rede nos dois
aparelhos. Esse resíduo fica declarado, não coberto.

## O portão que mede a variável da decisão

Proposto para substituir o do card — a escolha continua do dono:

1. **Amostra injetada, que é onde a variável existe:** `?m=` truncado no fim, 9 toques em cada
   aparelho. O portão são **dois** números antes/depois, não um: o do convidado **e o do
   anfitrião**. Saída que não move o do anfitrião só passa declarando isso por escrito.
2. **A amostra real de `e_qa/` fica como não-regressão, não como discriminador:** 43/43 = 100,0% e
   limite inferior 93,3% têm de continuar iguais — e continuam, em todas as quatro saídas.
3. **A premissa na tela vira teste:** com a base inválida, a última coisa escrita em `#estado` diz
   `configuração`, não `falhou após 0 ms`.

Os itens 1 e 3 são alcançáveis no sandbox por leitura de disco e pelos módulos puros; o **toque de
verdade nos dois aparelhos é do dono** (regra 7) — nenhum número de campo sai daqui.

## `T-38` entregue em 2026-08-28 — os dois números, medidos pelo mesmo instrumento

A nota acima é de auditoria e **não foi reescrita**. O que segue é o portão de `D-96` cobrado, e
as duas colunas saíram do **mesmo arquivo de teste** (`src/tests/medicao_config.test.ts`): o
"antes" foi medido com `src/medicao.ts` guardado no `git stash`, o "depois" com ele de volta.
Nenhum número aqui é lembrado nem estimado.

O teste **executa a página de verdade**, sobre um DOM mínimo escrito nele — e sem tocar a rede: o
cenário inteiro roda com base **inválida**, que é justamente o caso em que `joinRoom` lança antes
de construir canal. Nenhuma sala é aberta, nenhum `import()` de sinalização parte.

| medida | antes | depois |
|---|---|---|
| **convidado** — tentativas contadas em 9 toques | **9** (`0/9 = 0.0%`) | **0** (`0/0 = —`) |
| **convidado** — descartadas por configuração | linha inexistente | **1** |
| **anfitrião** — toques possíveis no procedimento de dois aparelhos | **9** | **0** |
| **anfitrião** — segundos de espera queimados (9 × `CONNECT_TIMEOUT_MS`) | **180 s** | **0 s** |
| última escrita em `#estado` com base inválida | `falhou após 0 ms` | `erro de configuração: …` |
| botão "Tentativa" ao abrir o link truncado | habilitado | **desabilitado** |

**O número do anfitrião não é modelo, é o procedimento que a própria página imprime:** *"Aperte nos
dois aparelhos ao mesmo tempo. Uma tentativa por vez, dos dois lados."* Rodada em que um dos lados
não tem em que tocar é rodada que não acontece — e é por isso que a recusa acontece **antes** da 1ª
tentativa (saída (c)), e não depois dela: recusar depois já teria custado 20 s do outro lado.

**Não-regressão, item 2 do portão:** a amostra real de `e_qa/` não contém **um único** erro de
configuração, e a regra nova só remove tentativa em que o canal nunca abriu — logo `43/43 = 100,0%`
e limite inferior `93,3%` antes e depois, `Δ 0,0 pp`. Está como teste, com o limite calculado por
`0,05^(1/n)` e não copiado da tabela acima.

**Como `T-38` pagou o que `QA-10` cobrou, sem tocar M6:** o gatilho é a exceção que `joinRoom` já
lança — `src/net/index.ts` não mudou um byte e `ROOM_ID_RE` não foi importado nem copiado. O preço
declarado: com base válida, o convidado abre e fecha um canal na entrada da página, que é o mesmo
preço que o anfitrião já paga no botão "Sortear sala", sobre a mesma sala (`idDaTentativa(base, 0)`
é a própria base).

**Limite declarado do portão automático:** o caso "base válida ⇒ botão habilitado" **não** é
exercitado no sandbox — ele abriria websocket para infraestrutura pública, e nenhum teste deste
repositório depende de rede. Ele é cobrado por leitura da origem (o `disabled` lê `baseRecusada`, e
não uma constante) e pelo aparelho do dono, em `A-40`.

**O resíduo continua descoberto, e continua declarado:** base de 26 caracteres do alfabeto porém
errada — `joinRoom` aceita, e os 20 s entram como falha de rede nos dois aparelhos.
