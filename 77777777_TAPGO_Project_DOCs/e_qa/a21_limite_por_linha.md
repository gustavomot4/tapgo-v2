---
tags: [nota, evolucao, registro]
status: atual
---
# A-21 — o teto por linha, auditado contra o próprio portão (sessão de evolução, 2026-08-20)

> **Continuação de [[a20_tres_orcamentos]]**, cujo §8 escreveu o portão desta proposta ANTES do
> experimento. Esta nota não muda aquele portão: ela o roda contra o repositório de hoje e diz
> quais partes dele são executáveis e quais não são — com número, não com opinião.

## Método (repetível na máquina do dono)

Tudo medido no repositório real com a régua do próprio `check.py` (`medida()`, célula de tabela
sem o padding de alinhamento, `D-50`). A curva por sessão saiu de `git show <sha>:<arquivo>`,
commit a commit desde `af051a0` (o commit de `D-74`), nunca de estimativa.

## 1. O estado que abriu a sessão

| registro | medido | teto | folga | o que a folga compra |
|---|---|---|---|---|
| [[c_decisions\|DECISIONS]] | **15.982** | 16.000 | **18** | nada — nem a linha mais curta do arquivo (`D-77`, 166) |
| [[d_qa\|QA]] | 7.988 | 8.000 | 12 | nada |
| [[a_context_source\|CONTEXT]] | 3.937 | 4.000 | 63 | uma linha de estado curta |

O QA foi destravado nesta sessão sem decisão nova: `D-74` já mandava tirar da tabela viva o achado
FECHADO, e havia quatro (`QA-22`, `QA-23`, `QA-25`, `QA-26`, os dois últimos já confirmados em
campo). Íntegra no arquivo, ponteiro no cabeçalho, **2.558** líquidos — o QA voltou para 5.430 e
só então esta sessão conseguiu registrar `QA-29` e `QA-30`.

O registro **não** tem esse recurso, e é por isso que ele é o assunto.

## 2. As três obstruções medidas do portão de §8

### 2.1 O experimento não cabe no orçamento que ele pretende consertar

O limiar de §8 é *"a média por sessão cai para ≤ +400 em **3 sessões de escrita** seguidas"*. Três
sessões de escrita custam, no melhor caso do próprio portão, ~1.200 caracteres. Há **18**. O
experimento exige exatamente o espaço cuja falta ele existe para explicar: é conserto de
**inclinação** atrás de um **intercepto** esgotado, e nessa ordem não roda.

### 2.2 A checagem, como escrita, reprova 18 linhas vivas que o portão proíbe reescrever

`400` medidos, aplicado aos dois registros hoje:

| registro | linhas acima de 400 | quais |
|---|---|---|
| DECISIONS | **9** | `D-62` 460 · `D-65` 580 · `D-70` 411 · `D-71` 622 · `D-72` 779 · `D-73` 922 · `D-75` 978 · `D-76` 479 · `D-80` 513 |
| QA | **9** | `QA-20` 407 · `QA-21` 479 · `QA-22` 453 · `QA-23` 456 · `QA-24` 437 · `QA-25` 771 · `QA-26` 906 · `QA-27` 515 · `QA-28` 461 |

O mesmo §8 diz que linha viva acima de 400 **não** é reescrita (append-only). Então a checagem
nasce vermelha em 18 linhas que ninguém pode consertar: portão que não pode ficar verde não é
portão, é ruído que ensina a ignorar o script. Falta o mecanismo de **isenção congelada** — e ele
não está escrito em lugar nenhum do card.

### 2.3 O limiar é aritmeticamente inalcançável pelo mecanismo que o propõe

400 por **linha** não produz ≤ 400 por **sessão** em nenhuma sessão que escreva duas linhas — e
sessão de duas decisões é a norma aqui (`D-75`+`D-76`, `D-78`+`D-79`). Medido: aplicando o teto de
400 retroativamente às 6 sessões de escrita desde `D-74`, a média cairia de **+535** para **+407**
por sessão. Passa perto e **reprova** — pelo mecanismo estar certo, não errado.

Pior: o baseline de **+638** que o card usa é de antes de `D-74` e já não descreve o presente. A
curva observada desde então é **+535/sessão**, e por linha o custo caiu de **683** (média de
`D-70`..`D-73`) para **438** (média de `D-75`..`D-81`, mediana **374**) sem que script nenhum
existisse. Medir 3 sessões contra 638 credita ao script uma queda que já aconteceu: é comparação
sem controle, e a hipótese rival tem nome e é plausível — as linhas encolheram **contra a parede**
(`D-77` 166, `D-78` 319, `D-81` 238 foram escritas com o registro em 15,9k).

## 3. O que a proposta acerta, e que nenhuma das três obstruções toca

O mecanismo é o único que ataca a causa, e ele já está provado **neste** registro: quando a linha
delega a evidência a uma nota, ela custa 141 (`D-67`), 175 (`D-68`), 374 (`D-79`), 238 (`D-81`);
quando não delega, custa 922 (`D-73`) ou 978 (`D-75`).

E há um efeito que o card não reivindicou, medido aqui: **o teto por linha é o que refaz o pool de
corte de `D-74`**. Das 13 linhas vivas acima de 350 no registro, exatamente **duas** (`D-63`,
`D-79`) apontam para uma nota; as outras 11 **são** a íntegra. Por isso os três pools estão em
zero ao mesmo tempo — `D-43` (o script confirma, 3ª vez), duplicata (gasta por `D-74`) e o
critério do próprio `D-74` (nada a cortar, porque nada foi delegado). Sem delegação, o registro
nunca mais terá o que arquivar; com ela, volta a ter.

## 4. Lista-morta percorrida (regra 1)

| ideia | onde morreu | continua morta? |
|---|---|---|
| arquivar pelo critério de `D-43` | `A-13`, `A-16`, `A-20` | **sim** — pool ZERO pela 4ª vez, agora impresso pelo próprio `check.py` |
| `ARQUIVADO` vira ponteiro puro | `A-16` (i), 788 | **sim** — substituída por `D-74`, e o pool dela foi gasto |
| REJEITADAS para arquivo próprio | `A-16` (ii), 821 | **sim** — custaria a lista-morta que esta seção acabou de varrer |
| comprimir a prosa das linhas antigas | `A-20` §6 | **sim** — append-only, e o portão de `A-20` veda prosa comprimida |
| subir o teto do registro | `A-13` (b) P=0,05; **rejeitada em `A-20` §6, P=0,10** | **volta com ângulo novo — ver §5.2** |
| partir o registro em dois arquivos (como `D-50` fez com o QA) | — | **rejeitada aqui**: o teto existe pelo contexto que a fase de evolução carrega, e dois arquivos carregados juntos custam o mesmo. Esconde o número, não o paga |

## 5. As duas linhas que esta sessão deixa prontas — e não pode escrever

Cabem 18 caracteres no registro. Uma linha de decisão custa ~300. **Esta auditoria não consegue
registrar o próprio veredito**, que é a demonstração mais curta de que o intercepto vem primeiro.
Os rascunhos abaixo já obedecem o teto que propõem (≤ 400 medidos).

### 5.1 `A-21` reparado (o que muda em relação ao §8)

1. **Isenção congelada, não reescrita:** a checagem reprova linha acima de 400 **exceto** as 18 já
   vivas, nomeadas por ID numa tupla no `check.py`. Visível no diff, não some com o tempo, e
   append-only fica intacto. Verificado contra o disco de hoje: com a isenção, o script fica
   **verde na hora**.
2. **Limiar observável, não médio:** cai o "≤ +400/sessão em 3 sessões" (§2.3) e entra o que a
   checagem de fato cobra — **das próximas 10 linhas de `D-NN`/`QA-NN`, todas ≤ 400 medidos, e
   nenhuma perde evidência** (o que sai entra em `e_qa/<slug>.md`, como `D-67`/`D-68`/`D-79` já
   fizeram). É a regra, não uma média que a aritmética já reprovou.
3. **O 400 morde diferente nos dois registros, e isso é declarado:** no DECISIONS a mediana viva é
   **280** (o teto é folga); no QA é **437** (o teto é corte). Mesma regra, dois preços — e o preço
   do QA é a nota em `e_qa/` por achado grande, que `QA-25`/`QA-26` já pagaram de qualquer jeito.
4. **Custo completo, corrigido:** ~15 linhas no `check.py` e 1 falha nova no docstring (**15 → 16
   falhas**, e a linha 25 do README com ela). O card dizia *"o docstring `14 falhas / 12 avisos`
   muda"* — essa frase não está no docstring, está na **linha 70 do README** e já estava velha:
   é o `QA-29` registrado nesta sessão. O kit segue fora do sha original (pedágio pago em `D-50`).

### 5.2 O intercepto — decisão do dono, e ela vem primeiro

`A-20` rejeitou subir o teto (P=0,10) com um número que era certo e **hoje foi gasto**: *"havia
1.536 de duplicata que aquela sessão não mediu"*. `D-74` mediu e gastou; esta sessão gastou o
resto no QA. O ângulo novo exigido pela regra 1 é este, e é aritmético: **os três pools do
registro estão em zero simultaneamente**, e é a primeira vez que isso é verdade depois de medido
(§3). Não há corte que compre a próxima decisão.

O custo tem de ser dito inteiro: **subir o teto é rejeição adiada**. `D-69` comprou 7,5 sessões e
entregou 5. A 438/linha, 4.000 de teto novo compram ~9 decisões; a ≤ 350 com o teto por linha
valendo, ~11. O que faz a corrida parar não é o número do teto, é a linha passar a delegar — ou
seja, o item 5.1. Por isso os dois andam juntos, e por isso o "uma mudança por vez" do §8 **não**
se perde: com o limiar do item 2 (conformidade por linha, direto), não há efeito médio para
atribuir, logo não há confusão a proteger. O que se perde é a chance de responder *"o teto por
linha foi a causa da queda da curva?"* — pergunta que, medida como estava, já não tinha controle
(§2.3).

### 5.3 As duas linhas, prontas para colar (medidas: 329 e 363 — ambas ≤ 400)

O número `20.000` é do dono; o resto da linha não muda com ele. As duas entram no MESMO commit em
que o teto do `check.py` sobe, senão o portão reprova o commit que o conserta. Com elas o registro
fica em **16.676**, e o aviso novo (18.000) não dispara.

```
| D-82 | 2026-08-20 | ADOTADO · SUPERSEDE D-69 no número | `A-21`: o teto do registro sobe de 16.000 para **20.000** (aviso 18.000) — os TRÊS pools estão em zero ao mesmo tempo, medido, e nem o veredito de `A-21` coube | É rejeição adiada e o prazo é declarado: ~9 decisões a 438, ~11 se `D-83` valer. Números em [[a21_limite_por_linha]] |
| D-83 | 2026-08-20 | ADOTADO | `A-21` reparado: `check.py` reprova linha de `D-NN`/`QA-NN` acima de **400** medidos, com as 18 vivas isentas por ID congelado; o que sai da linha entra em `e_qa/<slug>.md` | Portão: das próximas 10 linhas, todas ≤ 400 e nenhuma perde evidência. O §8 de [[a20_tres_orcamentos]] reprovou como escrito — 3 números em [[a21_limite_por_linha]] |
```

## 6. Prioridade (valor × P ÷ custo)

| # | proposta | valor | P | custo | veredito |
|---|---|---|---|---|---|
| 1 | corte de `D-74` no QA (4 fechados) | alto — destrava a escrita de achado | — | zero: decisão já adotada | **FEITO nesta sessão**: 7.988 → 5.430 |
| 2 | `A-21` **reparado** (§5.1) | alto — é a inclinação, e é o que refaz o pool de `D-74` | **0,55** — mecanismo medido no próprio registro (141/175/238/374 quando delega), custo baixo, sem perda de evidência | ~15 linhas no `check.py`, docstring e README | **para o dono** |
| 3 | subir o teto do registro (§5.2) | alto e curto — é o que deixa a próxima decisão existir | 0,70 | rejeição adiada: ~9–11 decisões de prazo | **para o dono, e primeiro** |
| 4 | `A-21` **como escrito** no §8 | — | **0,00** | — | **REPROVADO por falta de dado e por aritmética** (§2) |
| 5 | partir o registro em dois arquivos | baixo | 0,05 | esconde o custo de contexto | rejeitada (§4) |

## 7. O que o dono roda para conferir

```bash
python scripts/check.py
```

Esperado agora: **um aviso a menos** — o QA sai da lista (5.430 + as duas linhas novas = 6.141,
abaixo do aviso de 6.400). Continuam de pé o CONTEXT em 98% e o DECISIONS em 99%, que é
exatamente o que o §5.2 põe na mesa do dono.

Para conferir a §2.2 na sua máquina, o mesmo comando com o argumento do vault também serve; o
número por linha sai da régua `medida()` do `check.py`, e as 9 linhas do DECISIONS estão na tabela
acima com o valor de hoje. O sandbox do agente é indicativo; o portão é o que roda na máquina real.
