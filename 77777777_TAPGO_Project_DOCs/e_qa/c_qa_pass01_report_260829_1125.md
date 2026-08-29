---
tags: [qa, revisao]
status: atual
---
# Passagem de guardrails 01 — o corte de `D-74` nos dois scripts (260829 1125)

> Passagem **dirigida**: o alvo era `QA-27`, não o repositório inteiro. As 12 frentes da skill
> foram percorridas com o recorte declarado no §4 — quem não foi exercitada está nomeada lá.
> Nada foi consertado. Os dois achados abaixo esperam autorização do dono.

## 1. A premissa do pedido não se sustenta: `arquivar.py` já honra `D-74`

O pedido dizia que `scripts/arquivar.py` "oferece como candidata uma linha REJEITADA". **Ele não
oferece.** O portão pedido passa hoje, sem nenhuma alteração:

```
python scripts/arquivar.py
  → REJEITADAS preservadas (lista-morta, use --incluir-rejeitadas para soltar):
    D-06, D-07, D-08, D-39, D-40, D-41, D-76, D-78, D-79, D-92
  → Candidatas (3): D-84, D-86, D-95   ← todas ADOTADO

python scripts/arquivar.py --incluir-rejeitadas
  → Candidatas (11): D-06 D-07 D-08 D-40 D-41 D-78 D-79 D-84 D-86 D-92 D-95

python scripts/check.py  → 0 falhas, 2 avisos (D-64 e `microservice-sync`, ambos anteriores)
```

O guarda está em `scripts/arquivar.py`, na linha `if "REJEIT" in status and not
INCLUIR_REJEITADAS`, e o docstring já escreve o porquê. Ele chegou junto com a própria flag —
não há o que alinhar ali.

## 2. `QA-27` é real, e mora onde a própria linha dele diz: `scripts/check.py`

A linha de `QA-27` em [[d_qa|QA]] nomeia `scripts/check.py`. É onde o defeito está: no ramo
`CANDIDATAS == "nao_citadas"` (`scripts/check.py:425-434`), o aviso de 90% do teto lista quem
nenhum `.md` "vivo" cita **sem nenhum guarda de `REJEITADO`**.

**Reprodução (cópia do vault no scratchpad, original intocado):**

1. `.kit-config.json`: teto de `c_decisions.md` de `20000` para `18000`, para acender o aviso de
   90% (a medida real é 17.327).
2. `sed -i 's/D-92/D-XX/g' e_qa/registro_no_teto.md` — a **única** citação viva de `D-92`.
3. `python scripts/check.py`

**Observado:** `a_context/c_decisions.md com 17327/18.000 caracteres (96%) — arquive as antigas
[…]. Candidatas: D-92.`
**Esperado por `D-74`:** `D-92` é REJEITADA; ela é a lista-morta e não pode ser oferecida.

Sem o passo 2 o aviso imprime `NENHUMA` — e é exatamente isso que a coluna "Correção" de `QA-27`
chama de **proteção por acidente de citação**. A tabela abaixo mede esse acidente: das 10
REJEITADAS vivas, **8 só escapam do `check.py` porque uma nota de `e_qa/` as menciona**, e
`e_qa/` é justamente o que `arquivar.py` exclui do critério.

| REJEITADA | Quem a segura no `check.py` | Quem a segura no `arquivar.py` |
|---|---|---|
| `D-06` `D-07` `D-08` | 7-8 notas de `e_qa/` | **ninguém** |
| `D-39` | `b_plan.md` + 9 notas de `e_qa/` | `b_plan.md` |
| `D-40` `D-41` `D-78` `D-79` | só `e_qa/` e `d_agent_learnings` | **ninguém** |
| `D-76` | `d_qa.md` + 4 notas de `e_qa/` | `d_qa.md` |
| `D-92` | **uma** nota: `e_qa/registro_no_teto.md` | **ninguém** |

Agravante documental: o comentário de `scripts/check.py:306-312` declara que `nao_citadas` existe
porque o padrão `mais_antigas` "num projeto que preserva as REJEITADAS de propósito, aponta
justamente para elas". O remédio anunciado não remedia — `nao_citadas` também não as pula. E o
padrão do kit é pior por escrita explícita: `scripts/check.py:438` casa
`(?:ADOTADO|REJEITADO)`, ou seja, **oferece REJEITADA de propósito**.

## 3. Achado novo: uma régua em cada script para o mesmo critério de `D-43`

`D-43` diz "sai da tabela quem nenhum `.md` **vivo** cita". Os dois scripts discordam do que é
"vivo", e a divergência não está declarada em lugar nenhum:

| | `arquivar.py` (`notas_vivas`) | `check.py` (`_vivos`, l. 425-431) |
|---|---|---|
| `d_history/` | exclui | exclui |
| `e_qa/` | **exclui** (`HISTORICAS`) | **conta como citação** |
| `e_qa/backlog_archive.md` | exclui | **conta** — arquivo declarado "Somente leitura" |
| `b_process/d_agent_learnings.md` | exclui | conta |
| `docs/` | exclui | conta |

O caso mais claro é `e_qa/backlog_archive.md`: é destino de arquivamento, cabeçalho declarando
"**Somente leitura**", e no `check.py` ele mantém `D-06`, `D-07`, `D-08`, `D-40`, `D-41`, `D-78` e
`D-79` "vivas". Arquivo morto ressuscitando linha é o oposto do que `D-43` mede. Registrado como
**`QA-43`**, separado de `QA-27` porque a correção de `QA-27` ("pular quem está REJEITADO") não
toca nisto.

## 4. As 12 frentes, com o recorte declarado

| Frente | Resultado |
|---|---|
| 1 correção/invariantes | percorrida nos dois scripts — o `medida()` e o corte de 90% batem; nada novo |
| 2 ausente vs zero | percorrida — `id_do_card` devolve `None` de propósito, e o pool vazio do `check.py` imprime "NENHUMA" em vez de cair no padrão. Corretos |
| 3 dinheiro/unidade | **n/a** — o kit não calcula dinheiro |
| 4 data/fuso | percorrida — `date.today().isoformat()` nos dois; sem fuso envolvido |
| 5 segurança | `check.py --historico-completo` verde; `git grep` por chave/segredo só acha os comentários de `check.py:663-666` que **descrevem** o padrão. Limpo |
| 6 erros silenciosos | **achado do §3**: o `check.py` não engole exceção, mas engole a diferença de critério |
| 7 concorrência | **n/a** — script de linha de comando, uma passagem |
| 8 integração externa | percorrida — `git ls-files` com `timeout=20` e `except` que cai no `rglob`. Correto |
| 9 produção × validação | **frente do achado**: o portão que roda (`check.py`) e a ferramenta que executa (`arquivar.py`) medem coisas diferentes |
| 9b vazamento | **n/a** |
| 10 bordas de UI | **n/a** — sem tela nesta passagem |
| 11 doc × comportamento | **dois achados**: o comentário de `check.py:306-312` promete um remédio que o código não entrega (§2); e o pedido desta sessão apontava o arquivo errado (§1) |
| 12 cruft/entrega | percorrida em `scripts/` e `e_qa/` — nenhum `.bak`, `_old` ou duplicado; nenhum estado numérico novo duplicado |

**O que não deu para verificar aqui:** o aviso de 90% do `check.py` **não acende no vault real**
(17.327 de 20.000 = 86%). A reprodução do §2 precisou baixar o teto numa cópia. Quem confirma na
máquina real é o dono, e o caminho honesto não é editar o teto: é rodar a reprodução na cópia do
scratchpad, ou esperar o registro passar de 18.000 — momento em que a ferramenta começa a
oferecer a lista-morta sozinha, sem ninguém pedir.

## 5. Placar

| Severidade | Quantidade |
|---|---|
| Crítico | 0 |
| Alto | 0 |
| **Médio** | **2** — `QA-27` (confirmado, realocado) e `QA-43` (novo) |
| Baixo | 0 |

Nenhum bloqueante de entrega: a v2.0.0 já saiu e nenhum dos dois toca o produto. Os dois são
bloqueantes do **próximo corte de registro** — seguir a ferramenta apagaria a lista-morta.

## 6. Comparação com a passagem anterior

Não há passagem de `guardrails-review` anterior neste vault (`e_qa/` só tem os dois relatórios de
`artifact-consistency` de 2026-08-07). O laço de 3 passagens da skill não se aplica ainda.

## 7. Veredito

**Não fecha `QA-27` nesta sessão** — e não por falta de trabalho: o conserto não cabe no escopo
que o dono abriu. O pedido autorizou alinhar `scripts/arquivar.py`, que já está alinhado; o
defeito está em `scripts/check.py`, que é o portão de toda sessão. Pela regra 2 do `CLAUDE.md`
("precisa mexer em outro? pare e avise"), a passagem para e avisa.

**O conserto, quando autorizado, é de uma linha** — em `scripts/check.py`, dentro do ramo
`nao_citadas`, filtrar a lista `velhas` por status, do mesmo jeito que `arquivar.py` faz:
descartar a linha cujo 3º campo casa `REJEIT`. `QA-43` é maior e é decisão, não conserto: alinhar
o `_vivos` do `check.py` ao `HISTORICAS` do `arquivar.py` muda o que o aviso oferece em qualquer
projeto do kit, e isso pede `D-NN`.
