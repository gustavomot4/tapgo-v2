---
tags: [nota, evolucao, registro]
status: atual
---
# A-13 — as três saídas, medidas (sessão de evolução, 2026-08-12)

> **Esta nota não decide.** `A-13` é decisão do dono: muda um portão do kit, não um módulo
> do jogo. Aqui estão os números que a escolha precisa, e o método para conferi-los.
>
> **Nada foi escrito no registro nesta sessão** — ele está em FALHA (12.614/12.000), e
> escrever nele é exatamente o que não passa no portão. O custo disso está no fim.

## Método (tudo repetível na máquina do dono)

Medições no repositório real, não de memória. O sandbox do agente roda `python3`; o
`check.py` do projeto é **byte a byte igual** ao do kit v13.1 (sha256 conferido contra o
`.kit-manifest`), então o comportamento medido aqui é o da máquina do dono.

- Tamanho por seção e por linha: leitura direta do `c_decisions.md`.
- Curva de crescimento: `git show <commit>:<caminho>` em **todos** os 29 commits que
  tocaram o registro, medindo o arquivo inteiro em cada um.
- Custo de cada saída: aplicada de fato numa cópia do vault, com o `check.py` rodado
  depois — e, quando a saída mexe no script, com os **30 testes do kit** rodados.

## 1. O estado de hoje

| | chars | % do arquivo |
|---|---|---|
| cabeçalho + frontmatter | 741 | 5,9% |
| **Decisões (D-NN)** — 28 linhas, média 195 | 5.700 | 45,2% |
| **Questões (Q-NN)** — 11 linhas, média 170 | 1.986 | 15,7% |
| **Achados de QA (QA-NN)** — 13 linhas, média 304 | 4.187 | 33,2% |
| **total** | **12.614** | teto 12.000 — **FALHA** |

O `check.py` reprova com uma linha só: `c_decisions.md acima de 12.000 caracteres`.

**Segunda frente, não citada em `A-13`:** o `a_context_source.md` está em **3.701/4.000**,
já acima do aviso de 3.600 e a **299 da FALHA**. `A-11` o deixou em 3.542. Qualquer saída
que peça uma linha nova no Mapa de leitura do CONTEXT gasta desse saldo.

## 2. A premissa de `A-13` que a medição derrubou

`A-13` abre com *"o arquivamento acabou"*. **Depende de qual leitura de `D-43` está em
vigor, e as duas diferem em 4.254 caracteres.**

`D-43` diz: *sai da tabela quem nenhum `.md` vivo cita* — e `A-12` acrescenta que essa é
*"a régua do próprio `check.py`"*. Só que o `check.py` roda `sem_codigo()` antes de
procurar citação: ele apaga **todo trecho em crase** antes de olhar. E a convenção do kit
é escrever ID em crase.

Conferido num caso concreto — o `c_backlog.md` escreve:

> `...morta da sessão de evolução, e `D-42`, portão de `A-08`. **Folga curta...`

`check.py` enxerga `D-42` citado nesse arquivo? **Não.** Está em crase.

| leitura de `D-43` | pool arquivável | registro depois | status |
|---|---|---|---|
| **letra** — a régua do `check.py`: crase não prende | 20 linhas / **4.668** | **7.946** | abaixo do aviso de 9.600 |
| **espírito** — qualquer menção prende | 3 linhas / **414** | **12.200** | **ainda em FALHA** |

Pela letra, saem `D-06`..`D-08`, `D-31`, `D-32`, `D-36`..`D-45`, `D-49`, `QA-05`, `QA-06`,
`QA-13`, `QA-14`. Pelo espírito, saem `D-07`, `D-31`, `D-32` — e `D-07` é uma das
REJEITADAS que `A-09` e `A-12` preservaram **de propósito**, por serem a lista-morta que a
sessão de evolução varre. Retirá-la cega esta fase. O pool honesto do espírito é **327**.

**Isto é `Q-NN`, não escolha do agente** (regra 6): a régua é ambígua e a ambiguidade vale
4.254 caracteres, que é a diferença entre *"nenhuma saída funciona"* e *"ainda cabe uma
passagem inteira"*. `A-10` já tinha achado uma régua ambígua da mesma família — o teto de
"2 frases por linha" — e parou pelo mesmo motivo.

## 3. A curva, medida

29 commits tocaram o registro em 4 dias de trabalho (06, 07, 08 e 12 de agosto; 09 a 11
sem commit).

- **23 sessões escreveram:** soma +15.560, média **+677**, mediana **+436**.
- **6 passagens de arquivamento:** soma −5.903. As três deliberadas foram `A-09` (−2.621),
  `A-10` (−539) e `A-12` (−2.483) — **uma sessão inteira cada**.
- **Regime pós-`A-12`** (08-08 em diante, 13 sessões de escrita): média **+484/sessão**.
- **Por dia ativo, no regime atual:** 08-08 rendeu +1.786 e 08-12 rendeu +1.423 →
  **≈ 1.605 por dia ativo**.
- **Dias ativos:** 4 em 7 corridos → **≈ 17 dias ativos em 30 corridos**.

**Projeção de 30 dias: ≈ 27.300 caracteres de crescimento** (banda 24.000–33.000 conforme
a âncora: dia ativo recente, mediana por sessão, ou média pós-`A-12`).

> **Limite declarado desta projeção:** ela mede um projeto de 7 dias na sua fase mais
> intensa — E-1 a E-4 fecharam todas nessa janela. É plausível que a taxa caia num projeto
> maduro, mas **não há dado de fase madura**, e supor a queda seria inventar número. A
> projeção é o que a medição sustenta, não o que se espera.

### O diagnóstico de `A-13` sobre QA: certo em proporção, empatado em valor absoluto

| seção | início → hoje | multiplicador | crescimento pós-`A-12` |
|---|---|---|---|
| D-NN | 1.605 → 5.700 | 3,6× | **+1.343** |
| Q-NN | 537 → 1.986 | 3,7× | **−188** |
| QA-NN | 386 → 4.187 | **10,8×** | **+1.473** |

QA cresce mais rápido em proporção — `A-13` está certo. Mas **no regime atual, D-NN cresce
quase o mesmo em valor absoluto** (+1.343 contra +1.473). Isso importa para a saída (a):
tirar QA do arquivo remove 4.187 de uma vez, e deixa para trás uma curva que continua
subindo a ~578/dia ativo.

## 4. As três saídas, com custo medido

### (a) QA vai para `a_context/d_qa.md`

**Aplicada de fato numa cópia.** Sem tocar no `check.py`, o portão reprova assim:

```
ID citado que não existe em a_context/c_decisions.md: QA-04 (em a_context/a_context_source.md,
a_context/d_qa.md); QA-05 (em a_context/d_qa.md); QA-06 ...
```

Duas causas somadas: (1) `definidos` sai **só** do `c_decisions.md`, então todo `QA-NN`
citado em qualquer lugar vira fantasma; (2) o arquivo novo **não** está na lista de
exceções do varredor, então as próprias definições dele contam como citação órfã. Mais o
aviso `Tema em a_context/ fora do Mapa de leitura do CONTEXT: d_qa`.

**Patch mínimo que faz passar — escrito e rodado:** 17 linhas tocadas, 8 de lógica nova
(constante `QA_REG`; orçamento próprio para o arquivo novo; `definidos` lendo os dois
arquivos; `qa_reg` na exceção do varredor; guarda `if texto_dec or texto_qa`; `d_qa` no
`NUCLEO_CONTEXTO`). Com ele, **30/30 testes do kit verdes**.

**Custo completo, e é aqui que ele mora:**

- O `check.py` do projeto é **cópia rastreada do kit v13.1** — o `.kit-manifest` guarda o
  sha256 dele, e o `new_project.py --upgrade` usa esse hash para distinguir *"arquivo
  intocado"* de *"o dono customizou isto"*. Patch local ⇒ o arquivo vira "customizado" e
  **nunca mais recebe correção do kit**. O cabeçalho do `check.py` é um catálogo de
  correções caras (UTF-8 em Windows pt-BR, worktree, `core.hooksPath`, varredura de
  segredo que detectava 0 de 8). Abrir mão delas é o custo escondido de patchar local.
- O caminho limpo é subir a mudança **para o kit** — outro repositório: `check.py` +
  cabeçalho do docstring + `README.md` (a frase *"julga 26 deles (14 reprovam, 12 avisam)"*
  vira 28 / 15 / 13) + rodar os 30 testes + re-vendorizar aqui. Isso é **release de kit**,
  não sessão de projeto. E muda o kit para **todo projeto**, inclusive os que não têm
  volume de QA.
- Uma linha no Mapa de leitura do CONTEXT, que está a 299 da FALHA.

**Folga projetada:**

| | hoje | teto | folga | dura |
|---|---|---|---|---|
| `c_decisions.md` (D+Q) | 8.427 | 12.000 | 3.573 | 6,2 dias ativos ≈ **11 dias corridos** |
| `d_qa.md` com teto de 6.000 | 4.187 | 6.000 | 1.813 | 2,5 dias ativos ≈ **4 dias corridos** |
| `d_qa.md` **sem** teto | 4.187 | — | ∞ | sobrevive aos 30 dias |

O teto de 6.000 que eu mesmo escrevi no patch **falha antes do registro de hoje**. Sem
teto, a saída não é "dividir o orçamento": é **isentar do orçamento justamente o registro
que mais cresce**. Pode ser a resposta certa — mas tem de ser dita com essas palavras.

**P(passar): 0,25.** Conserta a estrutura de verdade, e é a única das três que ataca a
causa nomeada. Mas paga o custo mais alto (release de kit), e a medição mostra que a curva
que sobra (D-NN a +1.343 pós-`A-12`) reprova o arquivo principal em 11 dias.

### (b) Subir o teto de 12.000/9.600

**Aplicada de fato:** 12.000→20.000 e 9.600→16.000 são **4 substituições de constante**.
**30/30 testes do kit verdes.** O cabeçalho do docstring não muda (continuam 14 falhas e
12 avisos), então o `README.md` e a asserção que o cobra ficam intactos. É, de longe, a
mudança mais barata de escrever.

**Mas não é "barata" no sentido que `A-12` registrou.** Ela mexe no `check.py`, logo paga
**exatamente o mesmo pedágio de manifesto** da saída (a): patch local congela o script
contra upgrades do kit; caminho limpo é release de kit. A diferença entre (a) e (b) não é
"caro contra barato" — é 8 linhas de lógica contra 1 constante, **com o mesmo pedágio**.

**Folga projetada:**

- Teto de 20.000: folga 7.386 ÷ 1.605 = 4,6 dias ativos ≈ **8 dias corridos**.
- Para cobrir os 30 dias projetados (≈27.300 a partir de 12.614), o teto teria de ir a
  **≈ 40.000** — 3,3× o de hoje. Nesse ponto ele deixa de ser restrição: um registro de
  40.000 caracteres não cabe mais numa sessão de evolução, que é a fase que o lê **inteiro**.
  O teto existe por causa dessa fase; afrouxá-lo até 30 dias é removê-lo.

**P(passar): 0,30 como paliativo, 0,05 como solução.** É honesta para destravar `T-17b`
hoje; é desonesta como resposta a `A-13`, e o próprio card já dizia *"não muda a curva"* —
a medição confirma e põe número: 8 dias.

### (c) Aceitar a folga curta e arquivar a cada 2 sessões

**Custo de script: zero.** Nenhum toque no `check.py`, nenhum desvio de manifesto. É a
única das três que não abre a questão do fork. Todo o custo é recorrente e humano.

**Folga projetada — e ela depende inteiramente da leitura de `D-43` (seção 2):**

- **Pela letra:** uma passagem leva 12.614 → **7.946**. Folga até a FALHA: 4.054 ÷ 1.605 =
  2,5 dias ativos ≈ **4 a 5 dias corridos**. Depois dessa passagem o pool está **vazio** —
  as 20 linhas eram tudo. A segunda passagem não tem de onde tirar, e o ciclo "a cada 2
  sessões" precisa devolver ~800 caracteres por ciclo (2 × 401) de um pool zerado.
- **Pelo espírito:** pool de 414 (327 sem cegar a lista-morta). A passagem leva a
  **12.200** — **acima de 12.000**. A saída **não destrava nem o commit de hoje**.

E o pool não se regenera: uma linha só se solta quando **nenhum** `.md` vivo a cita, e a
tendência medida é a oposta — o `c_backlog.md` prende **45 dos 49 IDs** (contados pela
leitura do espírito), porque toda tarefa fechada cita no seu bloco de fecho os IDs que
fechou. O `check.py` já isenta `d_history/`, `e_qa/`, `docs/` e `d_agent_learnings`; a
seção **"Feito"** do backlog é histórico em tudo menos na localização, e tratá-la como tal
soltaria mais 4 linhas (554 chars: `D-09`, `D-10`, `Q-01`, `Q-02`). É pouco — não muda o
veredito, e fica registrado só para o dono não ter de medir de novo.

**P(passar): 0,15 pela letra, 0,00 pelo espírito.** Pela letra compra uma passagem e ~5
dias; pelo espírito é aritmeticamente impossível hoje.

## 5. O que `A-13` exige de qualquer saída, e que nenhuma das três é

`A-13` fecha dizendo que **qualquer** saída precisa normalizar o padding no `check.py` ou
medir só o texto das células — senão o problema volta no próximo `Ctrl+S`. Isso é uma
quarta mudança, e ela foi medida à parte.

**Aplicada de fato:** uma função `medida()` de 8 linhas que tira o espaço de alinhamento
das células antes de contar. **30/30 testes do kit verdes.**

- O registro de hoje, **já normalizado à mão**, mede **12.054** sob essa regra — ganho
  imediato de **560** caracteres (o `| ` de cada célula), e ainda 54 acima do teto.
- O valor real não é o ganho: é que o `Ctrl+S` do dono passa a custar **0** em vez dos
  ~2.270 que 18% (a proporção que `A-13` mediu: +2.048 em 11.470) representam sobre 12.614.
  **2.270 caracteres são 1,4 dia ativo de escrita** — apagados por um atalho de teclado.

**P(passar): 0,55** — a mais alta das quatro, e a única cuja medição não é ambígua. Mas
**não é suficiente sozinha**: remove a *instabilidade* do teto, não a *inclinação* da
curva. Continua faltando responder o que `A-13` pergunta.

## 6. Prioridade

Valor × P ÷ custo, com o custo medido, não estimado:

| # | mudança | valor | P | custo medido | folga em 30 dias |
|---|---|---|---|---|---|
| 1 | responder qual leitura de `D-43` vale (`Q-NN`) | alto | — | **zero** — é uma frase do dono | move o pool em **4.254** |
| 2 | normalizar o padding no `check.py` | alto | 0,55 | 8 linhas · 30/30 verdes · pedágio de manifesto | tira 2.270 de perda por `Ctrl+S` |
| 3 | (b) subir o teto | baixo | 0,30 | 1 constante · 30/30 verdes · pedágio de manifesto | **8 dias** a 20.000 |
| 4 | (a) QA em arquivo próprio | médio | 0,25 | 8 linhas de lógica · release de kit · linha no CONTEXT | **11 dias** (e 4 no arquivo novo) |
| 5 | (c) arquivar a cada 2 sessões | baixo | 0,15 / 0,00 | zero de script · 1 sessão por passagem | **5 dias**, ou não destrava hoje |

## 7. Achados que precisam de ID e não couberam no registro

O registro está em FALHA: **nenhum destes pôde ser escrito**. É o mesmo impasse que
`A-13` descreve no fim do próprio card, agora com três ocorrências novas.

- **`Q-NN` (do dono, regra 6):** qual leitura de `D-43` vale — a letra (crase não prende,
  pool 4.668) ou o espírito (qualquer menção prende, pool 414)? A resposta muda qual das
  três saídas é sequer possível.
- **`QA-NN` (deste projeto):** `A-12` registrou a régua de `D-43` como *"a régua do próprio
  `check.py`"*, e ela é bem mais frouxa do que aquela sessão supôs — `sem_codigo()` apaga
  as crases, e a convenção do kit escreve ID em crase. O corte de `A-12` foi medido contra
  uma régua que ninguém tinha lido até aqui.
- **`QA-NN` do KIT, fora do escopo desta sessão (regra 2):** `test_check.py` cobra a frase
  de cobertura do `README` contando os itens **numerados no docstring** do `check.py`, não
  as chamadas reais de `falhas.append`. Conferido: o patch da saída (a) acrescentou 1 falha
  e 1 aviso reais e a suíte seguiu **30/30 verde**. A frase que o kit chama de "a mais
  honesta" pode envelhecer em silêncio — exatamente o que ela existe para impedir. **Não
  consertado de carona:** é outro repositório.

## 8. O que o dono roda para conferir

Tudo abaixo roda na máquina real. O sandbox é indicativo, nunca portão.

```bash
# 1. o estado que trava o commit
python scripts/check.py

# 2. as duas leituras de D-43 (o número que decide) — cola no terminal
python - <<'PY'
import re,pathlib
raiz=pathlib.Path('.'); dec=raiz/'a_context/c_decisions.md'; t=dec.read_text(encoding='utf-8')
sc=lambda x: re.sub(r"`[^`\n]*`","",re.sub(r"```.*?```","",x,flags=re.S))
vivos={p:p.read_text(encoding='utf-8') for p in raiz.rglob('*.md')
       if p!=dec and not ({'.git','.obsidian','node_modules','d_history','e_qa','docs'}&set(p.parts))
       and p.stem!='d_agent_learnings'}
L={m.group(1):l for l in t.splitlines() if (m:=re.match(r'^\|\s*((?:D|Q|QA)-\d+)\s*\|',l))}
for rot,f in (("LETRA  ",sc),("ESPIRITO",lambda x:x)):
    src={p:f(v) for p,v in vivos.items()}
    livres=[(i,len(l)+1) for i,l in L.items() if not any(re.search(rf'\b{i}\b',v) for v in src.values())]
    print(f"{rot}: {len(livres)} linhas / {sum(n for _,n in livres)} chars -> registro ficaria em {len(t)-sum(n for _,n in livres)}")
PY

# 3. confirmar que o check.py daqui ainda é o do kit (se divergir, o pedágio já foi pago)
python -c "import hashlib,pathlib;print(hashlib.sha256(pathlib.Path('scripts/check.py').read_bytes()).hexdigest()[:16])"
findstr check.py .kit-manifest
```

O item 2 é o único que precisa rodar **antes** de escolher: ele produz o número que decide
se a saída (c) é possível. Os itens 1 e 3 confirmam o ponto de partida.

> **Custo declarado desta sessão:** zero caracteres no registro e zero no CONTEXT. A
> evidência inteira mora aqui, que é o que a regra 6 da skill manda fazer com evidência
> longa. Esta nota nasce **órfã** (nenhum `.md` a linka), o que gera aviso — não falha —
> no `check.py`; o link natural é o card de `A-13` no `c_backlog.md`, e escrevê-lo é da
> sessão que executar a escolha.
