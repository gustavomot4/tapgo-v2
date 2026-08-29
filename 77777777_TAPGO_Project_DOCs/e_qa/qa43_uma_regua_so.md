---
tags: [nota, evolucao, registro]
status: atual
---
# `QA-43` — uma régua só para "vivo" (sessão de evolução, 2026-08-29)

> Fecha a decisão que a passagem de guardrails [[c_qa_pass01_report_260829_1125]] §3
> registrou e não consertou, e o que a sessão de `QA-27` deixou por escrito: *"alinhar o
> `_vivos` do `check.py` ao `HISTORICAS` do `arquivar.py` muda o aviso em qualquer projeto
> do kit — é `D-NN`, não conserto"*.
> **Esta sessão decide e não implementa** (limite da skill `evolution-auditor`).

## 1. Lista-morta percorrida (regra 1 da skill)

| Rejeitada | O que ela matou | Por que não segura esta proposta |
|---|---|---|
| `D-92` | "card fechado do backlog deixa de segurar linha de `D-NN`" | **É a vizinha mais próxima e o ângulo é outro.** `D-92` estreitava o que conta como citação DENTRO de um arquivo vivo, e morreu com o pool medido em **ZERO**. Aqui não se mexe em arquivo vivo nenhum: exclui-se pasta que o outro script já exclui, e o pool medido hoje é **3**, não zero |
| `D-39` · `D-79` | "compra o que X já dá de graça" | Não alcança: nada é comprado. Retira-se divergência, não se acrescenta contrato — o `arquivar.py` já paga esse custo desde que existe |
| `D-76` | "subir a constante não move o mecanismo" | Não é constante nem teto. É o critério que decide o que a constante mede |
| `D-06` `D-07` `D-08` `D-40` `D-41` `D-78` | domínio (backend, marca, engine, transporte) | Fora do assunto |

**Re-proposta?** Não. `QA-43` nasceu em 2026-08-29 de observação nova (a tabela do §3 do
relatório), e nenhum `D-NN` anterior decidiu o recorte de "vivo" do `check.py` — `D-43`
escreveu o critério em português e deixou dois scripts o implementarem sozinhos.

## 2. STEP 0 — o que foi observado no sistema real (não citado de memória)

Medido em `HEAD` = `5ebeaa6`, **antes** de esta nota existir (a lição de `QA-37`: o
instrumento varre a documentação, e escrever o ID move o número).

```
python scripts/arquivar.py
  -> Registro: 17851 caracteres
  -> REJEITADAS preservadas: D-06 D-07 D-08 D-39 D-40 D-41 D-76 D-78 D-79 D-92
  -> Candidatas (3), economia estimada de 1169 caracteres: D-84, D-86, D-95

pool do ramo `nao_citadas` do check.py, mesmo vault, mesmo instante:
  -> recorte de hoje  (`_vivos`, l. 425-431): 0 candidatas -> imprime "NENHUMA"
  -> recorte alinhado a `HISTORICAS`:         3 candidatas -> D-84, D-86, D-95
```

**Os dois números são o achado.** Alinhado, o `check.py` devolve **exatamente** a lista do
`arquivar.py` — mesmos três IDs, sem sobra nem falta. Hoje ele devolve o conjunto vazio e,
com ele, uma frase que não é um número menor e sim a **instrução oposta**:

> `NENHUMA — todo D-NN vivo e citado por algum .md, entao este corte esta esgotado e o peso
> nao esta mais em linha morta`

### 2.1 Por que isso não é cosmético

O registro está em **17.851/20.000 = 89,25%**. O aviso acende em 90%: **uma linha editada**.
Quando acender, ele dirá que o arquivamento está esgotado — e mandará o dono à única alavanca
que sobra, o teto. O teto é a saída **reprovada duas vezes** (§5.4 de [[registro_no_teto]],
e `D-82` declarada "rejeição adiada") e contra a qual `D-97` decidiu ontem: *"os quatro
orçamentos caem por arquivamento, não por poda de prosa nem por teto novo"*.

E isso **já aconteceu uma vez, no papel**: o changelog de 2026-08-08 registra o resultado
"nenhuma candidata: o corte por citação está esgotado, o que torna o teto, e não o
arquivamento, a próxima alavanca". A conclusão foi tirada do pool errado.

Portão que roda sozinho e contradiz a decisão do dia anterior é pior que portão ausente — é a
lição que o próprio `check.py` carrega escrita ("checagem que emudece é pior que checagem que
não existe").

### 2.2 O que o recorte de hoje conta como "vivo" e não é

Da tabela do §3 de [[c_qa_pass01_report_260829_1125]], com uma linha nova:

| | `arquivar.py` (`notas_vivas`) | `check.py` (`_vivos`) |
|---|---|---|
| `d_history/` | exclui | exclui |
| `e_qa/` | **exclui** | **conta** |
| `e_qa/backlog_archive.md` | exclui | **conta** — cabeçalho diz "Somente leitura" |
| `e_qa/decisions_archive.md` | exclui | exclui (por nome) |
| `b_process/d_agent_learnings.md` | exclui | **conta** |
| `docs/` | exclui | **conta** |
| bloco cercado | **descarta** (`sem_bloco_de_codigo`) | **conta** |

O caso que nomeia o achado: `e_qa/backlog_archive.md` é destino de arquivamento e sozinho
mantém **sete** REJEITADAS "vivas" no `check.py`. Arquivo morto ressuscitando linha é o
oposto do que `D-43` mede.

**A última linha é divergência nova, não estava no relatório.** Efeito medido hoje: **0** — os
três IDs do pool são os mesmos com e sem o descarte de bloco cercado. Ela entra no critério
por ser da mesma família e custar zero; **não** é justificativa de nada.

## 3. As frentes, priorizadas por valor × P ÷ custo

| # | Proposta | Valor | P(passar) | Custo | Veredito |
|---|---|---|---|---|---|
| **1** | `_vivos` do `check.py` adota o recorte de `HISTORICAS` (+ `d_agent_learnings`, + bloco cercado) | **Alto** — é o número que o portão automático imprime | **85%** | ~6 linhas, 1 arquivo | **ADOTADA** |
| **2** | O ramo `mais_antigas` (padrão do kit) deixa de casar `REJEITADO`, e pool vazio imprime NENHUMA em vez de "as mais antigas" | **Médio** — não roda neste projeto (`candidatas: nao_citadas`); roda em todo projeto que não configura | **70%** | ~3 linhas, mesmo arquivo | **ADOTADA** |
| **3** | Corrigir o comentário de `check.py:306-312`, que promete um remédio que o código não entregava | Baixo, mas é o que ensina o próximo leitor | **95%** | 1 comentário | **ADOTADA** |
| — | Extrair o recorte para um `scripts/_comum.py` importado pelos dois | Fecharia a divergência na máquina, não no comentário | — | Acopla dois scripts que hoje rodam avulsos; `check.py` copiado sozinho para outro projeto passa a quebrar | **REJEITADA** — custo maior que o defeito, e a trava barata é o teste do §5 |
| — | Acrescentar ao `check.py` uma checagem que compare os dois pools | Trava na máquina | — | Muda a contagem de `D-100` (38) e as duas listas do docstring | **REJEITADA** — a mesma trava cabe num teste, fora da contagem |

### Por que P(1) = 85% e não a taxa-base de 20–30%

A taxa-base pune proposta sem evidência. Esta tem as três coisas que a sobem, e elas foram
**colhidas**, não argumentadas: (a) o alvo do aviso é conhecido e verificável — 0 contra 3;
(b) o estado final também é, porque é a saída de um segundo programa que já roda
(`arquivar.py`), e não uma opinião sobre o que deveria sair; (c) a operação de arquivar não é
hipótese — `D-97` a executou anteontem com 11 linhas e o `check.py` verde.

O que **não** foi provado, e por isso não são 100%: que os dois recortes coincidem *em geral*.
A medida de hoje é um vault. É por isso que o portão do §5 compara as **saídas dos dois
programas**, e não um inteiro esperado.

### Por que P(2) = 70%

O contra-argumento é real e é a regra 8 da skill: **ganho medido num recorte não transfere.**
Este projeto usa `nao_citadas`; o padrão do kit não roda aqui, e mudar o padrão de outros
projetos com dado deste é o defeito que a skill cobra.

O que sustenta assim mesmo: não é ganho transferido, é **contradição interna do kit**, e ela
se lê sem sair do repositório. O `arquivar.py` preserva REJEITADA por padrão em **todo**
projeto, com `--incluir-rejeitadas` como escape; o `check.py`, no ramo padrão, oferece
REJEITADA por escrita explícita (`(?:ADOTADO|REJEITADO)`). Mesma ferramenta, mesmo `D-74`,
padrões opostos — e o padrão é o que roda em quem nunca abriu o `.kit-config.json`.

O risco declarado: um projeto que **não** trate REJEITADA como lista-morta perde a candidata
mais barata que tinha. Ele continua com a saída — `arquivar.py --incluir-rejeitadas` — e é a
mesma saída que o kit já lhe dava antes desta decisão.

## 4. O critério único (é isto que a decisão escreve)

> **O aviso do `check.py` só pode oferecer o que `python scripts/arquivar.py`, rodado sem
> flag, retiraria.**

Uma frase, e ela decide as três frentes de uma vez:

- **recorte de "vivo"** → o do `arquivar.py` (`HISTORICAS` = `d_history`, `e_qa`, `docs`; mais
  `d_agent_learnings`; mais o descarte de bloco cercado);
- **corte de status** → REJEITADA nunca é candidata, **nos dois** ramos de `candidatas`,
  porque sem flag o `arquivar.py` nunca a retira;
- **pool vazio** → imprime NENHUMA, nunca "as mais antigas", porque "as mais antigas" aponta
  para linha que a ferramenta se recusa a tirar.

Duas réguas para a mesma linha é o portão e a ferramenta discordando em silêncio — o
comentário do próprio `check.py` já dizia isso do corte de status; a decisão estende a frase
ao recorte de "vivo", que é a outra metade da mesma pergunta.

**O que a decisão NÃO faz:** não muda `D-43` (o critério em português continua o mesmo — o que
muda é uma das duas implementações passar a lê-lo como a outra); não muda o `arquivar.py`, que
já está do lado certo; não arquiva nada.

## 5. Portão, escrito ANTES do experimento

Uma mudança por vez, e o portão não é um inteiro esperado — é **a igualdade entre os dois
programas**, porque é ela que a decisão comprou.

**Antes de tocar no código, registrar a linha-base** (um `git stash` do `check.py` basta):

| Medida | Antes (hoje, `5ebeaa6`) | Depois (exigido) |
|---|---|---|
| Pool do aviso do `check.py`, ramo `nao_citadas` | `NENHUMA` | `D-84, D-86, D-95` |
| Candidatas do `arquivar.py` sem flag | `D-84, D-86, D-95` | **idênticas** — e iguais à linha acima |
| REJEITADA oferecida pelo aviso, nos **dois** ramos | ramo padrão: sim | **zero** |
| `python scripts/check.py` | exit 0, 2 avisos velhos (`D-64`, `microservice-sync`) | **exit 0, os mesmos 2** |
| `python e_qa/test_qa27.py` | exit 0 | **exit 0** |

**Como isolar o efeito:** o aviso de 90% não acende no vault real (89,25%). A reprodução é a
mesma de `QA-27` — cópia no scratchpad com o teto de `c_decisions.md` baixado para 18.000, o
original intocado. Baixar o teto no `.kit-config.json` de verdade **não** é caminho: mudaria a
variável que o portão mede.

**O que não pode regredir:** os dois avisos velhos continuam sendo dois (checagem que emudece);
`test_qa27.py` continua verde (o guarda de `D-74` no ramo `nao_citadas` é o que ele mede, e
esta decisão o amplia, não o substitui); nenhum `D-NN` deixa de ter destino — o
`arquivar.py --aplicar` copia a linha íntegra para [[decisions_archive]] com o ID preservado,
que é o que mantém resolvível o wikilink da nota de `e_qa/` que a citava.

**Trava contra a próxima divergência** (é o que substitui o `_comum.py` rejeitado): estender
`e_qa/test_qa27.py` — ou uma segunda prova ao lado dele — com um caso que roda os **dois**
scripts sobre o mesmo vault sintético e reprova se as duas listas diferirem. Sem ele, o que
impede a terceira régua é um comentário, e comentário já falhou uma vez aqui (§2.2).

## 6. Custo completo da adoção (regra 7 da skill)

| Item | Custo |
|---|---|
| Rebuild / bump de versão | **nenhum** — `scripts/` não entra no bundle e não é `src/` |
| Migração de dado | **nenhuma** — o script não escreve |
| Upgrade do kit | **nenhum novo**: o `check.py` saiu do sha do kit em `D-50` e já não recebe correção por upgrade |
| Contagem de `D-100` (38 checagens) | **intacta** — nenhuma checagem entra ou sai; muda o conteúdo de um aviso que já existe |
| Documentação | o comentário de `check.py:306-312` (frente 3), esta nota, a linha de `D-101`, o fecho de `QA-43` em [[d_qa]], o changelog |
| Efeito colateral **desejado** | o aviso passa a acender com 3 candidatas: quem esperava "esgotado" recebe 1.169 caracteres de trabalho real |

## 7. Veredito

**Aprovada — e é conserto de realidade, não feature** (regra 5 da skill: dívida que já morde
vem antes). O que se compra não é economia de caracteres: é o portão automático parar de
mandar o dono para a alavanca que duas decisões reprovaram, num arquivo que está a 0,75 ponto
percentual de acender o aviso.

**Reprovadas na mesma sessão, e ficam registradas:** o módulo comum entre os dois scripts
(acopla o que hoje roda avulso) e a checagem nova no `check.py` (mexe na contagem de `D-100`
para comprar o que um teste compra de graça).

**O que esta sessão não faz:** implementar. A skill decide; a execução é outra sessão, com o
portão do §5 na mão.
