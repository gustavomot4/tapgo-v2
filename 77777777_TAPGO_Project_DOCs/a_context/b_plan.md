---
tags: [plano]
status: atual
tipo: plano
data: 2026-08-06
---
# PLANO.md — TAP GO v2

> Gerado na Fase 1b com [[b_process/skills/planner/SKILL|planejador]] a partir do [[a_context_source|CONTEXT]].
> **Ainda não congelado.** Aprovado no portão de T-02 → `status: congelado` e uma linha `D-NN` em [[c_decisions|DECISIONS]]. Mudança posterior é `D-NN` novo — nunca replanejar do zero.
> Critério de qualidade: outro agente implementa um módulo lendo **só o contrato dele + o [[a_context_source|CONTEXT]]**.
> Estado (o que já está pronto) NÃO mora aqui — mora no [[a_context_source|CONTEXT]].
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
| M5 | Sessão de partida | 2 | M1 M2 M3 M4 M6 | 3 |
| M8 | Torneio | 3 | M1 M4 M5 | 3 |
| M7 | Tela (Phaser) | 4 | M1 M4 M5 M8 | 3 |
| M9 | Build e publicação | — | ninguém importa, e ele não importa ninguém | 5 |

Duas consequências viram checagem objetiva (portão de E-1, e valem para sempre):

- **M7 nunca importa M2, M3 ou M6.** É o que "motor isolado do render" (`D-01`) significa em `grep`. Se a tela alcança o motor direto, CPU/2P/online param de compartilhar a mesma regra — e o defeito 2 da v1 volta por outra porta [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1].
- **`Math.random()` só existe dentro de M1.** Sem isso o aceite "roda 2x com o mesmo resultado" é falso [Fonte: a_context/a_context_source.md#critério-de-aceite].

### Quem é dono de qual estado

Cada linha tem **um** dono. Ninguém mais escreve nela; quem precisa, lê pela porta de entrada do dono.

| Estado | Dono | Onde vive | Some quando |
|---|---|---|---|
| Semente e cursor do gerador | M1 | memória | recarrega a página |
| Placar, cobranças, fase, vencedor (`MatchState`) | M2 | memória | recarrega a página |
| Histograma de zonas do jogador na sessão | M3 | memória — **nunca** `localStorage` [Fonte: a_context/regras_partida.md#cpu-d-10] | recarrega a página |
| Catálogo de seleções (imutável) | M4 | bundle | nunca (resolve em build) |
| Modo, lado local, escolha pendente, nº de sequência | M5 | memória | recarrega a página |
| Conexão, ID de sala, relógio de timeout | M6 | memória | desconecta ou recarrega |
| Chaveamento do torneio | M8 | memória | recarrega a página **[a confirmar]** |
| Cena e animação | M7 | memória | troca de cena |
| Preferências do aparelho (nível, som, última seleção) | M7 | `localStorage` | o usuário limpa o navegador |

## Ordem de build

Dados/schema (M1, forma de M4) → domínio (M2, M3) → borda (M6, M5) → UI (M7, M8) → infra (M9).

**Dois desvios, ambos justificados:**

1. **O esqueleto de M9 vem primeiro (E-1), não por último.** O GitHub Pages serve o site num subcaminho, e o build padrão gera caminhos que só quebram *em produção*; e o teto de 8 MB é "número lido da saída do build", não estimativa [Fonte: a_context/a_context_source.md#critério-de-aceite]. Descobrir isso no dia 1 custa uma sessão; no dia da entrega, custa a entrega. O **portão** de M9 continua no fim (E-6) — o que antecipa é só o esqueleto.
2. **M8 (torneio) vem depois de M7, fora da ordem de camada.** Não é preferência: `Q-03` trava o conteúdo dele, e escrever M8 antes da resposta é escrever contra suposição.

## Módulos e contratos

> Nomes de arquivo e identificador em **inglês**; conteúdo de doc em português — é o que o padrão do repositório já manda [Fonte: b_process/e_repository_standard.md#3-nomes-de-arquivo]. A v1 usava identificador em português; a diferença é deliberada.
> Toda assinatura abaixo é o **contrato**, não a implementação: quem implementa pode mudar o miolo, não a porta.

### M1 — Núcleo (tipos e aleatoriedade com semente)

- **Recebe:** nada. Sem dependência, sem I/O.
- **Entrega:** os tipos compartilhados por todo o resto e um gerador pseudoaleatório determinístico.
- **Porta de entrada:** `src/core/index.ts`
  ```ts
  export type Zone = 'L' | 'C' | 'R';        // esquerda · meio · direita
  export type Side = 'A' | 'B';
  export type CountryCode = string;          // ISO-3166 alfa-2, 2 letras maiúsculas
  export interface Rng { int(limiteExclusivo: number): number; }   // inteiro em [0, limite)
  export function createRng(seed: number): Rng;
  export function newSeed(): number;         // a ÚNICA chamada a Math.random do projeto
  ```
- **Estado que possui:** o cursor interno do `Rng`.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-dominio]]
- **Portão:** dois `createRng(7)` produzem a mesma sequência de 1.000 valores · `int(3)` sorteia 0, 1 e 2, **com o 0 incluso** (defeito 3 da v1) [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · `grep -rn "Math.random" src/` retorna exatamente 1 ocorrência, dentro de M1.
- **Onde a stack vai doer:** `Math.random()` não aceita semente — o determinismo do aceite morre se qualquer módulo chamar direto. Não vale dependência nova: um gerador de 5 linhas (ex.: mulberry32) resolve, e biblioteca a mais é peso no bundle.

### M2 — Motor da disputa

- **Recebe:** um estado de disputa e uma cobrança (zona de quem cobra + zona de quem defende). Nada mais: não conhece jogador, CPU, rede nem tela.
- **Entrega:** o novo estado, imutável — placar, histórico, de quem é a vez, fase e vencedor.
- **Porta de entrada:** `src/engine/index.ts`
  ```ts
  export type Phase = 'regular' | 'alternadas' | 'encerrada';
  export interface Kick { side: Side; shot: Zone; dive: Zone; goal: boolean; }
  export interface MatchState {
    readonly kicks:  readonly Kick[];
    readonly goals:  Readonly<Record<Side, number>>;   // inteiro, nunca float
    readonly taken:  Readonly<Record<Side, number>>;
    readonly phase:  Phase;
    readonly turn:   Side | null;    // null quando encerrada
    readonly winner: Side | null;
  }
  export function createMatch(): MatchState;
  export function play(state: MatchState, shot: Zone, dive: Zone): MatchState;  // pura
  ```
- **Estado que possui:** `MatchState` — a verdade do placar. **Ninguém mais calcula placar.**
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-dominio]]
- **Portão:** um teste por invariante de [Fonte: a_context/regras_partida.md#invariantes] · um teste de regressão por defeito 1, 2, 4 e 5 da v1 [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · a suíte roda 2x com o mesmo placar. Em particular: morte matemática encerra a fase regular sem cobrança inútil, e **não** encerra no meio de uma rodada alternada — as duas cobranças da rodada sempre acontecem (`D-09`) · `play` sobre estado `'encerrada'` é rejeitada, não ignorada.
- **Onde a stack vai doer:** nada da stack ajuda aqui — nem Phaser nem Vite entram. O risco é humano: um `Date.now()`, um `Math.random()` ou uma linha de render dentro deste módulo derrubam o teste 2x. Por isso M2 não importa nada além de M1.

### M3 — CPU

- **Recebe:** o nível, o `Rng` de M1, e as zonas que o jogador humano usou nesta sessão.
- **Entrega:** uma zona por chamada, com os pesos de `D-10`.
- **Porta de entrada:** `src/cpu/index.ts`
  ```ts
  export type Level = 'facil' | 'medio' | 'dificil';   // peso do histórico: 0% · 50% · 70%
  export interface Cpu { observe(zone: Zone): void; pick(): Zone; }
  export function createCpu(level: Level, rng: Rng): Cpu;
  ```
- **Estado que possui:** o histograma de zonas do jogador na sessão, em memória.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-dominio]]
- **Portão:** histórico vazio → distribuição uniforme em qualquer nível · com o jogador repetindo uma zona, a frequência medida com que a CPU acerta essa zona **nunca passa de 70%**, em nível nenhum · mesma semente + mesmas entradas = mesmas escolhas · `grep -rn "localStorage" src/cpu/` retorna zero [Fonte: a_context/regras_partida.md#cpu-d-10].
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
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-dominio]]
- **Bloqueado por `Q-03`:** quantas e quais seleções entram. Contrato e testes podem ser feitos **agora**, com uma lista de fixação; a lista real só entra depois de A-04. Não inventar seleção [Fonte: a_context/regras_partida.md#lacunas-declaradas].
- **Portão:** todo `code` é ISO-3166 alfa-2 válido, e o `name` vem do código — nunca texto digitado livre [Fonte: a_context/a_context_source.md#stack] · todo arquivo em `flag` é local (zero URL, zero hotlink) e tem uma linha na tabela de procedência [Fonte: a_context/licenciamento.md#procedência-de-asset] · zero escudo de clube ou federação [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto].
- **Onde a stack vai doer:** bandeira é o único asset que multiplica por N. N × SVG cabe folgado no teto de 8 MB; N × PNG grande, não — e o número sai da saída do build, não de estimativa. **[a confirmar]** a origem das bandeiras: precisa de licença explícita **antes** de o arquivo entrar no repositório.

### M5 — Sessão de partida (o único caminho da tela até o motor)

- **Recebe:** a configuração do modo, a semente, o nível (só em `cpu`), as duas seleções e qual lado é o deste aparelho.
- **Entrega:** uma sessão que aceita **uma escolha de zona por vez**, providencia a outra zona (CPU, segundo jogador no mesmo aparelho, ou peer), chama M2 e notifica os assinantes.
- **Porta de entrada:** `src/session/index.ts`
  ```ts
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
- **Portão:** os três modos produzem o **mesmo** `MatchState` para a mesma sequência de zonas — é o teste que prova que a regra não foi duplicada (`D-01`) · evento remoto fora de ordem, repetido ou com zona inválida é descartado e **nunca chega a M2** [Fonte: a_context/regras_partida.md#invariantes] · `dispose()` fecha o canal e não deixa assinante vivo.
- **Onde a stack vai doer:** é aqui que o online contamina o resto se a fronteira vazar. `choose()` resolve na hora no modo local e espera a rede no online — a **assinatura tem de ser a mesma nos três modos**, senão M7 ganha um `if (mode === 'online')` e a tela passa a conhecer rede. `Q-04` bloqueia o comportamento quando o peer some no meio: até responder, o modo online não fecha E-4.

### M6 — Transporte online P2P

- **Recebe:** jogadas serializadas — dezenas de bytes cada [Fonte: a_context/online_p2p.md#como-funciona].
- **Entrega:** um canal com envio, recebimento e **status de conexão explícito, inclusive a falha**; e um ID de sala.
- **Porta de entrada:** `src/net/index.ts`
  ```ts
  export type LinkStatus = 'offline' | 'aguardando' | 'conectado' | 'falhou' | 'encerrado';
  export interface Move { seq: number; side: Side; zone: Zone; }
  export interface Channel {
    send(m: Move): void;
    onMove(fn: (m: Move) => void): void;
    onStatus(fn: (s: LinkStatus) => void): void;
    close(): void;
  }
  export function hostRoom(): { roomId: string; channel: Channel };
  export function joinRoom(roomId: string): Channel;
  ```
- **Estado que possui:** a conexão, o ID de sala e o relógio de timeout. **Nenhum estado de partida** — M6 não sabe o que é gol.
- **Skill responsável:** [[b_process/skills/microservice-sync/SKILL|microservice-sync]]
- **Portão:** `roomId` opaco e aleatório, nunca sequencial [Fonte: a_context/a_context_source.md#stack] · peer que não conecta vira `'falhou'` por **timeout explícito** — **[a confirmar: quantos segundos]** — e nunca tela travada [Fonte: a_context/online_p2p.md#riscos-que-precisam-de-fallback-escrito] · com a sinalização derrubada de propósito, `cpu` e `local` continuam jogáveis · taxa de conexão medida em **rede móvel real** antes de E-4 fechar [Fonte: a_context/online_p2p.md#a-lacuna-declarada].
- **Onde a stack vai doer:** 15-30% dos jogadores atrás de CGNAT não conectam sem TURN — e CGNAT é o padrão de operadora móvel, exatamente o público deste jogo. **O sandbox do agente não produz esse número:** é medição do dono, dois aparelhos, rede de operadora, não Wi-Fi de casa. Abaixo de 70%, abre o gatilho de revisão de `D-01`.

### M7 — Tela (Phaser)

- **Recebe:** `MatchState` e `LinkStatus` por assinatura em M5; as seleções por M4; o chaveamento por M8.
- **Entrega:** as cenas jogáveis por toque, com os 4 estados por tela, e a leitura/escrita das preferências do aparelho.
- **Porta de entrada:** `src/ui/main.ts` → `export function bootGame(container: HTMLElement): void`
- **Estado que possui:** cena/animação (memória) e **as preferências do aparelho** em `localStorage` — nível da CPU, som, última seleção. Só isso: `localStorage` não guarda partida nem histórico de zonas.
- **Skill responsável:** [[b_process/skills/frontend-uiux/SKILL|frontend-uiux]]
- **Portão:** fluxo crítico completo por toque em viewport 360x640 [Fonte: a_context/a_context_source.md#critério-de-aceite] · ≥30 fps no celular real do dono (abaixo disso abre o gatilho de `D-02`) · nenhum texto técnico vazando na tela ("ICE failed" não é mensagem de jogo) · um `grep` por import de `engine`, `cpu` ou `net` dentro de `src/ui/` retorna zero.
- **Onde a stack vai doer:** Phaser cabe (~345 KB min+gzip, `D-02`), mas em 360x640 as 3 zonas têm de ser **alvos de toque grandes**, não pixels do gol — e `localStorage` é do aparelho e não sincroniza, então preferência nunca vira "conta".

### M8 — Torneio

- **Recebe:** as seleções participantes e o `Rng`; depois, o resultado de cada partida.
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
- **Estado que possui:** o chaveamento. **[a confirmar]** se ele sobrevive a um reload — se sim, vira `localStorage` e muda o dono do estado.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-dominio]]
- **Bloqueado por `Q-03`:** número de participantes, formato do chaveamento e **o nome do torneio**, que não pode colidir com marca [Fonte: a_context/licenciamento.md#nome-do-torneio-no-jogo].
- **Portão:** com N participantes o torneio termina em exatamente N-1 partidas e um campeão — **[a confirmar: mata-mata simples]** · mesma semente = mesmo chaveamento · a CPU do torneio respeita o teto de 70%: nenhuma progressão de dificuldade passa disso [Fonte: a_context/regras_partida.md#cpu-d-10].
- **Onde a stack vai doer:** nada técnico. O custo aqui é conteúdo — e ele está em `Q-03`.

### M9 — Build e publicação

- **Recebe:** o código dos outros módulos.
- **Entrega:** o build estático publicado, e o **número** do bundle lido da saída do build.
- **Porta de entrada:** `vite.config.ts` + `.github/workflows/pages.yml`
- **Estado que possui:** a configuração de build (`base`, `outDir`). Nenhum estado de runtime.
- **Skill responsável:** [[b_process/skills/iac-docker-terraform/SKILL|iac-docker-terraform]] (sem Docker: o "empacotar e operar" deste projeto é build estático + Pages)
- **Portão:** `npx tsc --noEmit && npm run build` verdes na máquina do dono · bundle inicial < 8 MB **lido da saída**, nunca estimado · a página publicada carrega todos os assets sem 404 · nenhum segredo versionado [Fonte: a_context/a_context_source.md#critério-de-aceite].
- **Onde a stack vai doer:** o GitHub Pages de repositório serve em `/tapgo-v2/`, não na raiz. Com o `base` padrão, o build gera caminhos absolutos e **todo asset dá 404 só em produção** — verde no `npm run dev`, quebrado no ar. É a falha clássica desta combinação, e o motivo de E-1 publicar uma página vazia antes de existir jogo. HTTPS, que o WebRTC exige, o Pages já dá.

## Milestones com portão (cada uma só abre com o portão da anterior)

| Etapa | Abre quando | Portão de saída |
|---|---|---|
| **E-1 · Esqueleto que publica** | plano congelado (`D-NN`) | M1 + esqueleto de M9: `npx tsc --noEmit && npm run build` verdes · página no ar pelo Pages carregando um asset de teste **sem 404** · as duas checagens de camada já rodam (uma ocorrência de `Math.random`, zero import de motor na UI) |
| **E-2 · Motor sem tela** | E-1 fechada | M2 + M3: um teste por invariante de [[regras_partida]] · regressão dos 6 defeitos da v1 · suíte roda 2x com o mesmo placar · frequência da CPU medida ≤ 70% |
| **E-3 · Jogo local jogável** | E-2 fechada | M4 (lista de fixação) + M5 (`cpu`, `local`) + M7: disputa completa, 5 cobranças e alternadas, jogada **só por toque** em 360x640 no celular real do dono, terminando com o placar correto |
| **E-4 · Online por link** | E-3 fechada **e** `Q-04` respondida | M6 + M5 (`online`): dois aparelhos em **rede móvel real** completam uma disputa · taxa de conexão medida e registrada (número, não adjetivo) · falha mostra timeout honesto e os modos locais seguem intactos |
| **E-5 · Torneio** | E-3 fechada **e** `Q-03` respondida (A-04) | M8 + catálogo real: torneio termina com campeão · **toda** bandeira com linha na tabela de procedência de [[licenciamento]] · nome do torneio fora da lista-morta |
| **E-6 · Entrega** | E-4 **e** E-5 fechadas | todo o Critério de aceite do [[a_context_source|CONTEXT]] verde · `python scripts/check.py --historico-completo` verde |

E-4 e E-5 são paralelas de propósito: `Q-03` trava o torneio, **não** o online.

## Decisões que este plano pede para congelar (viram `D-NN` na aprovação)

1. **O plano em si** — módulos, camadas, portas de entrada e donos de estado. É o que T-02 aprova.
2. **Runner de teste.** `D-02` congelou a stack sem dizer com o que se testa, e **todo** portão de módulo depende de suíte. Proposta: Vitest — é o runner do próprio Vite, sem configuração extra e sem peso no bundle de produção. Precisa existir antes de E-2.
3. **Onde mora o `index.html`.** O padrão do repositório quer raiz limpa e todo código numa pasta; o Vite quer o `index.html` na raiz do projeto. Proposta: `root: 'src'` no `vite.config.ts`, com `src/index.html` e `outDir: '../dist'`. Alternativa: abrir exceção declarada no padrão. Precisa decidir antes de E-1.

## As 3 perguntas que mais mudariam este plano

1. **`Q-03` — quantas e quais seleções, e qual o nome do torneio.** Define o conteúdo de M4, o formato de M8 e o peso das bandeiras no bundle. É a única coisa que trava E-5.
2. **O torneio é só contra a CPU, ou também online?** Se for online, M8 passa a depender de M5 no modo `online` e o chaveamento vira estado compartilhado entre dois aparelhos — isso muda a camada 3 do plano, não um detalhe de implementação.
3. **`Q-04` — o que acontece com a disputa quando o peer some no meio.** Define o contrato de M5 e M6, e trava E-4. Hoje é lacuna declarada nos dois temas [Fonte: a_context/online_p2p.md#riscos-que-precisam-de-fallback-escrito].
