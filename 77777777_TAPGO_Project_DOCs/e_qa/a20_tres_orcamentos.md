---
tags: [nota, evolucao, registro]
status: atual
---
# A-20 — os três orçamentos, medidos um a um (sessão de evolução, 2026-08-19)

> **Continuação de [[a16_teto_do_registro]]**, que subiu o teto do registro de 12.000 para 16.000
> no mesmo dia. A seção 6 daquela nota previu esta sessão com todas as letras: *"o gargalo passa a
> ser o CONTEXT (…) é o próximo a bater na parede"*. Bateu — e o registro bateu junto.

## Método (repetível na máquina do dono)

Tudo medido no repositório real, nunca de memória, com a régua do próprio `check.py`: `medida()`
(célula de tabela sem o padding de alinhamento, `D-50`) sobre o texto com quebra normalizada. A
curva por sessão saiu de `git show <sha>:<arquivo>` commit a commit, não de estimativa.

## 1. O estado que abriu a sessão — os três juntos, pela primeira vez

| registro | medido | teto | folga | o que a folga compra |
|---|---|---|---|---|
| [[a_context_source\|CONTEXT]] | **4.000** | 4.000 | **0** | nada — e é **FALHA**, não aviso: a próxima linha de estado não commita |
| [[d_qa\|QA]] | 7.933 | 8.000 | 67 | um quinto de um achado |
| [[c_decisions\|DECISIONS]] | 15.690 | 16.000 | 310 | menos que uma decisão |

Uma sessão que responde uma questão e registra um achado — exatamente o que a sessão anterior
fez — já não cabia em nenhum dos três.

## 2. A curva real, e a projeção de `D-69` falsificada

`D-69` projetou **+466/sessão** e a parede em ~7,5 sessões. Medido commit a commit desde ele
(`7700b52`, registro em 12.499):

| sessão | DECISIONS | QA | CONTEXT |
|---|---|---|---|
| `A-17` (`a1d5003`) | +412 | — | +10 |
| `A-18` (`ed2d12c`) | +420 | — | +59 |
| `Q-14`/`D-71` (`fab0e9b`) | +651 | — | +26 |
| `E-6`/`D-72` (`efd7b41`) | +780 | — | — |
| `Q-11`/`D-73` (`fba5cc7`) | +928 | +310 | +4 |
| **média** | **+638** | +341 | +21 |

A parede voltou em **5** sessões, não em 7,5, porque a inclinação subiu 37%. **A projeção não
errou por acaso** — a seção 5 mostra a causa, e ela é a única coisa que este `D-74` não conserta.

## 3. O pool de cada saída, medido ANTES de comparar

### 3.1 `D-43` continua em ZERO — terceira medição

Nenhuma das linhas vivas deixou de ser citada por um `.md` vivo. `A-13` mediu, `A-16` remediu,
`A-20` remede: **zero**. O aviso do `check.py` chegou a sugerir `D-73` — a decisão **mais nova e
mais citada** —, sugestão que o critério de `D-43` não sustenta e que o próprio aviso já
desmente ao imprimir "NENHUMA".

### 3.2 O pool que ninguém tinha medido: **duplicata**

A tabela viva guardava 15 linhas com status `ARQUIVADO`, cuja **íntegra já estava** em
[[decisions_archive]]. Conferido linha a linha: **15/15** têm a linha completa no arquivo. Isso
não é ponteiro — é o mesmo fato guardado duas vezes, contra a regra de fonte única do próprio kit.

| o que sai | linhas | rende |
|---|---|---|
| `ARQUIVADO` **não** rejeitadas (`D-01` `D-02` `D-04` `D-09` `D-10` `D-13` `D-22` `D-27` `D-35`..`D-38`) | 12 | **1.536** |
| `Q-11` e `Q-14`, RESPONDIDAS (mesmo corte de `D-63`) | 2 | **693** |
| `D-06` `D-07` `D-08`, REJEITADAS e arquivadas | 3 | **fica** — 227, e é a lista-morta |
| **total retirado** | 14 | **2.229** |

**Por que isso é seguro:** a checagem 10 do `check.py` (linhas 561-567) põe no conjunto
`arquivados` todo ID que aparece em [[decisions_archive]], justamente para que o corte de
orçamento não fabrique "ID inexistente". O ID resolve; some a cópia, não o fato.

**Por que `A-16` não viu isto.** A saída (i) de lá era *"as 15 linhas `ARQUIVADO` viram ponteiro
puro"* — **mantendo a linha viva** — e rendia 788, abaixo do portão. `A-20` mede outra operação: a
linha **sai inteira**. 1.536 contra 788, e o argumento que matou (i) (*"apaga a coluna Decisão
(curta), que é o que deixa a fase de evolução varrer a lista-morta"*) não alcança estas 12: a
lista-morta são as REJEITADAS, e elas **ficaram**. É o ângulo novo que a regra 1 exige, declarado.

### 3.3 QA: o corte que este registro ainda tinha

10 achados **FECHADOS** ocupavam **3.736** dos 7.933. Os 9 **ABERTOS** (3.009) ficam: achado
aberto não se arquiva, e foi para proteger exatamente isso que `D-50` lhes deu orçamento próprio.
Dos 10, sete (`QA-11` `QA-13` `QA-14` `QA-15` `QA-16` `QA-18` `QA-19`) nunca tinham sido
arquivados — para eles o arquivo passa a ser a **fonte**, não uma segunda cópia.

### 3.4 CONTEXT: pool bruto de 651, líquido de **446**

| candidato | bruto | líquido | veredito |
|---|---|---|---|
| linha "Pronto" → [[estado_modulos]] | 460 | ~225 | **adotado** — paga o ponteiro (152) e a linha no Mapa (83) |
| nota de rodapé sobre o [[CLAUDE]] | 191 | 191 | **adotado** — explicava por que o Mapa não está ali, dentro do arquivo que ele economiza |
| histórico da linha "Questões abertas" (respondidas/fechados) | ~100 | ~100 | **adotado** — vive nos dois registros e no arquivo |
| linha "Bundle" → [[stack]] | 235 | 0 | **REJEITADO por regra**: o [[CLAUDE]] manda estado numérico morar **só** aqui |

O CONTEXT é o único dos três cobrado em **toda** sessão. É por isso que ele é o último candidato a
ter o teto subido, e o primeiro a ter tema relocado.

## 4. O que ficou decidido (`D-74`) e o resultado medido

| registro | antes | depois | folga | **em linhas** |
|---|---|---|---|---|
| CONTEXT | 4.000 | **3.554** | 446 | **~21 sessões** (a +21/sessão); 46 até o aviso |
| QA | 7.933 | **4.292** | 3.708 | **10,6 achados** (a 350); 2.108 até o aviso |
| DECISIONS | 15.690 | **14.229** | 1.771 | **3,5 decisões** (a 509, o custo de hoje) |

O portão de `A-20` pedia a folga em número de linhas, e é essa a coluna da direita. Os três
passam, e **nenhum teto subiu**.

**O número desconfortável, declarado:** 1.771 no registro são 3,5 decisões, mas só **2,8 sessões**
à inclinação de hoje. Este corte compra menos tempo do que `D-69` comprou — e é essa a evidência
de que o problema mudou de lugar.

## 5. O que este `D-74` **não** conserta: a inclinação

O teto de *"2 frases por linha"* é regra escrita no cabeçalho do registro, e **nenhum script a
cobra**. Medido nas 35 linhas vivas:

| | caracteres |
|---|---|
| mediana | **308** |
| média | 346 |
| as 6 mais recentes | **509** |
| `D-73` (a maior) | **922** |
| `D-67` e `D-68` (evidência mandada para o tema) | **141** e **175** |

15 das 35 passam de 2 frases; as quatro mais caras (`D-69` 511, `D-71` 632, `D-72` 789, `D-73`
922) são todas posteriores a `D-63`. `D-67`/`D-68` provam que a regra funciona quando é seguida:
**um quinto** do custo, escritas na mesma semana.

Isto vira `A-21` e **não** foi feito aqui, porque cobrar o teto por script é mexer no `check.py` —
código, e o portão desta sessão dizia "sem tocar em código".

## 6. Lista-morta percorrida (regra 1)

| ideia | onde morreu | continua morta? |
|---|---|---|
| subir o teto do registro | `A-13` saída (b), P=0,05 | **não** — voltou e foi adotada em `D-69`; agora morre de novo, ver abaixo |
| `ARQUIVADO` vira ponteiro puro | `A-16` saída (i), 788 | **substituída**: a linha sai inteira, 1.536 (§3.2) |
| REJEITADAS para arquivo próprio | `A-16` saída (ii), 821 | **sim** — continua rendendo 821 e agora custaria a lista-morta que esta fase acabou de varrer |
| arquivar pelo critério de `D-43` | `A-13`, `A-16` | **sim** — pool ZERO pela terceira vez |
| comprimir a prosa das linhas antigas | — | **proibido**: o registro é append-only, e o portão de `A-20` veda "prosa comprimida" |

**Subir o teto de novo — rejeitado, com o número que matou.** `D-69` subiu 12.000 → 16.000 com o
argumento *"o pool acabou"*. O pool não tinha acabado: havia 1.536 de duplicata que aquela sessão
não mediu, porque avaliou "virar ponteiro" em vez de "sair da tabela". Subir de novo, cinco
sessões depois, repetiria a conta sobre a mesma medição incompleta. E para o **CONTEXT** subir é
pior ainda: é o único orçamento que toda sessão paga, e `A-13` já mediu que, generalizado, o teto
*"deixa de ser restrição"*.

## 7. Prioridade (valor × P ÷ custo)

| # | proposta | valor | P | custo | veredito |
|---|---|---|---|---|---|
| 1 | tirar a duplicata dos três registros | alto — desbloqueia as três escritas | 0,85 | 1 sessão de documentação, zero código | **ADOTADA** (`D-74`) |
| 2 | `A-21`: cobrar o teto de 2 frases por script | alto — é a inclinação, não o intercepto | 0,45 | mexe no `check.py`; portão em §8 | **para o dono** |
| 3 | subir qualquer um dos três tetos | baixo | 0,10 | nenhum imediato; some a restrição | **REJEITADA** (§6) |

## 8. Portão de `A-21`, escrito ANTES do experimento

- **Critério:** uma checagem nova no `check.py` reprova linha de `D-NN`/`QA-NN` acima de **400**
  caracteres medidos (mediana 308 + uma folga; `D-67`/`D-68` passam, `D-71`..`D-73` reprovariam).
- **Isolar o efeito:** uma mudança por vez — só o limite por linha, sem tocar nos três tetos.
- **Limiar de decisão:** medido em **3 sessões de escrita** seguidas, a média por sessão cai de
  **+638** para **≤ +400** no registro. Acima disso, o limite por linha não foi a causa.
- **O que não pode regredir:** nenhuma decisão perde evidência — o que sai da linha entra em
  `e_qa/<slug>.md` (é o que `D-67`/`D-68` já fizeram), e `check.py` continua com os avisos
  existentes, sem checagem nova falando por outra.
- **Custo completo:** `check.py` sai outra vez do sha do kit (pedágio já pago em `D-50`, sem custo
  novo) · o docstring "14 falhas / 12 avisos" muda · as linhas vivas acima de 400 **não** são
  reescritas — append-only vale, e a regra passa a valer da próxima linha em diante.

## 9. O que o dono roda para conferir

```bash
python scripts/check.py
```

Esperado: **`OK` sem nenhum aviso de orçamento** — os três abaixo do aviso pela primeira vez desde
2026-08-12. Nenhum ID pode sumir: as checagens 10 e 11 são as que provam isso, e elas ficam
verdes. O sandbox do agente é indicativo; o portão é o que roda na máquina real.
