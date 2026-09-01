---
tags: [notas, questoes-abertas]
status: atual
---
# Questões abertas — justificativa longa (`Q-03`, `Q-05`, `Q-07`, `Q-08`, `QA-04`)

> **Este arquivo não define ID e não responde nada.** As questões continuam **abertas** em
> `a_context/c_decisions.md`; aqui fica só o porquê que não cabe no teto de 2 frases por linha
> daquele registro (`A-10`). Nenhuma sessão precisa ler esta página para trabalhar — quem vai
> **responder** uma destas questões é o dono, e a pergunta inteira está no registro.
>
> Quando uma questão for respondida, a seção dela aqui morre junto com a linha de lá: a decisão
> vira `D-NN` no registro, e a evidência que sobreviver vai para a nota do módulo.

## Como "2 frases por linha" foi medido em `A-10` — e por que a régua está ambígua

O registro declara **"Teto: 2 frases por linha"** sem dizer o que é uma frase numa linha de tabela
com sete colunas. As duas leituras possíveis dão respostas opostas:

| Leitura | `QA-01` (141 chars, nunca acusada) | `Q-03` (359 chars) |
|---|---|---|
| soma **toda** célula | 7 frases — reprova | 4 frases — reprova |
| só as células de **prosa** | 2 frases — passa | 3 frases — reprova |

`A-10` usou a segunda: para o `Q-NN`, contam "Questão" e "Decidir quando"; para o `QA-NN`, contam
"O que quebrava" e "Correção". Data, severidade, local e "Fechado em" são campos, não prosa. Foi a
leitura escolhida porque é a que o próprio `A-10` já praticava — ele acusa `Q-08`, `Q-07`, `Q-09` e
`QA-04`, que são as linhas de prosa longa, e nunca acusou `QA-01` nem `QA-03`.

**Isto não foi gravado como regra, de propósito.** A frase do teto aparece em dois lugares —
`a_context/c_decisions.md` (cabeçalho) e `b_process/templates/a_decision.md` (linha 10) —, e
mudar um sem o outro cria duas redações da mesma regra, que é o defeito que este kit chama de
fonte duplicada. O template é do kit, fora do escopo desta sessão (regra 2), então a régua fica
como está e a decisão de redigi-la é do dono.

Script que reproduz a contagem, se o dono quiser cobrá-la: percorre as linhas `Q-NN`/`QA-NN`,
resolve os wikilinks, protege os pontos dentro de crase (`index.html` não é fim de frase) e divide
em `(?<=[.?!])\s+`.

## `Q-03` — histórico do texto da questão

A linha de `Q-03` carregava, na coluna "Decidir quando", uma frase sobre a própria linha:

> Texto alargado em 2026-08-07 para cobrir o que o [[b_plan|PLANO]] já lhe atribuía — AC-14

O que ela registrava: `Q-03` nasceu perguntando só quantas e quais seleções entram. O relatório de
consistência de 2026-08-07 achou (`AC-14`) que o PLANO já atribuía a `Q-03` mais duas coisas que a
questão não perguntava — o **formato do chaveamento** e o **nome do torneio** —, e o texto foi
alargado para cobri-las. A origem das bandeiras entrou pelo mesmo motivo, e é a parte com prazo
mais curto: asset sem licença não entra no repositório, então ela vence antes de E-3.

O prazo e a pergunta seguem intactos no registro; só esta nota de rodapé histórica saiu de lá.
Íntegra do achado em [[b_artifact_consistency_report_260807_1605]].

## `Q-05` — o torneio no modo `online`

Texto que estava na coluna "Decidir quando" do registro, na íntegra:

> antes de E-5. Se rodar online, M8 passa a depender de M5 e o chaveamento vira estado
> compartilhado entre dois aparelhos — muda a camada 3 do PLANO. Fecha AC-07

O que isso custa, se a resposta for "sim, roda online": M8 deixa de ser um módulo de regra pura
sobre M1 e passa a depender de M5, que é a sessão de disputa. Chaveamento compartilhado entre dois
aparelhos precisa de dono do estado, de reconciliação quando um lado cai e de uma resposta para
"o torneio sobrevive à queda do peer?" — que hoje é `D-35` no recorte de **uma** disputa, e não
transfere para o recorte de um torneio (regra 8 do auditor). É por isso que a questão trava
`A-06`, e `A-06` trava M8: o desenho de M8 sem esta resposta é suposição, não plano.

`AC-07` é o achado do relatório de consistência que criou esta questão — íntegra em
[[b_artifact_consistency_report_260807_1605]].

## `Q-07` — quem cobra primeiro em cada rodada das alternadas

Texto que estava no registro, na íntegra:

> **Pergunta:** Nas alternadas, **quem cobra primeiro em cada rodada**? Segue sempre `A` (o que M2
> implementou, leitura literal de [[regras_partida]]), ou alterna a ordem entre rodadas para diluir
> a vantagem de bater primeiro?
>
> **Decidir quando:** antes de E-4. M2 entregou o padrão `A`-primeiro e o marcou: mudar é trocar uma
> constante e a ordem em `resolve`, com os testes de rodada já no lugar. Vira `D-NN` — não
> replanejamento

Os dois lados, para o dono decidir sem reabrir o código:

- **Sempre `A`** é a leitura literal de [[regras_partida]] e é o que T-06 implementou e marcou. Custo
  de manter: zero. Custo esportivo: em morte súbita, quem bate primeiro tem vantagem conhecida, e
  ela cai sempre para o mesmo lado.
- **Alternar entre rodadas** dilui essa vantagem. Custo: uma constante e a ordem em `resolve` — os
  testes de rodada de T-06 já existem e cobrem o invariante do placar, então a mudança é pequena
  **e** verificável.

O que torna isto `D-NN` e não replanejamento: `D-13` congelou o PLANO, mas a ordem de cobrança
dentro da rodada é regra de disputa, não contrato de módulo. Nenhuma porta muda.

## `Q-08` — `pick(role)` lê o histograma do mesmo papel

Texto que estava no registro, na íntegra:

> **Pergunta:** `pick(role)` lê o histograma do **mesmo** papel — é essa a intenção? O portão de M3
> exige que encher `shooter` de `'L'` não mexa em `pick('keeper')`, e T-07 implementou exatamente
> isso; mas quem defende quer prever o **chute** do humano, e o chute mora no histograma `shooter`
>
> **Decidir quando:** antes de E-3, porque M5 (T-09) é quem vai chamar `observe`/`pick` e fixa o
> significado na prática. Como está, a CPU que defende imita as defesas do humano em vez de ler os
> chutes dele — leitura literal do portão, e pode ser o desenho pretendido. Trocar é inverter o
> índice em `pick`, com os testes de isolamento já no lugar

**O prazo venceu e a questão continua aberta** — E-3 fechou com T-10, e T-09 passou sem responder.
Isso está registrado como `QA-07`; a data acima fica como está porque prazo é do dono, não do agente.

Por que ninguém tropeçou nisso ainda: `D-26` fixou que, no modo `cpu`, M5 chama `pick` **antes** de
`observe` na mesma cobrança, e dentro de uma cobrança os papéis são disjuntos — a ordem é hoje
**inobservável**. A análise completa dessa inobservabilidade, e por que ela é a armadilha que fecha
se `Q-08` for respondida ao contrário, está em [[m5_sessao_notas]] (§ `D-26`).

Custo de inverter: o índice em `pick`, mais nada. Os testes de isolamento de T-07 já existem e
**passam a falhar de propósito** quando a semântica mudar, que é o comportamento desejado.

## `Q-09` — respondida por `D-107` em 2026-09-01

A seção morreu junto com a linha do registro, como o cabeçalho deste arquivo manda. A resposta é
`D-107` — a porta de M5 não muda, a derivação de `kicks.length` é a resposta —, e a evidência que
sobreviveu foi para a nota do módulo: [[m7_tela_notas]] (§ `Q-09`), com o gatilho que a reabre.

## `QA-04` — `vite.config.ts` fora do `tsc --noEmit`

Texto que estava no registro, na íntegra:

> **O que quebrava:** `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de
> tipo na configuração de build não é pego pelo portão, só estoura no `vite build`
>
> **Correção:** Acrescentar `"vite.config.ts"` ao `include`. **Não feito em T-05:** `tsconfig.json`
> é de outro dono e a regra 4 manda registrar, não consertar de carona

Por que isto importa mais do que parece para um achado MÉDIO: o portão de aceite do projeto é
`npx tsc --noEmit && npm run build`, e a primeira metade dele declara cobrir a tipagem. Com
`include: ["src"]`, a configuração que **produz** o build fica fora da checagem que deveria
protegê-la — o portão passa verde sobre um arquivo que ele não leu. O erro não some: ele só troca
de lugar, de `tsc` para `vite build`, e aparece mais tarde e com mensagem pior.

Por que continua aberto e não foi consertado de carona: `tsconfig.json` nasceu em `D-14`, é de
M9, e a regra 4 do contrato manda registrar `QA-NN` em vez de consertar módulo de outro dono na
sessão errada. A correção é de uma linha e o portão dela é o próprio `tsc --noEmit` continuar verde
com o arquivo dentro do `include`.
