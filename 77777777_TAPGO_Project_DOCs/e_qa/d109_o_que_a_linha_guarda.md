---
tags: [decisoes, orcamento]
status: atual
---
# `D-109` — o que a linha guarda, e o que já tem dono em outro arquivo

Nota de evidência de `D-109` (2026-09-01). O registro cita esta nota; ela não define ID.

## 1. STEP 0 — o corte de `D-43`/`D-97` não alcança mais o portão

Medido nesta sessão, com a régua do próprio `check.py` (`medida()`, sem padding de tabela):

| o que | medido |
|---|---|
| `a_context/c_decisions.md` hoje | **18.735**/20.000 (**93%**) — aviso a partir de 18.000 (`PERTO = 0.90`) |
| pool do corte de `D-43` (`python scripts/arquivar.py`, sem flag) | **2** linhas: `D-104`, `D-105` |
| registro **depois** de aplicar esse corte inteiro | **18.033** — ainda **33 caracteres acima** do aviso |
| `a_context/a_context_source.md` hoje | **3.757**/4.000 (**93%**) — aviso a partir de 3.600; corte necessário **157** |

O achado é esse: o corte por linha morta não está "quase esgotado", ele **não fecha o portão nem
gastando as duas últimas candidatas**. E a leva de `A-NN` que `D-97` retirou do CONTEXT já saiu — lá
não sobrou nenhuma linha que o critério de `D-97` retire. Continuar por esse caminho é escolher
entre a parede e o teto, e o teto está REPROVADO (`D-99`/`D-101`, e `D-82` já o chamou de rejeição
adiada quando o subiu).

## 2. O critério, e por que ele não é poda de prosa

> **`D-109`:** a linha guarda o que se lê para **decidir hoje**. O que se lê para saber **como se
> chegou aqui** sai para o arquivo que já é dono disso — íntegra preservada, ponteiro no lugar.

Não é poda porque **nada é reescrito menor**: o texto sai inteiro, verbatim, para
[[decisions_archive]] ou para a nota de tema que já existe. É a operação de `D-97`, aplicada a duas
colunas que ele não tocou.

### 2a. No registro: a REJEITADA perde a coluna de evidência, não a linha

`D-74` manda a REJEITADA ficar viva porque ela é a lista-morta que a fase de evolução varre sem
abrir o arquivo. O que essa varredura precisa é do **ID + do que foi proposto + do status** — que é
exatamente a forma que `D-06`..`D-08` têm desde 2026-08-06 e que `D-74` nunca estendeu às
rejeições seguintes.

**A assimetria que sustenta o corte, e que o limita:** o número de uma **ADOTADA** é consultado para
*aplicar* a decisão — toda sessão que toca o módulo. O número de uma **REJEITADA** é consultado só
para *re-propor*, o que acontece numa fase só, e é a única fase que já carrega o registro inteiro e
abre notas. Custo declarado: para dizer "o contexto mudou" (regra 1 da skill) a fase passa a abrir
[[decisions_archive]]. Uma leitura a mais, na única sessão que pode pagá-la.

| # | medido hoje | como stub | economia |
|---|---|---|---|
| `D-39` | 193 | 89 | 104 |
| `D-40` | 168 | 88 | 80 |
| `D-41` | 230 | 95 | 135 |
| `D-76` | 479 | 129 | 350 |
| `D-78` | 319 | 171 | 148 |
| `D-79` | 374 | 164 | 210 |
| `D-92` | 390 | 122 | 268 |

`D-06`..`D-08` já estão na forma e não entram na conta.

### 2b. No CONTEXT: "Estado atual" guarda o QUE É, nunca o COMO CHEGOU

As linhas carregavam o relato do card que confirmou cada estado — a contagem de `A-42`, o corte de
`D-106`, quem respondeu `Q-09`, quais cards aliviaram o BACKLOG. Isso é histórico, e histórico tem
dois donos que já existem: `d_history/a_changelog.md` (datado) e [[estado_modulos]] ("qual tarefa
fechou qual módulo, e quais cards já passaram no aparelho"). Fica no CONTEXT o estado + o `D-NN`
que o decidiu. Os três números de ocupação de `D-97` **ficam** — `D-99` os prende e o `check.py` os
confere contra o arquivo.

## 3. Portão, escrito ANTES de aplicar

1. `python scripts/check.py --historico-completo` sai **exit 0** e **sem** os três avisos de hoje:
   o do CONTEXT, o do registro e o de `D-64`. Os dois avisos que sobram são `microservice-sync` e
   nenhum outro.
2. Registro **≤ 17.400** e CONTEXT **≤ 3.560** *depois* de somadas as linhas novas — folga de pelo
   menos **600** no registro, isto é, **duas** decisões futuras. Portão que fecha com folga de uma
   linha reabre na sessão seguinte.
3. **Nenhum ID some:** `D-39`..`D-105` continuam resolvendo. A checagem 10 do `check.py` (ID citado
   que não existe) fica muda, e é ela que prova este item — não o olho.
4. **Nenhuma evidência se perde:** cada texto retirado aparece verbatim em [[decisions_archive]],
   sob seção datada.
5. `python scripts/arquivar.py` sem flag continua concordando com o aviso do `check.py` (`D-101`):
   com o registro abaixo de 90% o aviso nem acende, e o pool da ferramenta cai para **NENHUMA**.

## 4. Lista-morta varrida antes de propor (regra 1 da skill)

| já morto | por que não é isto |
|---|---|
| `D-82` subiu o teto 16k -> 20k, e ele mesmo se declarou "rejeição adiada" com prazo | Subir de novo é a alavanca que `D-97` reprovou e que `D-101` chama pelo nome |
| `D-92`: card fechado do backlog deixa de segurar linha | Morreu com o pool medido em **ZERO**; e não é o pool desta proposta — a REJEITADA não é segurada por card nenhum |
| `D-97` explicitamente recusa "poda de prosa" | §2 acima: nada aqui é reescrito menor; o texto muda de arquivo inteiro |
| `D-94` (arquivada) comprou a saída que `D-97` substituiu | O caminho de `D-97` continua o certo — esta é a extensão dele, não a volta ao anterior |

## 5. A variante que foi REJEITADA no mesmo passo (`D-110`)

**Proposta:** estender 2a às **ADOTADAS** cuja evidência já termina em `Íntegra em <nota>` —
esvaziar a coluna e deixar só o ponteiro. Pool grande: 14 linhas, cerca de 4.000 caracteres.

**O que a matou:** o cabeçalho da tabela declara o contrato da coluna — *"Evidência (número-chave +
link)"*. A proposta guarda o link e joga fora o **número-chave**, que é a metade que faz a linha
utilizável sem abrir arquivo. E a assimetria de §2a inverte de lado: o número de uma ADOTADA é lido
para aplicar a decisão, em toda sessão que toca o módulo — não numa fase só. Trocaria um aviso de
orçamento por uma abertura de arquivo por sessão, em todas elas.

## 6. O que esta sessão NÃO fez

- Não subiu teto nenhum, e não propôs subir.
- Não tocou `src/`, `scripts/` nem a suíte: nenhuma linha de código mudou, então **679/679** e o
  `tsc` não são portão desta sessão — e dizer que são seria portão emprestado.
- Não reabriu `Q-13`, a única questão do dono em aberto.

## 7. Resultado medido, e o que o portão pegou no caminho

| item do §3 | previsto | medido |
|---|---|---|
| 1. `check.py --historico-completo` | exit 0, só `microservice-sync` | **exit 0, só `microservice-sync`** ✔ |
| 2. registro ≤ 17.400 / CONTEXT ≤ 3.560 | folga ≥ 600 | registro **17.378** (86%, folga **622**) · CONTEXT **3.509** (87%) ✔ |
| 3. nenhum ID some | checagem 10 muda | muda; `D-39`..`D-105` e `D-64` resolvem ✔ |
| 4. nenhuma evidência se perde | íntegra em [[decisions_archive]] | 7 REJEITADAS + `D-104` + `D-105` + `D-64` + `D-110` conferidos linha a linha ✔ |
| 5. pool do `arquivar.py` cai para NENHUMA | 0 candidatas | **1** na 1ª medição, **0** depois de fechar o defeito abaixo ✔ |

### O defeito que o item 5 pegou, e que só ele pegaria

Aplicado §2b, a 1ª medição devolveu **uma** candidata: `D-106`. Causa: a linha do CONTEXT que a
citava era o relato do card ("corte de `D-106` em 9"), e §2b a mandou para [[estado_modulos]] — mas
o relato foi **sem o ID junto**. A citação não mudou de arquivo: ela **evaporou**, e `D-106`, de
ontem, virou candidata a arquivamento no mesmo movimento que a deixou órfã.

Pior: o CONTEXT passou a dizer "contagens em [[estado_modulos]]" e aquele arquivo **não tinha as
contagens** — ponteiro para nada, que é a falha que o kit trata como inventar dado.

**Corrigido fechando o movimento, não desfazendo-o:** `A-42` (18 esq / 5 meio / 2 dir, corte de
`D-106` em 9) e a resposta de `Q-09` por `D-107`/`T-39` foram escritas em [[estado_modulos]], **com
os `D-NN` junto**. Pool de volta a **0**: *"Nada a arquivar pelo critério: toda linha não-rejeitada
é citada por algum .md vivo."*

**A régua que fica, e vale toda vez que §2b for aplicada:** *mover relato do CONTEXT é mover a
CITAÇÃO, não só o texto* — o `D-NN` viaja junto, e o destino tem de passar a conter o que o ponteiro
promete. Sem isso o alívio de um orçamento fabrica candidata no outro, e o ponteiro mente.

`D-101` não foi arranhado em nenhum dos dois momentos: as duas réguas nunca divergiram — o aviso do
`check.py` está mudo porque o orçamento está em 86%, não porque discorde do `arquivar.py`.
