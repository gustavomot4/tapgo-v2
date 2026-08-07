---
tags: [dev, evidencia, revisao]
status: atual
---
# Relatório de consistência entre artefatos — T-03, passagem 2

- **Data:** 2026-08-07 16:05 (-03)
- **Skill:** `artifact-consistency` (`b_process/skills/artifact-consistency/SKILL.md`)
- **Entrada:** [[a_artifact_consistency_report_260807_1543|relatório da passagem 1]] (`AC-01`..`AC-19`) + os artefatos corrigidos
- **Artefatos lidos:** `a_context/a_context_source.md` · `a_context/b_plan.md` · `b_process/c_backlog.md` · `a_context/c_decisions.md` · `a_context/stack.md` (novo) · `b_process/f_glossary_and_primer.md` §4 (vocabulário novo)
- **Consultados:** `a_context/regras_partida.md` · `a_context/licenciamento.md` · `a_context/online_p2p.md` · `b_process/e_repository_standard.md` §3
- **Estado do repositório:** HEAD em `6fee0fc`; alterações da revisão ainda **não commitadas**
- **`scripts/check.py`:** verde, **sem avisos** — o orçamento do CONTEXT saiu de 94% com a extração de [[stack]], e o relatório da passagem 1 deixou de ser nota órfã
- **Sessão somente leitura.** Nenhum artefato foi alterado. Este arquivo é a única escrita.
- **Continuidade de IDs:** os achados novos seguem a sequência da passagem 1 — `AC-20`..`AC-26`. Nenhum ID é reaproveitado.

---

## 1. Veredito primeiro

**O portão de T-03 passa nas quatro linhas.** Os 19 achados da passagem 1 fecharam — 18 por
correção, 1 por lacuna reformulada dentro da própria regra que o plano criou (`AC-15`). Não há
CRÍTICO em aberto.

A passagem 2 encontrou **7 achados novos**, nenhum CRÍTICO: 1 ALTO, 5 MÉDIO, 1 BAIXO. Um deles
(`AC-20`) é a mesma classe de defeito do `AC-05` da passagem 1, consertada pela metade — vale
fechar no mesmo commit do congelamento, porque custa uma linha agora e vira portão vermelho em
E-3 depois.

| Linha do portão de T-03 | Passagem 1 | Passagem 2 |
|---|---|---|
| Zero achados CRÍTICOS em aberto | ✗ (3) | **✓ (0)** |
| Todo módulo do PLANO com ao menos uma tarefa | ✓ (9/9, 2 parciais) | **✓ (9/9, 0 parciais)** |
| Toda restrição inegociável com portão que a verifica | ✗ (1 sem, 3 parciais) | **✓ (5/5)** |
| Todo critério de aceite é comando ou número | ✗ (1 sem número) | **✓ (6/6)** |

---

## 2. Verificação achado por achado — `AC-01`..`AC-19`

| ID | Severidade | Situação | Onde fechou (verificado) |
|---|---|---|---|
| `AC-01` | CRÍTICO | **FECHADO** | Portão-custo de M9 (`b_plan` L273: host no `dist/` fora da tabela reprova) · TURN ganhou dono e tipo em M6 (L215 `IceConfig`, L227 as duas saídas escritas) · tabela de custo em `stack` L34-46 · E-4 exige a decisão de TURN por escrito (L284) · E-6 exige a tabela sem linha em branco (L286). Virou `QA-01` |
| `AC-02` | CRÍTICO | **FECHADO** | Portão-licença de M7 (`b_plan` L240-243): `assets/` inteiro com linha de procedência, proibição de uniforme e jogador reais, e `grep -rniE` da lista-morta de [[licenciamento]] · E-3 passou a exigir procedência de todo asset novo (L283). Virou `QA-02` |
| `AC-03` | CRÍTICO | **FECHADO** | Portão-privacidade de M9 (`b_plan` L274): zero `<script>` externo, zero endpoint fora da sinalização e do relay de M6, nenhuma telemetria. Virou `QA-03` |
| `AC-04` | ALTO | **FECHADO** | E-2 agora diz "defeitos 1, 2, 4 e 5 em M2 e o 3 em M1 — o defeito 6 é de ID de sala e fecha em M6 (E-4)" (L282), e o portão de M6 trata o defeito 6 com a razão certa: o ID é gerado no cliente porque não há servidor, então nenhuma decisão de disputa deriva dele (L228). A soma dos portões volta a bater com a etapa |
| `AC-05` | ALTO | **FECHADO (parcialmente — ver `AC-20`)** | M5 reexporta `MatchState` e `LinkStatus` (L186-187), o portão de M5 cobra a reexportação (L204), M7 recebe os tipos pela porta de M5 (L233) e o `grep` de camada passou a ser cumprível (L239). Falta `Level` — achado novo |
| `AC-06` | ALTO | **FECHADO** | `D-11` (Vitest) e `D-12` (`index.html` em `src/`, `root: 'src'`, `outDir: '../dist'`) no DECISIONS L24-25; a seção "decisões a congelar" do plano caiu de 3 itens para 1 (L290-294) |
| `AC-07` | ALTO | **FECHADO** | `Q-05` no DECISIONS L42 · CONTEXT L42 lista as três questões · `A-06` no BACKLOG L16 · M8 declarado bloqueado por `Q-05` (L261) · E-5 exige `Q-03` **e** `Q-05` (L285) |
| `AC-08` | ALTO | **FECHADO** | `A-05` no BACKLOG L15, com portão próprio e a dependência escrita ("sem isso T-11 e T-13 não começam" — mas ver `AC-22`) |
| `AC-09` | ALTO | **FECHADO** | E-4 agora reprova por número: "taxa de conexão medida **≥ 70%** — abaixo disso E-4 não fecha, e o gatilho de revisão de `D-01` abre como efeito separado" (L284). A distinção entre reprovar etapa e reabrir decisão ficou explícita |
| `AC-10` | ALTO | **FECHADO, e a correção foi além do achado** | A citação ao padrão foi refeita e agora cita o que o padrão diz de verdade (L45-47, seção "Idioma dos nomes"). Os três identificadores que eu havia citado foram corrigidos: `maxExclusive` (L109), `'suddenDeath' \| 'finished'` (L124), `'easy' \| 'medium' \| 'hard'` (L151). **A revisão corrigiu também os quatro valores de `LinkStatus` que a passagem 1 não tinha listado** (`'aguardando'`, `'conectado'`, `'falhou'`, `'encerrado'` → L213) — minha varredura de identificadores foi incompleta e o conserto foi mais completo que o achado |
| `AC-11` | MÉDIO | **FECHADO** | `T-13` criada (BACKLOG L32) com `Módulo: M5`, etapa E-4; `T-11` voltou a ser só M6 (L31). M5 tem duas tarefas, uma por etapa, e nenhuma delas mente sobre o módulo |
| `AC-12` | MÉDIO | **FECHADO** | `T-14` — telas do torneio, `Módulo: M7`, E-5, skill `frontend-uiux` (BACKLOG L34) · E-5 passou a exigir "M8 + tela de torneio (M7) + catálogo real ... jogável de ponta a ponta por toque" (L285) · o desvio de ordem no plano agora diz que a tela segue o mesmo atraso e tem tarefa própria (L94) |
| `AC-13` | MÉDIO | **FECHADO** | `Role = 'kick' \| 'dive'`, `observe(role, zone)`, `pick(role)` (L151-156) · dois histogramas, com o porquê escrito e o teto de 70% valendo para cada um (L159) · o portão ganhou o teste que faltava: "o histórico de um papel não desloca a escolha do outro" (L161) · a tabela de donos de estado acompanhou (L57) |
| `AC-14` | MÉDIO | **FECHADO** | `Q-03` alargada no DECISIONS L40 para formato do chaveamento **e** origem das bandeiras, com prazos diferentes por parte (bandeiras antes de E-3, resto antes de E-5) · `A-04` acompanhou (BACKLOG L14) · M4 L176 e M8 L261 citam o escopo novo |
| `AC-15` | MÉDIO | **FECHADO** | Dos quatro `[a confirmar]`: timeout virou **20 s** com justificativa técnica (L228-229); "mata-mata simples" saiu do portão de M8, que agora se parametriza por `Q-03` (L262); a origem das bandeiras entrou em `Q-03`. O quarto (chaveamento sobrevive a reload) continua `[a confirmar em E-5]` mas **fora de portão**, na tabela de estado — exatamente o que a nova regra do plano permite (L75). Verificado por varredura: nenhuma linha `Portão:` contém `[a confirmar]`. Resíduo menor em `AC-26` |
| `AC-16` | MÉDIO | **FECHADO** | BACKLOG usa `artifact-consistency` (L19), `backend-domain` (L24, L26-28, L33) e `planner` (L37); o plano usa os mesmos nomes de pasta (L9, L114, L138, L160, L175, L260). Conferido contra `b_process/skills/`: os 7 nomes citados existem |
| `AC-17` | MÉDIO | **FECHADO** | Tabela de vocabulário em `f_glossary_and_primer` L282-299: um termo por conceito, com a coluna "não usar", e a separação explícita entre termo de domínio (português, doc e tela) e identificador (inglês). **As duas heranças ficaram declaradas em vez de silenciosas** — o nome do arquivo `regras_partida.md` e o "partida de ~1 minuto" da linha de objetivo do CONTEXT, ali como prosa e não como termo de arte. Varredura confirma: "partida" sobrevive só nas linhas 9 e 10 do CONTEXT, que é o que a exceção cobre. Novo item de vocabulário não coberto em `AC-25` |
| `AC-18` | MÉDIO | **FECHADO** | Portão de M2 L142: "todo valor de `goals` e `taken`, em toda transição, satisfaz `Number.isInteger` — teste de propriedade sobre sequências aleatórias com semente fixa, não inspeção visual" · replicado em E-2 (L282) · tabela de representações × portão (L81) |
| `AC-19` | BAIXO | **FECHADO** | Tabela de representações L84-85: datas viraram **não-aplicável declarado**, com a condição de reabertura escrita ("se algum módulo passar a persistir data, esta linha vira portão"); UTF-8 remetido ao `.gitattributes` e ao padrão do repositório |

**19/19 fechados.** Nenhum achado da passagem 1 foi fechado por reinterpretação da restrição —
os três CRÍTICOS ganharam checagem objetiva em módulo, que era a exigência.

---

## 3. Achados novos — `AC-20`..`AC-26`

### ALTO

#### `AC-20` — `Level` ficou de fora da reexportação, e é o tipo que M7 precisa para o modo `cpu`
- **Passagem:** 5 e 7 (contradição · contrato subespecificado). É a mesma classe do `AC-05`.
- **Onde:** `a_context/b_plan.md` L186-187 (reexportações de M5) × L191 (`SessionConfig.level?: Level`)
  × L151 (`Level` vive em `src/cpu`) × L239 (portão de camada de M7) × L236 (M7 guarda o nível da CPU)
- **O quê:** a correção do `AC-05` reexportou `MatchState` e `LinkStatus` pela porta de M5, e resolveu
  o conflito para esses dois. Mas `SessionConfig` tem um terceiro tipo de fora: `level?: Level`, e
  `Level` é de M3 — `src/cpu`, um dos três diretórios que o portão de M7 proíbe importar. E é M7 quem
  guarda **o nível da CPU** em `localStorage` (L236) e quem monta o `SessionConfig`. Quem implementar M7
  lendo só o contrato dele vai escrever `import type { Level } from '../cpu'`, que é o movimento natural
  e o que o plano acabou de decidir remover para os outros dois tipos.
- **Não é parede, é armadilha:** existe saída sem tocar no plano — `SessionConfig['level']` dá
  `Level | undefined` sem importar `src/cpu`. Mas ela não está escrita em lugar nenhum, e o critério de
  qualidade do próprio plano é "outro agente implementa um módulo lendo **só o contrato dele + o
  CONTEXT**" (L12). Um contrato que só funciona se o implementador adivinhar um truque de tipagem não
  cumpre esse critério.
- **Recomendação:** uma linha ao lado das outras duas —
  `export type { Level } from '../cpu';` — e acrescentar `Level` à cobrança do portão de M5 (L204), que
  hoje nomeia só `MatchState` e `LinkStatus`.

### MÉDIO

#### `AC-21` — `QA-01`..`QA-03` aparecem como corrigidos no DECISIONS e como abertos no CONTEXT
- **Passagem:** 5
- **Onde:** `a_context/a_context_source.md` L42 × `a_context/c_decisions.md` L49-53
- **O quê:** a tabela de QA do DECISIONS tem a coluna **Correção** preenchida para os três, descrevendo a
  correção como fato. O CONTEXT L42 diz "**QA aberto:** QA-01, QA-02, QA-03". A tabela não tem coluna de
  status nem de data de fechamento, então nada no DECISIONS distingue "corrigido no papel" de "verificado".
  As duas leituras são defensáveis e é justamente por isso que é achado: em duas semanas ninguém vai saber
  se aquela linha quer dizer que o conserto foi feito ou que ele foi conferido.
- **Verificação desta sessão:** os três estão de fato corrigidos no PLANO (ver §2). O que falta é o
  registro dizer isso.
- **Recomendação:** uma coluna `Status` (ou `Fechado em`) na tabela de QA, preenchida com a data e a
  passagem que verificou; e a linha do CONTEXT passa a refletir o que sobrou em aberto — que, depois desta
  passagem, é nada.

#### `AC-22` — `T-11` está bloqueada por `A-05`, mas nada em M6 depende de `Q-04`
- **Passagem:** 5 (a regra da skill: `Q-NN` aberta vira achado quando trava tarefa — aqui trava a mais)
- **Onde:** `b_process/c_backlog.md` L15 e L31 × `a_context/b_plan.md` L228 (portão de M6) e L205 (M5)
- **O quê:** `A-05` diz "sem isso `T-11` e `T-13` não começam". `Q-04` pergunta o que acontece com a
  **disputa** quando o peer some — quem vence, empata ou anula. Isso é regra de disputa: mora em M5, e o
  plano diz exatamente isso na linha de M5 (L205: "`Q-04` bloqueia o comportamento quando o peer some no
  meio"). O portão de M6 (L228) é `roomId` opaco, defeito 6, timeout de 20 s, resiliência com a sinalização
  derrubada e linha na tabela de custo — **nenhum desses depende de `Q-04`**. M6 não sabe o que é gol
  (L225), então não pode saber quem vence quando o peer some.
- **Efeito:** `T-11` fica parada esperando uma resposta que não muda uma linha do módulo dela, e E-4
  atrasa por sequenciamento, não por dependência. É o inverso do erro caro, mas continua sendo erro.
- **Recomendação:** `A-05` bloqueia só `T-13`. `T-11` sai de "bloqueada por A-05" e passa a depender só de
  E-3 fechada.

#### `AC-23` — a tabela de custo nomeia o TURN como primeira linha esperada, mas a sinalização do Trystero já é um endpoint de runtime
- **Passagem:** 5 e 7
- **Onde:** `a_context/stack.md` L41-43 × `a_context/c_decisions.md` L17 (`D-04`) ×
  `a_context/a_context_source.md` L24 × `a_context/online_p2p.md` L15-16
- **O quê:** a tabela está vazia com o marcador "TURN de M6 é a primeira linha esperada". Mas o TURN é
  hipotético — pode nem existir, se E-4 escolher a saída (b). O que **já** está decidido e frozen é `D-04`:
  Trystero, com sinalização sobre BitTorrent trackers, Nostr ou MQTT. Esses são hosts que o build publicado
  alcança em runtime, hoje, por decisão tomada — exatamente a definição que o portão de custo de M9 usa
  ("todo endpoint externo que o build publicado alcança", L273) e a mesma coisa que o portão de privacidade
  de M9 excetua nominalmente ("fora da sinalização e do relay de M6", L274).
- **Efeito:** a única linha que já poderia estar preenchida não está, e o marcador aponta para a errada.
  Como o portão de E-6 é "tabela sem linha em branco", isso só apareceria no fim.
- **Recomendação:** preencher agora a linha do Trystero e da estratégia de sinalização que ele usa; trocar
  o marcador para dizer que o TURN é a linha **condicional**, dependente da saída escolhida em E-4.

#### `AC-24` — o ≥ 70% de E-4 não diz se é medido com ou sem TURN
- **Passagem:** 7 (subespecificação)
- **Onde:** `a_context/b_plan.md` L284 (portão de E-4) × L227 (as duas saídas de TURN em M6) ×
  `a_context/online_p2p.md` L23-29
- **O quê:** o portão de E-4 exige "taxa de conexão medida ≥ 70%" e, na mesma linha, exige que a decisão de
  TURN esteja escrita — e as duas saídas dão números diferentes. Sem TURN, `online_p2p` diz que 15-30%
  falham, ou seja, a taxa nua fica entre 70% e 85%: no pior caso declarado ela **empata** com o corte e
  passa raspando, deixando 30% dos jogadores sem online. Com TURN, a taxa é outra e o corte é folgado.
  O portão não diz qual das duas medições vale.
- **Por que importa:** o número foi criado justamente para reprovar (`AC-09`), e do jeito que está a saída
  (b) — TURN fora de escopo — é a que mais facilmente passa, porque não precisa de nada além de medir.
- **Recomendação:** dizer no portão qual configuração é medida. O par que faz sentido: taxa **sem** TURN
  medida e registrada sempre (é o número que alimenta o gatilho de `D-01`), e o ≥ 70% cobrado sobre a
  configuração que vai ao ar.

#### `AC-25` — `Kick` é o evento e `'kick'` é o papel; a mesma palavra para duas coisas
- **Passagem:** 6 (deriva de terminologia — agora dentro dos contratos)
- **Onde:** `a_context/b_plan.md` L125 (`interface Kick`) × L152 (`Role = 'kick' \| 'dive'`) ×
  `b_process/f_glossary_and_primer.md` L293
- **O quê:** o glossário novo fixa **cobrança** = `Kick`, o evento completo, com `shot` e `dive` dentro
  (L125). O contrato de M3, escrito na mesma revisão, usa `'kick'` para o **papel** de quem chuta. Então
  `Kick` é o evento e `'kick'` é um dos dois papéis dentro dele — e o campo do chute nem se chama `kick`,
  se chama `shot`. `dive` é o único dos três que quer dizer a mesma coisa nos dois lugares.
- **Efeito:** pequeno e barato agora; é exatamente a categoria de coisa que o `AC-17` acabou de custar uma
  seção de glossário para arrumar.
- **Recomendação:** `Role = 'shooter' | 'keeper'`, que alinha com `shot`/`dive` e não colide com `Kick`; e
  uma linha de `Role` na tabela de vocabulário, que hoje não o cobre.

### BAIXO

#### `AC-26` — o chaveamento é "em memória" numa linha e `[a confirmar]` em outra
- **Passagem:** 5
- **Onde:** `a_context/b_plan.md` L61 (tabela de donos de estado) × L259 (M8, "estado que possui")
- **O quê:** L61 diz "memória — **[a confirmar em E-5]** se sobrevive a reload; se sim, muda de dono e vai
  para `localStorage` de M7". L259 diz apenas "o chaveamento, em memória", sem ressalva. Quem ler só o
  contrato de M8 — que é o modo de leitura que o plano recomenda — não fica sabendo que o dono do estado
  pode mudar em E-5.
- **Recomendação:** repetir a ressalva em L259, ou apontar dali para a tabela.

---

## 4. Cobertura módulo → tarefa

| Módulo | Tem tarefa? | Tarefas | Portão declarado? |
|---|---|---|---|
| M1 — Núcleo | Sim | `T-04` (E-1) | Sim |
| M2 — Motor da disputa | Sim | `T-06` (E-2) | Sim — com `Number.isInteger` (`AC-18`) |
| M3 — CPU | Sim | `T-07` (E-2) | Sim — com o teste de independência entre papéis (`AC-13`) |
| M4 — Catálogo | Sim | `T-08` (E-3) | Sim |
| M5 — Sessão de disputa | Sim | `T-09` (E-3, `cpu`/`local`) · `T-13` (E-4, `online`) | Sim — reexportação incompleta (`AC-20`) |
| M6 — Transporte P2P | Sim | `T-11` (E-4) | Sim — bloqueio excessivo no card (`AC-22`) |
| M7 — Tela | Sim | `T-10` (E-3) · `T-14` (E-5, torneio) | Sim — três portões: jogabilidade, camada e licença |
| M8 — Torneio | Sim | `T-12` (E-5) | Sim — parametrizado por `Q-03` |
| M9 — Build e publicação | Sim | `T-05` (E-1; portão pleno em E-6) | Sim — três portões: build, custo e privacidade |

**9/9 módulos com tarefa, nenhuma cobertura parcial.** 11 tarefas de módulo (eram 9).
**Passagem 2 (tarefa → módulo):** sem achado. `T-04`..`T-14` têm módulo; `T-02`, `T-03` e `A-04`..`A-06`
são de processo e de dono. Nenhuma tarefa órfã trazendo escopo pela porta dos fundos.

## 5. Restrições inegociáveis × portão

O plano passou a carregar esta tabela dentro dele (L65-75), o que é a correção certa: ela deixa de
depender de um relatório em `e_qa/` para existir.

| Restrição (CONTEXT L12-16) | Portão que a verifica | Verificado |
|---|---|---|
| Custo R$ 0 permanente; build estático | M9 portão-custo (L273) · M6 dá dono ao TURN (L227-228) · tabela de [[stack]] · E-6 exige a tabela cheia | **OK** — ressalva em `AC-23` |
| Nenhuma marca de terceiro | M4 (L177) · **M7 portão-licença, `assets/` inteiro (L240-243)** · E-3 (L283) · E-5 (L285) | **OK** |
| Nenhum segredo versionado | M9 (L272) + `scripts/check.py` | **OK** |
| Nenhum dado pessoal coletado | "sem conta" estrutural (`D-01`) · **M9 portão-privacidade (L274)** · M3 `grep` (L161) · M7 escopo do `localStorage` (L236) | **OK** |
| Não inventar dado; lacuna declarada fica declarada | nenhum `[a confirmar]` dentro de portão · toda lacuna que trava etapa é `Q-NN` (L75) | **OK** — varredura confirma zero `[a confirmar]` em linha de portão |

**5/5 com portão.** Era 1/5 na passagem 1.

## 6. Critérios de aceite × número ou comando

| Critério (CONTEXT L28-34) | Como reprova |
|---|---|
| `npx tsc --noEmit && npm run build` verdes | comando |
| Bundle inicial < 8 MB | número, lido da saída |
| Disputa completa roda 2x com o mesmo resultado | comando (suíte) |
| Varredura de `assets/` sem arquivo de origem não declarada | portão de M7 + E-3 + E-5 + E-6 |
| Fluxo crítico por toque em 360x640 | portão de M7, no celular real |
| Online: taxa de conexão em rede móvel real | **≥ 70%** em E-4 — ressalva em `AC-24` |

**6/6.** Era 5/6.

## 7. Números

- Módulos: **9** · Tarefas de módulo: **11** · Módulos com tarefa: **9/9 (100%)**, zero parciais
- Achados da passagem 1: **19** — fechados **19 (100%)**
- Achados novos da passagem 2: **7** — CRÍTICO **0** · ALTO **1** · MÉDIO **5** · BAIXO **1**
- Restrições inegociáveis com portão: **5/5** · Critérios de aceite com número ou comando: **6/6**
- `scripts/check.py`: verde, sem avisos

## 8. Portão de T-03 — passagem 2

- [x] Zero achados CRÍTICOS em aberto
- [x] Todo módulo do PLANO tem ao menos uma tarefa no BACKLOG
- [x] Toda restrição inegociável tem um portão que a verifica
- [x] Todo critério de aceite é um comando ou um número

**T-03 aprovado.** O plano pode ser congelado e a Fase 2 pode começar.

Duas observações que não reprovam e que valem a leitura antes do congelamento:

**`AC-20` custa uma linha agora.** É a metade que faltou do `AC-05` e o único achado ALTO. Reexportar
`Level` na porta de M5 é uma linha; descobrir isso em E-3, com o portão de camada de M7 vermelho, custa
uma sessão. Não bloqueia o congelamento — mas se vai entrar, que entre no mesmo commit.

**O que mais melhorou não foi a contagem de achados.** Foi o plano ter passado a carregar dentro dele a
tabela de restrição × portão (L65-75) e a de representação × portão (L79-85). Na passagem 1 essas duas
tabelas só existiam no meu relatório, que ninguém carrega em sessão de implementação. Agora a checagem
mora onde é lida. Se uma restrição perder o portão de novo, o próprio plano denuncia — e é isso que faz a
próxima revisão custar menos que esta.

---

> **Ainda não linkado a partir do DECISIONS.** Nenhum `QA-NN` novo foi aberto: a skill é somente leitura, e
> os 7 achados desta passagem não têm CRÍTICO. O `check.py` vai apontar este arquivo como nota órfã até que
> alguém o linke — do DECISIONS, se `AC-20` virar `QA-04`, ou do card de `T-03` no BACKLOG.
