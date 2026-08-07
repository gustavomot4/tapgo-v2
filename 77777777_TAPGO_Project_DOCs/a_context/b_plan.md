---
tags: [plano]
status: atual
tipo: plano
data: 2026-08-07
---
# PLANO.md — TAP GO v2

> Gerado na Fase 1b com [[b_process/skills/planner/SKILL|planner]] a partir do [[a_context_source|CONTEXT]].
> **Revisão de 2026-08-07:** corrigido pelos 19 achados de [[a_artifact_consistency_report_260807_1543|T-03]]. Os três CRÍTICOS viraram `QA-01`, `QA-02` e `QA-03` no [[c_decisions|DECISIONS]].
> **Ainda não congelado.** Aprovado no portão de T-02 → `status: congelado` e uma linha `D-NN` no DECISIONS. Mudança posterior é `D-NN` novo — nunca replanejar do zero.
> Critério de qualidade: outro agente implementa um módulo lendo **só o contrato dele + o CONTEXT**.
> Estado (o que já está pronto) NÃO mora aqui — mora no CONTEXT.
> As milestones são `E-1..E-6` (etapa), não `M-1..M-6` do modelo: `M1..M9` já são os módulos, e as duas numerações lado a lado se leem errado.

## Forma da arquitetura

Monólito modular · SPA estática · sem backend · motor de regras puro isolado do render — congelado em `D-01`. Stack em `D-02`. Este plano **não rediscute** nenhum dos dois; executa.

O plano acrescenta **uma** regra de arquitetura, e é dela que sai a aciclicidade:

> **A seta de dependência só aponta para baixo.** Um módulo importa a *porta de entrada* dos módulos de camada inferior e nada mais — nunca um arquivo interno de outro módulo, nunca um módulo de camada igual ou superior.

Como as camadas são estritamente crescentes, não existe ciclo por construção: basta conferir a coluna "Importa".

### Mapa de módulos (dependências acíclicas)

| # | Módulo | Camada | Importa | Fase do [[a_roadmap|ROTEIRO]] |
|---|---|---|---|---|
| M1 | Núcleo (tipos + aleatoriedade com semente) | 0 | — | 2 |
| M2 | Motor da disputa | 1 | M1 | 2 |
| M3 | CPU | 1 | M1 | 2 |
| M4 | Catálogo de seleções | 1 | M1 | 2 |
| M6 | Transporte online P2P | 1 | M1 | 3 |
| M5 | Sessão de disputa | 2 | M1 M2 M3 M4 M6 | 3 |
| M8 | Torneio | 3 | M1 M4 M5 | 3 |
| M7 | Tela (Phaser) | 4 | M1 M4 M5 M8 | 3 |
| M9 | Build e publicação | — | ninguém importa, e ele não importa ninguém | 5 |

Duas consequências viram checagem objetiva (portão de E-1, e valem para sempre):

- **M7 nunca importa `src/engine`, `src/cpu` ou `src/net`.** É o que "motor isolado do render" (`D-01`) significa em `grep`. Para isso ser possível, **M5 reexporta os tipos** que sua própria assinatura usa (`MatchState`, `LinkStatus`): a UI recebe o tipo pela porta de M5, não indo buscá-lo na origem. O `grep` passa a significar o que quer dizer — a tela não alcança a *lógica* do motor.
- **`Math.random()` só existe dentro de M1.** Sem isso o aceite "roda 2x com o mesmo resultado" é falso.

### Idioma dos nomes

Nome de arquivo e de pasta em **inglês**; identificador de código na **convenção do TypeScript**, que também é inglês — o padrão do repositório rege nome de arquivo e, sobre código, manda seguir a convenção da linguagem: *"Código segue a convenção da linguagem, não esta"* [Fonte: b_process/e_repository_standard.md#3-nomes-de-arquivo]. Termo de domínio em português vive na doc, no [[f_glossary_and_primer|glossário]] e no texto de tela — **nunca dentro de um identificador**. Meio-termo entre dois idiomas no mesmo símbolo é como a v1 chegou a `fezGOl`.

### Quem é dono de qual estado

Cada linha tem **um** dono. Ninguém mais escreve nela; quem precisa, lê pela porta de entrada do dono.

| Estado | Dono | Onde vive | Some quando |
|---|---|---|---|
| Semente e cursor do gerador | M1 | memória | recarrega a página |
| Placar, cobranças, fase, vencedor (`MatchState`) | M2 | memória | recarrega a página |
| Histograma de zonas do jogador, um por papel | M3 | memória — **nunca** `localStorage` [Fonte: a_context/regras_partida.md#cpu-d-10] | recarrega a página |
| Catálogo de seleções (imutável) | M4 | bundle | nunca (resolve em build) |
| Modo, lado local, escolha pendente, nº de sequência | M5 | memória | recarrega a página |
| Conexão, ID de sala, relógio de timeout | M6 | memória | desconecta ou recarrega |
| Chaveamento do torneio | M8 | memória — **[a confirmar em E-5]** se sobrevive a reload; se sim, muda de dono e vai para `localStorage` de M7 | recarrega a página |
| Cena e animação | M7 | memória | troca de cena |
| Preferências do aparelho (nível, som, última seleção) | M7 | `localStorage` | o usuário limpa o navegador |

### As 5 restrições inegociáveis × o portão que verifica cada uma

Esta tabela existe porque a primeira versão do plano deixou três delas sem checagem em módulo nenhum — os CRÍTICOS `QA-01`, `QA-02` e `QA-03`. Restrição sem portão é declaração de intenção.

| Restrição do [[a_context_source|CONTEXT]] | Portão que a verifica |
|---|---|
| Custo R$ 0 permanente; build estático | M9: tabela de custo de [[stack]] completa, toda linha "não pede cartão" · M6: TURN com dono e com linha nessa tabela |
| Nenhuma marca de terceiro | M4 (bandeira e código ISO) · **M7 (uniforme, jogador, texto de tela, `assets/` inteiro)** · E-5 (nome do torneio) |
| Nenhum segredo versionado | M9 + `scripts/check.py` |
| Nenhum dado pessoal coletado | "sem conta" é estrutural (`D-01`, sem backend) · **M9: zero script externo, zero endpoint externo fora da sinalização de M6** · M3 e M7: o que pode ir para `localStorage` |
| Não inventar dado; lacuna declarada fica declarada | nenhum `[a confirmar]` dentro de portão (só em prosa e na tabela de estado) · toda lacuna que trava etapa é `Q-NN` no DECISIONS |

### As representações obrigatórias × onde são verificadas

| Representação | Onde é verificada |
|---|---|
| Placar e contadores em inteiro, nunca float | portão de M2 (`Number.isInteger` em toda transição) |
| ID de sala opaco e aleatório, nunca sequencial | portão de M6 |
| País por código ISO-3166 alfa-2, nunca nome digitado | portão de M4 |
| Datas UTC ISO-8601 | **não-aplicável declarado:** o v2 não produz nem persiste data em runtime. O único relógio é o timeout de M6, que compara instantes e não guarda nenhum. Se algum módulo passar a persistir data, esta linha vira portão |
| Arquivos UTF-8 | garantido fora do código, pelo `.gitattributes` (LF) e pelo padrão do repositório — nenhum módulo escreve arquivo |

## Ordem de build

Dados/schema (M1, forma de M4) → domínio (M2, M3) → borda (M6, M5) → UI (M7, M8) → infra (M9).

**Dois desvios, ambos justificados:**

1. **O esqueleto de M9 vem primeiro (E-1), não por último.** O GitHub Pages serve o site num subcaminho, e o build padrão gera caminhos que só quebram *em produção*; e o teto de 8 MB é "número lido da saída do build", não estimativa. Descobrir isso no dia 1 custa uma sessão; no dia da entrega, custa a entrega. O **portão** de M9 continua no fim (E-6) — o que antecipa é só o esqueleto.
2. **M8 (torneio) vem depois de M7, fora da ordem de camada.** Não é preferência: `Q-03` trava o conteúdo dele, e escrever M8 antes da resposta é escrever contra suposição. A **tela** do torneio (M7 em E-5) segue o mesmo atraso, e tem tarefa própria.

## Módulos e contratos

> Toda assinatura abaixo é o **contrato**, não a implementação: quem implementa pode mudar o miolo, não a porta.

### M1 — Núcleo (tipos e aleatoriedade com semente)

- **Recebe:** nada. Sem dependência, sem I/O.
- **Entrega:** os tipos compartilhados por todo o resto e um gerador pseudoaleatório determinístico.
- **Porta de entrada:** `src/core/index.ts`
  ```ts
  export type Zone = 'L' | 'C' | 'R';        // esquerda · meio · direita
  export type Side = 'A' | 'B';
  export type CountryCode = string;          // ISO-3166 alfa-2, 2 letras maiúsculas
  export interface Rng { int(maxExclusive: number): number; }   // inteiro em [0, max)
  export function createRng(seed: number): Rng;
  export function newSeed(): number;         // a ÚNICA chamada a Math.random do projeto
  ```
- **Estado que possui:** o cursor interno do `Rng`.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Portão:** dois `createRng(7)` produzem a mesma sequência de 1.000 valores · `int(3)` sorteia 0, 1 e 2, **com o 0 incluso** (defeito 3 da v1) [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · `grep -rn "Math.random" src/` retorna exatamente 1 ocorrência, dentro de M1.
- **Onde a stack vai doer:** `Math.random()` não aceita semente — o determinismo do aceite morre se qualquer módulo chamar direto. Não vale dependência nova: um gerador de 5 linhas (ex.: mulberry32) resolve, e biblioteca a mais é peso no bundle e linha na tabela de custo de [[stack]].

### M2 — Motor da disputa

- **Recebe:** um estado de disputa e uma cobrança (zona de quem cobra + zona de quem defende). Nada mais: não conhece jogador, CPU, rede nem tela.
- **Entrega:** o novo estado, imutável — placar, histórico, de quem é a vez, fase e vencedor.
- **Porta de entrada:** `src/engine/index.ts`
  ```ts
  export type Phase = 'regular' | 'suddenDeath' | 'finished';   // suddenDeath = alternadas (D-09)
  export interface Kick { side: Side; shot: Zone; dive: Zone; goal: boolean; }
  export interface MatchState {
    readonly kicks:  readonly Kick[];
    readonly goals:  Readonly<Record<Side, number>>;   // inteiro, nunca float
    readonly taken:  Readonly<Record<Side, number>>;
    readonly phase:  Phase;
    readonly turn:   Side | null;    // null quando finished
    readonly winner: Side | null;
  }
  export function createMatch(): MatchState;
  export function play(state: MatchState, shot: Zone, dive: Zone): MatchState;  // pura
  ```
- **Estado que possui:** `MatchState` — a verdade do placar. **Ninguém mais calcula placar.**
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Portão:** um teste por invariante de [Fonte: a_context/regras_partida.md#invariantes] · um teste de regressão por defeito **1, 2, 4 e 5** da v1 [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · a suíte roda 2x com o mesmo placar. Em particular:
  - morte matemática encerra a fase regular sem cobrança inútil, e **não** encerra no meio de uma rodada alternada — as duas cobranças da rodada sempre acontecem (`D-09`);
  - `play` sobre estado `'finished'` é rejeitada, não ignorada;
  - **todo valor de `goals` e `taken`, em toda transição, satisfaz `Number.isInteger`** — teste de propriedade sobre sequências aleatórias com semente fixa, não inspeção visual. `number` do TypeScript aceita float calado.
- **Onde a stack vai doer:** nada da stack ajuda aqui — nem Phaser nem Vite entram. O risco é humano: um `Date.now()`, um `Math.random()` ou uma linha de render dentro deste módulo derrubam o teste 2x. Por isso M2 não importa nada além de M1.

### M3 — CPU

- **Recebe:** o nível, o `Rng` de M1, e as zonas que o jogador humano usou nesta sessão — **separadas por papel**.
- **Entrega:** uma zona por chamada, com os pesos de `D-10`.
- **Porta de entrada:** `src/cpu/index.ts`
  ```ts
  export type Level = 'easy' | 'medium' | 'hard';   // peso do histórico: 0% · 50% · 70%
  export type Role  = 'kick' | 'dive';              // cobrando · defendendo
  export interface Cpu {
    observe(role: Role, zone: Zone): void;          // o que o HUMANO escolheu, no papel dele
    pick(role: Role): Zone;                         // o que a CPU escolhe, no papel dela
  }
  export function createCpu(level: Level, rng: Rng): Cpu;
  ```
- **Estado que possui:** **dois** histogramas, um por papel, em memória. A distribuição de zonas de quem cobra não é a mesma de quem defende; um histograma só as leria como uma, e quem implementasse lendo apenas o contrato escolheria sozinho qual dos dois comportamentos vale. O teto de 70% vale para **cada** histograma, separadamente.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Portão:** histórico vazio → distribuição uniforme em qualquer nível · com o jogador repetindo uma zona, a frequência medida com que a CPU acerta essa zona **nunca passa de 70%**, em nível nenhum · **o histórico de um papel não desloca a escolha do outro** (encher `kick` de `'L'` não muda a distribuição de `pick('dive')`) · mesma semente + mesmas entradas = mesmas escolhas · `grep -rn "localStorage" src/cpu/` retorna zero [Fonte: a_context/regras_partida.md#cpu-d-10].
- **Onde a stack vai doer:** o teto de 70% se fura por acidente na soma dos pesos. "70% na zona mais provável, senão uniforme entre as 3" dá **80%** de acerto efetivo (0,70 + 0,30/3), e viola `D-10` sem que ninguém veja no código. O teste tem de **medir frequência** sobre milhares de sorteios com semente fixa, não conferir a fórmula no olho.

### M4 — Catálogo de seleções

- **Recebe:** nada em runtime — é dado curado que entra no bundle.
- **Entrega:** a lista de seleções jogáveis e a busca por código.
- **Porta de entrada:** `src/data/teams.ts`
  ```ts
  export interface Team { code: CountryCode; name: string; flag: string; }  // flag = caminho local, nunca URL
  export function listTeams(): readonly Team[];
  export function findTeam(code: CountryCode): Team | undefined;
  ```
- **Estado que possui:** o catálogo (imutável, resolvido em build).
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Bloqueado por `Q-03`:** quantas e quais seleções entram, e **de onde vêm as bandeiras**. Contrato e testes podem ser feitos **agora**, com uma lista de fixação; a lista real só entra depois de `A-04`. Não inventar seleção [Fonte: a_context/regras_partida.md#lacunas-declaradas].
- **Portão:** todo `code` é ISO-3166 alfa-2 válido, e o `name` vem do código — nunca texto digitado livre · todo arquivo em `flag` é local (zero URL, zero hotlink) e tem uma linha na tabela de procedência [Fonte: a_context/licenciamento.md#procedência-de-asset] · zero escudo de clube ou federação [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto].
- **Onde a stack vai doer:** bandeira é o único asset que multiplica por N. N × SVG cabe folgado no teto de 8 MB; N × PNG grande, não — e o número sai da saída do build, não de estimativa. A licença da fonte das bandeiras tem de existir **antes** de o arquivo entrar no repositório, e por isso ela faz parte de `Q-03`, não de uma decisão de implementação.

### M5 — Sessão de disputa (o único caminho da tela até o motor)

- **Recebe:** a configuração do modo, a semente, o nível (só em `cpu`), as duas seleções e qual lado é o deste aparelho.
- **Entrega:** uma sessão que aceita **uma escolha de zona por vez**, providencia a outra zona (CPU, segundo jogador no mesmo aparelho, ou peer), chama M2 e notifica os assinantes.
- **Porta de entrada:** `src/session/index.ts`
  ```ts
  export type { MatchState } from '../engine';   // reexporta: a UI tipa sem importar o motor
  export type { LinkStatus } from '../net';      // idem para o status do canal

  export type Mode = 'cpu' | 'local' | 'online';
  export interface SessionConfig {
    mode: Mode; seed: number; level?: Level;
    teams: Record<Side, CountryCode>; localSide: Side; roomId?: string;
  }
  export interface Session {
    state(): MatchState;
    choose(zone: Zone): void;                                        // a escolha deste aparelho
    subscribe(fn: (s: MatchState, link: LinkStatus) => void): () => void;
    dispose(): void;
  }
  export function createSession(cfg: SessionConfig): Session;
  ```
- **Estado que possui:** modo, lado local, escolha pendente da rodada e nº de sequência do peer. **Não** possui placar — placar é de M2.
- **Skill responsável:** [[b_process/skills/backend-bff/SKILL|backend-bff]]
- **Portão:** os três modos produzem o **mesmo** `MatchState` para a mesma sequência de zonas — é o teste que prova que a regra não foi duplicada (`D-01`) · evento remoto fora de ordem, repetido ou com zona inválida é descartado e **nunca chega a M2** [Fonte: a_context/regras_partida.md#invariantes] · `dispose()` fecha o canal e não deixa assinante vivo · `MatchState` e `LinkStatus` são reexportados pela porta (sem isso, o portão de M7 é impossível de cumprir).
- **Onde a stack vai doer:** é aqui que o online contamina o resto se a fronteira vazar. `choose()` resolve na hora no modo local e espera a rede no online — a **assinatura tem de ser a mesma nos três modos**, senão M7 ganha um `if (mode === 'online')` e a tela passa a conhecer rede. `Q-04` bloqueia o comportamento quando o peer some no meio: até responder, o modo online não fecha E-4.

### M6 — Transporte online P2P

- **Recebe:** jogadas serializadas — dezenas de bytes cada [Fonte: a_context/online_p2p.md#como-funciona].
- **Entrega:** um canal com envio, recebimento e **status de conexão explícito, inclusive a falha**; e um ID de sala.
- **Porta de entrada:** `src/net/index.ts`
  ```ts
  export type LinkStatus = 'idle' | 'waiting' | 'connected' | 'failed' | 'closed';
  export interface Move { seq: number; side: Side; zone: Zone; }
  export interface IceConfig { turn?: { urls: string; username: string; credential: string } }
  export interface Channel {
    send(m: Move): void;
    onMove(fn: (m: Move) => void): void;
    onStatus(fn: (s: LinkStatus) => void): void;
    close(): void;
  }
  export function hostRoom(ice?: IceConfig): { roomId: string; channel: Channel };
  export function joinRoom(roomId: string, ice?: IceConfig): Channel;
  ```
- **Estado que possui:** a conexão, o ID de sala e o relógio de timeout. **Nenhum estado de disputa** — M6 não sabe o que é gol.
- **Skill responsável:** [[b_process/skills/microservice-sync/SKILL|microservice-sync]]
- **TURN tem dono, e o dono é este módulo.** `IceConfig` existe para que o relay seja configurável sem tocar em mais nada. Duas saídas, e o plano exige que uma seja escolhida em E-4, por escrito: (a) usar uma camada gratuita de TURN, que então **ganha linha na tabela de custo** de [[stack]] e é verificada pelo portão de M9; ou (b) declarar TURN fora de escopo, e nesse caso o portão de E-4 registra **quantos por cento ficam sem online** — não "alguns jogadores" [Fonte: a_context/online_p2p.md#a-lacuna-declarada].
- **Portão:** `roomId` opaco e aleatório, nunca sequencial · **defeito 6 da v1 não se repete:** o ID é gerado no cliente porque não há servidor, então ele não pode ser previsível nem colidir entre abas, e **nenhuma decisão de disputa deriva dele** — quem valida jogada é M5 contra o `MatchState` de M2 [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · peer que não conecta em **20 s** vira `'failed'`, com mensagem, nunca tela travada [Fonte: a_context/online_p2p.md#riscos-que-precisam-de-fallback-escrito] · com a sinalização derrubada de propósito, `cpu` e `local` continuam jogáveis · toda dependência e todo host que este módulo alcança têm linha na tabela de custo de [[stack]].
- **Onde a stack vai doer:** 15-30% dos jogadores atrás de CGNAT não conectam sem TURN — e CGNAT é o padrão de operadora móvel, exatamente o público deste jogo. **O sandbox do agente não produz esse número:** é medição do dono, dois aparelhos, rede de operadora, não Wi-Fi de casa. Os 20 s do timeout são escolha técnica deste plano, não medição: longos o bastante para o ICE completar em rede móvel, curtos o bastante para a tela não parecer travada. E-4 pode ajustá-los com o número na mão.

### M7 — Tela (Phaser)

- **Recebe:** `MatchState` e `LinkStatus` pela porta de M5 (que os reexporta); as seleções por M4; o chaveamento por M8.
- **Entrega:** as cenas jogáveis por toque, com os 4 estados por tela, e a leitura/escrita das preferências do aparelho.
- **Porta de entrada:** `src/ui/main.ts` → `export function bootGame(container: HTMLElement): void`
- **Estado que possui:** cena/animação (memória) e **as preferências do aparelho** em `localStorage` — nível da CPU, som, última seleção. Só isso: `localStorage` não guarda disputa, histórico de zonas nem nada que identifique a pessoa.
- **Skill responsável:** [[b_process/skills/frontend-uiux/SKILL|frontend-uiux]]
- **Portão — jogabilidade:** fluxo crítico completo por toque em viewport 360x640 · ≥30 fps no celular real do dono (abaixo disso abre o gatilho de `D-02`) · nenhum texto técnico vazando na tela ("ICE failed" não é mensagem de jogo).
- **Portão — camada:** `grep` por import de `src/engine`, `src/cpu` ou `src/net` dentro de `src/ui/` retorna zero (os tipos vêm de M5).
- **Portão — licença (M7 é quem desenha, e por isso é aqui que a restrição morde):**
  - **todo** arquivo em `assets/` — não só bandeira — tem linha na tabela de procedência de [[licenciamento]]; sem linha, não entra no repositório [Fonte: a_context/licenciamento.md#procedência-de-asset];
  - zero uniforme oficial identificável de clube ou seleção; zero nome, apelido, rosto ou número de jogador real [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto];
  - `grep -rniE "fifa|copa do mundo|world cup|brasileir[ãa]o|libertadores|champions league"` em `src/` e em `assets/` retorna zero.
- **Onde a stack vai doer:** Phaser cabe (~345 KB min+gzip, `D-02`), mas em 360x640 as 3 zonas têm de ser **alvos de toque grandes**, não pixels do gol. E o primeiro asset que não é bandeira nasce aqui, em E-3 — três etapas antes da varredura de `assets/` de E-6. Por isso a procedência é portão deste módulo, e não só da entrega.

### M8 — Torneio

- **Recebe:** as seleções participantes e o `Rng`; depois, o resultado de cada disputa.
- **Entrega:** o par da vez, a rodada, e o campeão ao fim.
- **Porta de entrada:** `src/tournament/index.ts`
  ```ts
  export interface Tournament {
    current(): { teams: Record<Side, CountryCode>; round: number } | null;
    report(winner: Side): void;
    champion(): CountryCode | null;
  }
  export function createTournament(entrants: readonly CountryCode[], rng: Rng): Tournament;
  ```
- **Estado que possui:** o chaveamento, em memória.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Bloqueado por `Q-03`** (número de participantes, **formato do chaveamento** e nome do torneio, que não pode colidir com marca [Fonte: a_context/licenciamento.md#nome-do-torneio-no-jogo]) **e por `Q-05`** (se o torneio também roda no modo `online`, M8 passa a depender de M5 no modo online e o chaveamento vira estado compartilhado entre dois aparelhos — isso muda a camada 3).
- **Portão:** o torneio termina no número de disputas que o formato respondido em `Q-03` prevê, com um campeão e sem par repetido · mesma semente = mesmo chaveamento · a CPU do torneio respeita o teto de 70%: nenhuma progressão de dificuldade passa disso [Fonte: a_context/regras_partida.md#cpu-d-10].
- **Onde a stack vai doer:** nada técnico. O custo aqui é conteúdo, e ele está em `Q-03` e `Q-05` — enquanto as duas estiverem abertas, escrever M8 é escrever contra suposição.

### M9 — Build e publicação

- **Recebe:** o código dos outros módulos.
- **Entrega:** o build estático publicado, e o **número** do bundle lido da saída do build.
- **Porta de entrada:** `vite.config.ts` + `.github/workflows/pages.yml`
- **Estado que possui:** a configuração de build (`base`, `root`, `outDir`). Nenhum estado de runtime.
- **Skill responsável:** [[b_process/skills/iac-docker-terraform/SKILL|iac-docker-terraform]] (sem Docker: o "empacotar e operar" deste projeto é build estático + Pages)
- **Portão — build:** `npx tsc --noEmit && npm run build` verdes na máquina do dono · bundle inicial < 8 MB **lido da saída**, nunca estimado · a página publicada carrega todos os assets sem 404 · nenhum segredo versionado.
- **Portão — custo (a restrição "R$ 0" só existe se for verificada aqui):** toda dependência de runtime e todo endpoint externo que o build publicado alcança têm linha na tabela de custo de [[stack]], cada uma com a camada usada e a confirmação de que ela **não exige cartão**; host que aparece no `dist/` e não está na tabela reprova.
- **Portão — privacidade:** zero `<script>` de origem externa no HTML publicado · zero endpoint externo em runtime fora da sinalização e do relay de M6 · nenhuma chamada de telemetria, analytics ou fonte remota.
- **Onde a stack vai doer:** o GitHub Pages de repositório serve em `/tapgo-v2/`, não na raiz. Com o `base` padrão, o build gera caminhos absolutos e **todo asset dá 404 só em produção** — verde no `npm run dev`, quebrado no ar. É a falha clássica desta combinação, e o motivo de E-1 publicar uma página vazia antes de existir jogo. HTTPS, que o WebRTC exige, o Pages já dá.

## Milestones com portão (cada uma só abre com o portão da anterior)

| Etapa | Abre quando | Portão de saída |
|---|---|---|
| **E-1 · Esqueleto que publica** | plano congelado (`D-NN`) | M1 + esqueleto de M9: `npx tsc --noEmit && npm run build` verdes · página no ar pelo Pages carregando um asset de teste **sem 404** · as duas checagens de camada já rodam (uma ocorrência de `Math.random`, zero import de motor na UI) |
| **E-2 · Motor sem tela** | E-1 fechada | M2 + M3: um teste por invariante de [[regras_partida]] · regressão dos defeitos **1, 2, 4 e 5** da v1 em M2 e do **3** em M1 — o defeito 6 é de ID de sala e fecha em M6 (E-4) · `Number.isInteger` em toda transição de placar · frequência da CPU medida ≤ 70% em cada papel · suíte roda 2x com o mesmo placar |
| **E-3 · Jogo local jogável** | E-2 fechada | M4 (lista de fixação) + M5 (`cpu`, `local`) + M7: disputa completa, 5 cobranças e alternadas, jogada **só por toque** em 360x640 no celular real do dono, terminando com o placar correto · todo asset novo com linha de procedência |
| **E-4 · Online por link** | E-3 fechada **e** `Q-04` respondida | M6 + M5 (`online`): dois aparelhos em **rede móvel real** completam uma disputa · **taxa de conexão medida ≥ 70%** — abaixo disso E-4 não fecha, e o gatilho de revisão de `D-01` abre como efeito separado · decisão de TURN escrita: camada gratuita com linha na tabela de custo, **ou** fora de escopo com o percentual sem online registrado · falha mostra timeout honesto em 20 s e os modos locais seguem intactos |
| **E-5 · Torneio** | E-3 fechada **e** `Q-03` + `Q-05` respondidas | M8 + tela de torneio (M7) + catálogo real: torneio termina com campeão, jogável de ponta a ponta por toque · **toda** bandeira e todo asset novo com linha de procedência em [[licenciamento]] · nome do torneio fora da lista-morta |
| **E-6 · Entrega** | E-4 **e** E-5 fechadas | todo o Critério de aceite do [[a_context_source|CONTEXT]] verde · tabela de custo de [[stack]] sem linha em branco · `python scripts/check.py --historico-completo` verde |

E-4 e E-5 são paralelas de propósito: `Q-03` trava o torneio, **não** o online.

## Decisões que este plano pede para congelar

O runner de teste e o local do `index.html` **deixaram de ser propostas**: viraram `D-11` e `D-12` no [[c_decisions|DECISIONS]] nesta revisão, porque todo portão de módulo depende de suíte e a suíte não tinha dono. O que continua pendente é **um** item:

1. **O plano em si** — módulos, camadas, portas de entrada, donos de estado e portões. É o que T-02 aprova, e vira `D-NN` no congelamento.

## As 3 perguntas que mais mudariam este plano

1. **`Q-03` — quantas e quais seleções, qual o formato do chaveamento, qual o nome do torneio e de onde vêm as bandeiras.** Define o conteúdo de M4, o portão de M8 e o peso do bundle. Trava E-5.
2. **`Q-05` — o torneio roda também no modo online?** Se sim, M8 passa a depender de M5 no modo `online` e o chaveamento vira estado compartilhado entre dois aparelhos: muda a camada 3 do plano, não um detalhe de implementação.
3. **`Q-04` — o que acontece com a disputa quando o peer some no meio.** Define o contrato de M5 e M6, e trava E-4 [Fonte: a_context/online_p2p.md#riscos-que-precisam-de-fallback-escrito].
