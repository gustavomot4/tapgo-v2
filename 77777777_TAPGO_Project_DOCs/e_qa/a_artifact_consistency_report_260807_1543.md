---
tags: [dev, evidencia, revisao]
status: atual
---
# Relatório de consistência entre artefatos — T-03 (Fase 1c)

- **Data:** 2026-08-07 15:43 (-03)
- **Skill:** `artifact-consistency` (`b_process/skills/artifact-consistency/SKILL.md`)
- **Artefatos lidos:** `a_context/a_context_source.md` · `a_context/b_plan.md` · `b_process/c_backlog.md` · `a_context/c_decisions.md`
- **Consultados para verificar citação:** `a_context/regras_partida.md` · `a_context/licenciamento.md` · `a_context/online_p2p.md` · `b_process/e_repository_standard.md` §3 · `b_process/skills/`
- **Estado do repositório na leitura:** commit `6fee0fc`, árvore limpa
- **`scripts/check.py`:** verde, com um aviso — `a_context/a_context_source.md` em 3779/4.000 (94%)
- **Sessão somente leitura.** Nenhum dos quatro artefatos foi alterado. Este arquivo é a única escrita.

> **Ainda não linkado a partir do DECISIONS.** A skill proíbe escrever nos quatro artefatos, então
> nenhum `QA-NN` foi aberto. Se o dono quiser os achados no DECISIONS, é a sessão de conserto que
> abre as linhas e aponta para cá.

## Sobre os IDs deste relatório

A primeira entrega deste relatório (só no chat) numerou os achados com os prefixos `C-`, `A-`, `M-` e
`B-` por severidade. Foi erro: **`A-NN` já é o namespace das ações do dono no BACKLOG** (`A-01`..`A-04`),
e `M-NN` se lê como os módulos `M1`..`M9`. Aqui os achados usam um namespace único, `AC-NN`
(*artifact-consistency*), sequencial, com a severidade em coluna própria.

| ID antigo (chat) | ID válido |
|---|---|
| C-01 · C-02 · C-03 | `AC-01` · `AC-02` · `AC-03` |
| A-01 · A-02 · A-03 · A-04 · A-05 · A-06 · A-07 | `AC-04` · `AC-05` · `AC-06` · `AC-07` · `AC-08` · `AC-09` · `AC-10` |
| M-01 · M-02 · M-03 · M-04 · M-05 · M-06 · M-07 · M-08 | `AC-11` · `AC-12` · `AC-13` · `AC-14` · `AC-15` · `AC-16` · `AC-17` · `AC-18` |
| B-01 | `AC-19` |

`e_qa/` é pasta histórica e é isenta da checagem de IDs do `check.py` — `AC-NN` aqui não quebra o script
e não colide com `D-NN`/`Q-NN`/`QA-NN`/`T-NN`/`A-NN`.

---

## 1. Achados

### CRÍTICO

#### `AC-01` — "Custo R$ 0" não tem portão, e o TURN não tem dono
- **Passagem:** 3 (restrição inegociável sem portão)
- **Onde:** `a_context/a_context_source.md` L13 × `a_context/b_plan.md` L229 (portão de M9), L190-191 (M6)
- **O quê:** o portão de M9 verifica `tsc`/`build` verdes, bundle < 8 MB, ausência de 404 e ausência de
  segredo versionado. Nenhum desses reprova a entrada de um serviço pago ou de uma dependência que peça
  cartão. E o caso concreto já está no plano: 15-30% dos jogadores atrás de CGNAT não conectam sem
  **relay TURN** (`a_context/online_p2p.md` L23-29), e TURN não aparece no contrato de M6, nem no portão
  de M6, nem em tarefa alguma do BACKLOG — só como prosa em "Onde a stack vai doer" (L191).
- **Recomendação:** (a) item no portão de M9 — toda dependência de runtime e todo endpoint externo
  listado, com a confirmação de que a camada usada é gratuita e não exige cartão; (b) TURN vira item
  explícito do contrato de M6, ou fica declarado fora de escopo no portão de E-4, com a consequência
  escrita (quantos % ficam sem online).

#### `AC-02` — "Nenhuma marca de terceiro" só é verificada onde há bandeira
- **Passagem:** 3
- **Onde:** `a_context/a_context_source.md` L14 × `a_context/b_plan.md` L200 (portão de M7); portões
  existentes em L144 (M4) e L240 (E-5); `a_context/licenciamento.md` L32-38 e L44-49
- **O quê:** a restrição tem portão em M4 (bandeira: ISO válido, arquivo local, linha de procedência,
  zero escudo) e em E-5 (nome do torneio fora da lista-morta). **M7 é o módulo que desenha jogador,
  goleiro, uniforme e todo texto de tela** — exatamente os itens 2 e 4 da lista-morta de `licenciamento`
  ("nome, apelido, rosto ou número de jogador real"; "reprodução de uniforme oficial identificável") — e
  o portão de M7 não tem uma única linha de licença. `licenciamento` L45 exige linha na tabela de
  procedência para **todo** arquivo em `assets/`, não só bandeira. O primeiro asset não-bandeira entra
  em E-3 (T-10); a única varredura ampla é E-6, três etapas depois.
- **Recomendação:** replicar no portão de M7 a linha de procedência que M4 já tem, com escopo `assets/`
  inteiro, e um item explícito de "zero uniforme identificável, zero jogador real".

#### `AC-03` — "Sem analytics de terceiro" não tem portão em módulo nenhum
- **Passagem:** 3
- **Onde:** `a_context/a_context_source.md` L15 × `a_context/b_plan.md` L128 (M3), L198-200 (M7), L229 (M9)
- **O quê:** a restrição de dado pessoal é verificada só em pedaços e por acidente: M3 grepa
  `localStorage` dentro de `src/cpu/`, e M7 **declara** que `localStorage` guarda só preferências, mas o
  grep do portão de M7 cobre import de motor, não conteúdo de `localStorage`. Nada em portão nenhum
  verifica ausência de script de rastreio de terceiro ou de chamada a endpoint externo. "Sem conta" é
  estrutural (`D-01`, sem backend) e não precisa de portão; "sem analytics" precisa e não tem.
- **Recomendação:** um item no portão de M9 — zero `<script>` de origem externa no HTML publicado e zero
  endpoint externo em runtime fora da sinalização de M6.
- **Observação adjacente (não é achado, é lacuna a declarar):** WebRTC expõe o IP de cada par ao outro
  por construção. `online_p2p.md` não declara isso em lugar nenhum. Não viola "nenhum dado pessoal
  **coletado**" — nós não coletamos — mas é a única propriedade de privacidade não declarada do projeto.

### ALTO

#### `AC-04` — E-2 exige regressão de 6 defeitos; os portões cobrem 5
- **Passagem:** 5 (contradição entre artefatos)
- **Onde:** `a_context/b_plan.md` L237 (portão de E-2) × L89 (M1) e L113 (M2);
  `a_context/regras_partida.md` L26-34
- **O quê:** o portão de E-2 pede "regressão dos **6** defeitos da v1". A soma dos portões de módulo dá
  cinco: defeito 3 em M1 (`int(3)` com o 0 incluso) e defeitos 1, 2, 4 e 5 em M2. O defeito 6
  (`idPartida` calculado no cliente — colide entre abas e é forjável) só tem parente no `roomId` de M6,
  que é **E-4**. Como está escrito, **E-2 não fecha**: pede um teste que nenhum módulo dela pode ter.
- **Recomendação:** ou o portão de E-2 passa a dizer 5 e o defeito 6 entra no portão de M6, ou a
  regressão do defeito 6 é reescrita como invariante de M2. Escolher uma; hoje o texto pede as duas.

#### `AC-05` — o portão de M7 proíbe o import que o contrato de M5 obriga
- **Passagem:** 5 e 7 (contradição · contrato subespecificado)
- **Onde:** `a_context/b_plan.md` L200 (portão de M7) × L152-164 (porta de entrada de M5, em especial L161)
- **O quê:** o portão de M7 exige que `grep` por import de `engine`, `cpu` ou `net` dentro de `src/ui/`
  retorne zero. Mas a assinatura publicada por M5 é
  `subscribe(fn: (s: MatchState, link: LinkStatus) => void): () => void` — e a porta de M5 **não
  reexporta** `MatchState` (de M2/`src/engine`) nem `LinkStatus` (de M6/`src/net`). Para tipar esse
  callback, `src/ui/` tem de importar dos dois módulos proibidos. O contrato e o portão se anulam, e quem
  implementar M7 vai descobrir isso com o portão vermelho na mão.
- **Recomendação:** a porta de M5 reexporta `MatchState` e `LinkStatus` (`export type { MatchState } from
  '../engine'`, idem `LinkStatus`). O grep continua válido e passa a significar o que quer dizer: a UI não
  alcança a *lógica* do motor.

#### `AC-06` — o plano pede para congelar duas decisões que não existem em lugar nenhum
- **Passagem:** 5
- **Onde:** `a_context/b_plan.md` L248-249 × `a_context/c_decisions.md` (tabela de decisões) e
  `b_process/c_backlog.md`
- **O quê:** o plano lista como "decisões que este plano pede para congelar" o **runner de teste**
  (proposta: Vitest, "precisa existir antes de E-2") e **onde mora o `index.html`** (proposta: `root:
  'src'`, "precisa decidir antes de E-1"). Nenhuma das duas é `D-NN`, nenhuma é `Q-NN`, nenhuma é tarefa.
  **Todo** portão de módulo depende de suíte de teste — e a suíte não tem dono, não tem card e não tem
  linha no DECISIONS.
- **Recomendação:** duas linhas `D-NN` no congelamento de T-02 (é o caminho barato: são propostas, não
  perguntas), ou duas tarefas antes de E-1 e E-2.

#### `AC-07` — o plano levanta uma terceira pergunta aberta que o CONTEXT e o DECISIONS não conhecem
- **Passagem:** 5
- **Onde:** `a_context/b_plan.md` L254 × `a_context/a_context_source.md` L43 ×
  `a_context/c_decisions.md` L33-39
- **O quê:** o plano pergunta "o torneio é só contra a CPU, ou também online?" e responde ele mesmo o
  tamanho do estrago: se for online, M8 passa a depender de M5 no modo `online` e o chaveamento vira
  estado compartilhado entre dois aparelhos — **muda a camada 3 do plano**, não um detalhe. O CONTEXT L43
  diz "Questões abertas: Q-03, Q-04" e o DECISIONS não tem essa linha. Pergunta que só vive no plano é
  invisível para a fonte única de estado, e ninguém vai lembrar de respondê-la.
- **Recomendação:** registrar como `Q-05` no DECISIONS ("o torneio roda também no modo online?", decidir
  antes de E-5), refletir em "Questões abertas" do CONTEXT e prender a uma ação do dono.

#### `AC-08` — `Q-04` trava T-11 e nenhuma ação do dono a responde
- **Passagem:** 5 (regra da skill: `Q-NN` aberta vira achado quando uma tarefa depende dela para começar)
- **Onde:** `b_process/c_backlog.md` L14 (`A-04`) × L28 (`T-11`) ×
  `a_context/a_context_source.md` L42 × `a_context/b_plan.md` L239 (E-4)
- **O quê:** `A-04` diz "responder Q-03" — só Q-03. Mas `Q-04` trava E-4 (portão de E-4: "E-3 fechada
  **e** `Q-04` respondida") e trava `T-11`, e o CONTEXT L42 confirma ("Q-04 trava a E-4"). Não existe
  ação do dono que responda Q-04, então **T-11 não tem rota de desbloqueio**.
- **Recomendação:** separar em `A-04` (Q-03) e `A-05` (Q-04), ou alargar o texto de `A-04` para as duas.

#### `AC-09` — a taxa de conexão é medida, mas nenhum número reprova
- **Passagem:** 4 (critério sem número)
- **Onde:** `a_context/a_context_source.md` L35 × `a_context/b_plan.md` L239 (portão de E-4) ×
  `a_context/c_decisions.md` L30 (gatilho de `D-01`) × `a_context/online_p2p.md` L31-32
- **O quê:** o critério de aceite do CONTEXT é "taxa de conexão medida em rede móvel real, com fallback
  declarado quando falha". O portão de E-4 exige só que o número exista e seja registrado ("número, não
  adjetivo"). Os **70%** existem, mas como **gatilho de revisão de `D-01`** — e gatilho reabre uma
  decisão, não reprova uma etapa. Como está escrito, uma taxa medida de 20% fecha E-4: o número foi
  medido e registrado, o portão passou.
- **Recomendação:** levar o número para dentro do portão de E-4 — abaixo de X%, E-4 não fecha — e manter
  o gatilho de `D-01` como o efeito separado que ele é. `online_p2p.md` L32 já diz "sem esse número, o
  modo online não é aceito"; falta dizer **qual** número aceita.

#### `AC-10` — a regra "identificador em inglês" não vem do padrão citado, e o próprio plano a quebra
- **Passagem:** 5 e 6 (contradição · deriva)
- **Onde:** `a_context/b_plan.md` L71 × `b_process/e_repository_standard.md` §3; violações em L83, L98, L122
- **O quê:** o plano afirma "Nomes de arquivo **e identificador** em inglês; conteúdo de doc em português
  — é o que o padrão do repositório já manda [Fonte: `b_process/e_repository_standard.md#3-nomes-de-arquivo`]".
  A §3 rege **nomes de arquivo** e diz o oposto sobre código: *"Código segue a convenção da linguagem,
  não esta"*. A citação não sustenta a regra. E o plano quebra a própria regra nos próprios contratos, que
  é o que outro agente vai copiar literalmente:
  - L83 — `int(limiteExclusivo: number)`
  - L98 — `type Phase = 'regular' | 'alternadas' | 'encerrada'`
  - L122 — `type Level = 'facil' | 'medio' | 'dificil'`
- **Recomendação:** decidir uma das duas e aplicar inteira. Se a regra fica, corrigir os três; se cai,
  remover a alegação de L71 e a referência ao padrão. Meio-termo é como a v1 chegou a `fezGOl`.

### MÉDIO

#### `AC-11` — o contrato de M5 está partido em duas tarefas, e a segunda está marcada como M6
- **Passagem:** 1 (cobertura módulo → tarefa: marcação existe ≠ marcação correta)
- **Onde:** `b_process/c_backlog.md` L26 (`T-09`) e L28 (`T-11`) × `a_context/b_plan.md` L239 (E-4)
- **O quê:** `T-09` cobre M5 nos modos `cpu` e `local`. O modo `online` de M5 está dentro de `T-11`, que
  é marcada **`Módulo: M6`** — o portão de E-4 confirma que a etapa entrega "M6 + M5 (`online`)". O
  `check.py` cruza `### M5 —` com `**Módulo:** M5`, encontra `T-09` e passa; nada no quadro diz quem
  termina M5.
- **Recomendação:** `T-11` marcada como `M6 + M5(online)`, ou dividida em duas tarefas.

#### `AC-12` — as telas do torneio não têm tarefa nem portão
- **Passagem:** 1
- **Onde:** `a_context/b_plan.md` L36 (M7 importa M8), L238 (E-3), L240 (E-5) ×
  `b_process/c_backlog.md` L27 (`T-10`) e L29 (`T-12`)
- **O quê:** M7 importa M8 e recebe "o chaveamento por M8" (L195), mas `T-10` (M7) é **E-3** e M8 só
  existe em **E-5**. O desvio de ordem está justificado no plano (L67), o que falta é a consequência: o
  portão de E-5 lista "M8 + catálogo real" e nada de tela, e `T-12` é `backend-dominio` — lógica de
  chaveamento, não cena. **Ninguém constrói a tela do torneio.**
- **Recomendação:** uma tarefa de M7-torneio em E-5 (skill `frontend-uiux`) e o item correspondente no
  portão de E-5.

#### `AC-13` — o histograma da CPU funde dois papéis
- **Passagem:** 7 (contrato que não passa no teste do planejador)
- **Onde:** `a_context/b_plan.md` L120-124 (porta de M3) × `a_context/regras_partida.md` L41
- **O quê:** `Cpu` expõe um `observe(zone)` e um `pick()`. Mas a CPU alterna entre **cobrar** e
  **defender**, e as zonas que o jogador escolhe para chutar não são a mesma distribuição das que ele
  escolhe para defender. Um histograma só as lê como uma. `regras_partida` L41 diz apenas "histórico de
  zonas do jogador na sessão" e não resolve a ambiguidade. Quem implementar lendo só o contrato escolhe
  um dos dois comportamentos, e o portão de M3 (frequência ≤ 70%) passa nos dois casos.
- **Recomendação:** dizer no contrato se o histograma é por papel (dois) ou compartilhado (um) — e se for
  compartilhado, dizer que é deliberado.

#### `AC-14` — o plano alarga `Q-03` além do que o DECISIONS pergunta
- **Passagem:** 5
- **Onde:** `a_context/b_plan.md` L218 e L253 × `a_context/c_decisions.md` L38
- **O quê:** o plano trata `Q-03` como bloqueando "número de participantes, **formato do chaveamento** e o
  nome do torneio". O texto oficial de `Q-03` no DECISIONS é "quantas e quais seleções entram, e qual o
  nome do torneio". O dono respondendo exatamente o que está escrito **não** desbloqueia o formato de M8
  — e o portão de M8 tem um `[a confirmar: mata-mata simples]` esperando justamente isso.
- **Recomendação:** alinhar o texto de `Q-03` no DECISIONS ao escopo que o plano lhe dá, antes de `A-04`
  ser respondida.

#### `AC-15` — quatro `[a confirmar]` no plano, nenhum registrado como `Q-NN`
- **Passagem:** 5 (CLAUDE.md regra 6: regra de negócio ambígua vira `Q-NN`)
- **Onde:** `a_context/b_plan.md` L56, L145, L190, L219
- **O quê:**

  | Linha | Lacuna | Onde dói |
  |---|---|---|
  | L56 | chaveamento sobrevive a reload? | muda o dono do estado (memória → `localStorage`) |
  | L145 | origem das bandeiras | licença precisa existir **antes** de o arquivo entrar no repo |
  | **L190** | timeout de conexão: quantos segundos | **está dentro do portão de M6** |
  | **L219** | "mata-mata simples" | **está dentro do portão de M8** |

  Lacuna declarada é correta e não é achado — mas duas delas estão **dentro de portão**, e portão com
  campo em branco não é avaliável: ninguém sabe dizer se passou.
- **Recomendação:** promover L190 e L219 a `Q-NN` (ou resolvê-las no congelamento de T-02, que é mais
  barato: L190 é escolha técnica, não regra de negócio). L145 pertence a `Q-03`/`A-04`; L56 pode esperar E-5.

#### `AC-16` — o BACKLOG cita skills que não existem como pasta
- **Passagem:** 6
- **Onde:** `b_process/c_backlog.md` L17, L21, L23, L24, L25, L26, L29, L32 × `b_process/skills/`
- **O quê:** três nomes citados não existem no disco — são apelidos em português:

  | No BACKLOG | Pasta real |
  |---|---|
  | `consistencia-artefatos` (L17) | `artifact-consistency` |
  | `backend-dominio` (L21, L23, L24, L25, L29) | `backend-domain` |
  | `planejador` (L32) | `planner` |

  `iac-docker-terraform`, `frontend-uiux`, `microservice-sync` e `backend-bff` estão corretos. O CLAUDE.md
  proíbe isto nominalmente ("a pasta é o nome; não invente apelido em português"), e o PLANO faz certo —
  link para a pasta real com alias de exibição (ex. L88: `[[b_process/skills/backend-domain/SKILL|backend-dominio]]`).
- **Recomendação:** nome da pasta, ou a forma link+alias que o PLANO já usa.

#### `AC-17` — a mesma entidade com três nomes
- **Passagem:** 6
- **Onde:** `a_context/a_context_source.md` L14 × `a_context/b_plan.md` L131, L137, L92, L147, L219
- **O quê:** dois conceitos com nomes concorrentes:
  - **time / seleção / `Team`** — o CONTEXT diz "identidade de **time**", o PLANO e o BACKLOG dizem
    "catálogo de **seleções**", o contrato declara `interface Team` e `listTeams()`.
  - **partida / disputa** — L92 "Motor da **disputa**", L147 "Sessão de **partida**", L219 "o torneio
    termina em exatamente N-1 **partidas**". No código, os dois viram `Match`.

  Barato agora; caro no schema, nos testes e no texto de tela, que é onde a escolha vira visível.
- **Recomendação:** um termo por conceito, declarado uma vez em `b_process/f_glossary_and_primer.md`, que
  já existe para isso.

#### `AC-18` — "inteiro, nunca float" é comentário, não portão
- **Passagem:** 3 (representação obrigatória sem checagem)
- **Onde:** `a_context/a_context_source.md` L26 × `a_context/b_plan.md` L102 e L113 (portão de M2)
- **O quê:** o CONTEXT lista "placar e contadores em inteiro (nunca float)" entre as representações
  obrigatórias. No plano isso é um comentário na linha do campo (`// inteiro, nunca float`), e o portão de
  M2 não tem item que verifique. `number` do TypeScript aceita float sem reclamar, então nada reprova.
- **Recomendação:** uma linha no portão de M2 — todo valor de `goals` e `taken`, em toda transição,
  satisfaz `Number.isInteger`.

### BAIXO

#### `AC-19` — duas representações obrigatórias sem consumidor e sem declaração
- **Passagem:** 3
- **Onde:** `a_context/a_context_source.md` L26
- **O quê:** "datas UTC ISO-8601" e "arquivos UTF-8". Nenhum módulo do plano produz data em runtime
  (o único relógio é o timeout de M6, que não persiste nada), e nenhum portão trata encoding. Inofensivo
  hoje — o incômodo é que nem é verificado nem está declarado como não-aplicável.
- **Recomendação:** uma linha dizendo que o v2 não persiste data em runtime, ou tirar o item do CONTEXT
  quando ele for enxugado (ele está em 94% do orçamento).

---

## 2. Cobertura módulo → tarefa

| Módulo | Tem tarefa? | Tarefas | Portão declarado? |
|---|---|---|---|
| M1 — Núcleo | Sim | `T-04` (E-1) | Sim |
| M2 — Motor da disputa | Sim | `T-06` (E-2) | Sim — sem checagem de inteiro (`AC-18`) |
| M3 — CPU | Sim | `T-07` (E-2) | Sim — contrato ambíguo (`AC-13`) |
| M4 — Catálogo | Sim | `T-08` (E-3) | Sim |
| M5 — Sessão | **Parcial** | `T-09` (`cpu`/`local`); o modo `online` está em `T-11`, marcada M6 (`AC-11`) | Sim |
| M6 — Transporte P2P | Sim | `T-11` (E-4) | Sim — com `[a confirmar]` dentro (`AC-15`); TURN sem dono (`AC-01`) |
| M7 — Tela | **Parcial** | `T-10` (E-3); telas de torneio sem tarefa (`AC-12`) | Sim — sem licença (`AC-02`); conflita com M5 (`AC-05`) |
| M8 — Torneio | Sim | `T-12` (E-5) | Sim — com `[a confirmar]` dentro (`AC-15`) |
| M9 — Build e publicação | Sim | `T-05` (E-1; portão pleno em E-6) | Sim — sem custo (`AC-01`) nem analytics (`AC-03`) |

**Cobertura tarefa → módulo (passagem 2):** sem achado. `T-04`..`T-12` têm módulo; `T-02`, `T-03` e
`A-01`..`A-04` são tarefas de processo e de dono, sem módulo por natureza. Nenhuma tarefa órfã
introduzindo escopo.

## 3. Restrições inegociáveis × portão

| Restrição (`a_context/a_context_source.md` L12-16) | Portão que a verifica |
|---|---|
| Custo R$ 0 permanente; build estático | **SEM PORTÃO** — M9 prova estático, não gratuito; TURN sem dono (`AC-01`) |
| Nenhuma marca de terceiro | **PARCIAL** — M4 L144 e E-5 L240 cobrem bandeira e nome do torneio; M7 (uniforme, jogador, texto de tela) sem portão (`AC-02`) |
| Nenhum segredo versionado | **OK** — portão de M9 L229 + `scripts/check.py` |
| Nenhum dado pessoal coletado (sem conta, sem e-mail, sem analytics de terceiro) | **PARCIAL** — "sem conta" é estrutural (`D-01`); "sem analytics" **SEM PORTÃO** (`AC-03`) |
| Não inventar dado; lacuna declarada fica declarada | **PARCIAL** — `check.py` valida ID e link, M4/M8 declaram o bloqueio por `Q-03`; mas os quatro `[a confirmar]` do plano não viraram `Q-NN` (`AC-15`) |

## 4. Números

- Módulos: **9** · Tarefas de módulo: **9** · Módulos com tarefa: **9/9 (100%)**, dois com cobertura parcial
- Achados: **19** — CRÍTICO **3** · ALTO **7** · MÉDIO **8** · BAIXO **1**
- Restrições inegociáveis: **5** — portão pleno **1** · parcial **3** · sem portão **1**
- Critérios de aceite do CONTEXT: **6** — com comando ou número **5** · sem número de corte **1** (`AC-09`)

## 5. Portão de T-03

- [ ] Zero achados CRÍTICOS em aberto — **reprova** (`AC-01`, `AC-02`, `AC-03`)
- [x] Todo módulo do PLANO tem ao menos uma tarefa no BACKLOG — **passa** (9/9)
- [ ] Toda restrição inegociável tem um portão que a verifica — **reprova** (1 sem portão, 3 parciais)
- [ ] Todo critério de aceite é comando ou número — **reprova** (`AC-09`)

## 6. Veredito

**Não comece a implementar.**

O plano está estruturalmente são, e vale dizer onde: as camadas são acíclicas por construção e a
aciclicidade é conferível na coluna "Importa"; cada linha de estado tem um dono único; os portões de M1,
M2 e M3 têm número e comando de verdade; e nada no plano adota o que o DECISIONS rejeitou (`D-06`
Node/Express, `D-07` clubes e escudos, `D-08` Godot) — a passagem 5 não encontrou uma única reincidência.

O que falha é a borda. As três restrições que **não** são sobre o motor — custo, licença de asset
não-bandeira, privacidade — foram declaradas no CONTEXT e nunca viraram checagem em módulo nenhum. Some-se
a isso que o congelamento de T-02, do jeito que está, levaria junto três decisões sem registro (`AC-06`,
`AC-07`) e dois portões que não fecham como escritos (`AC-04`, `AC-05`).

Dos 19 achados, **17 são consertáveis sem o dono** — são edições de PLANO e BACKLOG. Só `AC-07` (texto de
`Q-05`) e `AC-14` (texto de `Q-03`) dependem de decisão dele.
