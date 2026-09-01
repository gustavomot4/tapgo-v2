---
tags: [plano]
status: congelado
tipo: plano
data: 2026-08-07
---
# PLANO.md — TAP GO v2

> Gerado na Fase 1b com [[b_process/skills/planner/SKILL|planner]] a partir do [[a_context_source|CONTEXT]].
> **CONGELADO em 2026-08-07 por `D-13`.** T-02 aprovado pelo dono; T-03 aprovado na passagem 2 ([[b_artifact_consistency_report_260807_1605|relatório 2]]): 5/5 restrições inegociáveis com portão, 6/6 critérios de aceite com número ou comando, zero CRÍTICO aberto.
> **Daqui em diante, mudança de rumo é `D-NN` novo — nunca replanejar do zero.** Editar este arquivo sem D-NN é o defeito que o congelamento existe para impedir.
> **Alterado em 2026-08-12 por `D-51`..`D-57`** (respostas de `Q-03` e `Q-05`): mudam **M4**, **M8**, a tabela de donos de estado, a ordem de build e **E-5**. Nada foi replanejado — cada mudança tem a linha de decisão que a autoriza, e o resto do plano é o de `D-13`.
> Histórico das duas revisões: 19 achados da [[a_artifact_consistency_report_260807_1543|passagem 1]] (os três CRÍTICOS viraram `QA-01`..`QA-03`) e 7 da [[b_artifact_consistency_report_260807_1605|passagem 2]] (`AC-20`..`AC-26`), todos fechados antes do congelamento.
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
| M8 | Torneio | 3 | M1 M2 M3 M4 (`D-57`) | 3 |
| M7 | Tela (Phaser) | 4 | M1 M4 M5 M8 | 3 |
| M9 | Build e publicação | — | ninguém importa, e ele não importa ninguém | 5 |

**M8 não importa M5** (`D-57`). A disputa do jogador é conduzida por M7 **através** de M5 e volta para M8 por `report()`; as disputas sem o jogador M8 simula sozinho com M2 + M3. O motivo é o contrato de M5: `choose()` é a escolha **deste aparelho**, então uma sessão de M5 nunca anda sem alguém escolhendo — e num torneio de 64 disputas a maioria não tem ninguém. A camada continua 3 porque a regra é "a seta só aponta para baixo", e M8 passou a apontar só para as camadas 0 e 1.

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
| Chaveamento do torneio, **vivo** | M8 | memória | o jogador abandona o torneio, ou recarrega |
| Cena e animação | M7 | memória | troca de cena |
| Preferências do aparelho (nível, som, última seleção) | M7 | `localStorage` | o usuário limpa o navegador |
| **Cópia salva** do chaveamento (`D-57`) | M7 | `localStorage` | o usuário limpa o navegador |

**As duas linhas do torneio são dois estados, não um estado com dois donos** (`D-57`, que fecha a ressalva "a confirmar em E-5" de `D-13`). O chaveamento vivo é de M8 e mora na memória; a cópia salva é o retrato que `toJSON()` produz, e é de M7 — M8 não a lê nem a escreve, e ao recarregar quem reconstrói o vivo a partir dela é M7, chamando `restoreTournament`. Sem essa separação, o mesmo dado teria dois donos e a regra acima cairia.

### As 5 restrições inegociáveis × o portão que verifica cada uma

Esta tabela existe porque a primeira versão do plano deixou três delas sem checagem em módulo nenhum — os CRÍTICOS `QA-01`, `QA-02` e `QA-03`. Restrição sem portão é declaração de intenção.

| Restrição do [[a_context_source|CONTEXT]] | Portão que a verifica |
|---|---|
| Custo R$ 0 permanente; build estático | M9: tabela de custo de [[stack]] completa, toda linha "não pede cartão" · M6: TURN com dono e com linha nessa tabela |
| Nenhuma marca de terceiro | M4 (bandeira e código ISO) · **M7 (uniforme, jogador, texto de tela, `assets/` inteiro)** · E-5 (nome do torneio = **TAP GO Cup**, `D-55`) |
| Nenhum segredo versionado | M9 + `scripts/check.py` |
| Nenhum dado pessoal coletado | "sem conta" é estrutural (`D-01`, sem backend) · **M9: zero script externo, zero endpoint externo fora da sinalização de M6** · M3 e M7: o que pode ir para `localStorage` |
| Não inventar dado; lacuna declarada fica declarada | nenhum `[a confirmar]` dentro de portão (só em prosa e na tabela de estado) · toda lacuna que trava etapa é `Q-NN` no DECISIONS |

### As representações obrigatórias × onde são verificadas

| Representação | Onde é verificada |
|---|---|
| Placar e contadores em inteiro, nunca float | portão de M2 (`Number.isInteger` em toda transição) |
| ID de sala opaco e aleatório, nunca sequencial | portão de M6 |
| País por código ISO-3166 alfa-2, nunca nome digitado | portão de M4 — **ampliado por `D-52`**: alfa-2, e alfa-2+subdivisão (`GB-ENG`) só onde a alfa-2 não existe. A parte que não afrouxou é a que importa: continua sendo **código**, nunca nome digitado |
| Datas UTC ISO-8601 | **não-aplicável declarado:** o v2 não produz nem persiste data em runtime. O único relógio é o timeout de M6, que compara instantes e não guarda nenhum. Se algum módulo passar a persistir data, esta linha vira portão |
| Arquivos UTF-8 | garantido fora do código, pelo `.gitattributes` (LF) e pelo padrão do repositório — nenhum módulo escreve arquivo |

## Ordem de build

Dados/schema (M1, forma de M4) → domínio (M2, M3, **M8**) → borda (M6, M5) → UI (M7) → infra (M9).

> **M8 estava em "UI" e voltou para "domínio" em 2026-08-12** (`D-57`). Não é reclassificação cosmética: M8 virou consumidor de M2 e M3, não da tela.

**Dois desvios, ambos justificados:**

1. **O esqueleto de M9 vem primeiro (E-1), não por último.** O GitHub Pages serve o site num subcaminho, e o build padrão gera caminhos que só quebram *em produção*; e o teto de 8 MB é "número lido da saída do build", não estimativa. Descobrir isso no dia 1 custa uma sessão; no dia da entrega, custa a entrega. O **portão** de M9 continua no fim (E-6) — o que antecipa é só o esqueleto.
2. ~~**M8 (torneio) vem depois de M7, fora da ordem de camada.**~~ **O desvio acabou em 2026-08-12:** `Q-03` e `Q-05` foram respondidas (`D-51`..`D-56`), e M8 volta para a ordem normal de camada — domínio antes da UI. A **tela** do torneio (M7 em E-5) continua depois de M8, agora por dependência real e não por espera: ela lê o chaveamento pela porta de M8.

## Módulos e contratos

> Toda assinatura abaixo é o **contrato**, não a implementação: quem implementa pode mudar o miolo, não a porta.

### M1 — Núcleo (tipos e aleatoriedade com semente)

- **Recebe:** nada. Sem dependência, sem I/O.
- **Entrega:** os tipos compartilhados por todo o resto e um gerador pseudoaleatório determinístico.
- **Porta de entrada:** `src/core/index.ts`
  ```ts
  export type Zone = 'L' | 'C' | 'R';        // esquerda · meio · direita
  export type Side = 'A' | 'B';
  export type CountryCode = string;          // ISO-3166: alfa-2, ou alfa-2+subdivisão (GB-ENG) onde
                                             // a alfa-2 não existe — ampliado por D-52; quem valida é M4
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
  export type Role  = 'shooter' | 'keeper';         // cobrando · defendendo
  export interface Cpu {
    observe(role: Role, zone: Zone): void;          // o que o HUMANO escolheu, no papel dele
    pick(role: Role): Zone;                         // o que a CPU escolhe, no papel dela
  }
  export function createCpu(level: Level, rng: Rng): Cpu;
  ```
- **Estado que possui:** **dois** histogramas, um por papel, em memória. A distribuição de zonas de quem cobra não é a mesma de quem defende; um histograma só as leria como uma, e quem implementasse lendo apenas o contrato escolheria sozinho qual dos dois comportamentos vale. O teto de 70% vale para **cada** histograma, separadamente.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **Portão:** histórico vazio → distribuição uniforme em qualquer nível · com o jogador repetindo uma zona, a frequência medida com que a CPU acerta essa zona **nunca passa de 70%**, em nível nenhum · **o histórico de um papel não desloca a escolha do outro** (encher `shooter` de `'L'` não muda a distribuição de `pick('keeper')`) · mesma semente + mesmas entradas = mesmas escolhas · `grep -rn "localStorage" src/cpu/` retorna zero [Fonte: a_context/regras_partida.md#cpu-d-10].
- **Onde a stack vai doer:** o teto de 70% se fura por acidente na soma dos pesos. "70% na zona mais provável, senão uniforme entre as 3" dá **80%** de acerto efetivo (0,70 + 0,30/3), e viola `D-10` sem que ninguém veja no código. O teste tem de **medir frequência** sobre milhares de sorteios com semente fixa, não conferir a fórmula no olho.

### M4 — Catálogo de seleções

- **Recebe:** nada em runtime — é dado curado que entra no bundle.
- **Entrega:** a lista de seleções jogáveis e a busca por código.
- **Porta de entrada:** `src/data/teams.ts`
  ```ts
  export interface Team { code: CountryCode; name: string; flag: string | null; }  // caminho LOCAL, nunca URL;
  // `null` = seleção ainda sem arquivo de bandeira (D-22); deixa de existir quando T-19 trouxer os 32 SVGs
  export function listTeams(): readonly Team[];
  export function findTeam(code: CountryCode): Team | undefined;
  ```
- **Estado que possui:** o catálogo (imutável, resolvido em build).
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **`Q-03` respondida em 2026-08-12 — o que era lacuna virou número:** são **32 seleções**, as 32 primeiras do snapshot de ranking de 20/07/2026 (`D-51`); os 32 códigos, as duas fontes e a data de leitura estão em [[m4_lista_das_32]], e é de lá que a lista sai — não da memória de quem implementa [Fonte: a_context/c_decisions.md#decisões]. As bandeiras vêm do **flag-icons** (MIT, `D-54`).
- **`code` deixou de ser só alfa-2 (`D-52`, confirmado pelo dono em 2026-08-12 — `D-58`).** A 4ª colocada é a Inglaterra, que **não tem** código ISO-3166-1 — a alfa-2 `GB` é o Reino Unido inteiro. Ela entra como `GB-ENG` (ISO 3166-2), e nenhuma outra das 32 precisa da ampliação: as outras 31 são alfa-2 válidas.
- **Portão:** exatamente **32** entradas, sem código repetido · todo `code` é alfa-2 válido **ou** o `GB-ENG` de `D-52`, e um teste falha se aparecer um segundo código fora da alfa-2 sem `D-NN` novo · o `name` vem do código pelo ICU, com **uma** exceção nomeada em teste (a de `GB-ENG`) — nunca texto digitado livre · todo arquivo em `flag` é local (zero URL, zero hotlink) e tem linha na tabela de procedência, e o texto da licença do flag-icons está no repositório [Fonte: a_context/licenciamento.md#procedência-de-asset] · zero escudo de clube ou federação [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto] · `CATALOG_IS_FIXTURE` vira `false` e o teste que hoje falha de propósito passa a cobrar o catálogo real.
- **Onde a stack vai doer:** **o portão "nome vem do código" não sobrevive inteiro a `GB-ENG`.** Medido no Node 22: `new Intl.DisplayNames(['pt'],{type:'region'}).of('GB-ENG')` lança `RangeError` — o ICU resolve região, não subdivisão. Ou seja, o nome da Inglaterra é o **único** literal do catálogo, e o teste de `D-23` precisa de uma exceção **nomeada** (uma lista de exceções de tamanho 1), não de um afrouxamento geral: afrouxar devolve o buraco que o portão fechou. Bandeira também é o único asset que multiplica por N — 32 × SVG cabe folgado no teto de 8 MB; 32 × PNG grande, não, e o número sai da saída do build.

### M5 — Sessão de disputa (o único caminho da tela até o motor)

- **Recebe:** a configuração do modo, a semente, o nível (só em `cpu`), as duas seleções e qual lado é o deste aparelho.
- **Entrega:** uma sessão que aceita **uma escolha de zona por vez**, providencia a outra zona (CPU, segundo jogador no mesmo aparelho, ou peer), chama M2 e notifica os assinantes.
- **Porta de entrada:** `src/session/index.ts`
  ```ts
  export type { MatchState } from '../engine';   // reexporta: a UI tipa sem importar o motor
  export type { LinkStatus } from '../net';      // idem para o status do canal
  export type { Level }      from '../cpu';      // idem: é M7 quem guarda o nível e monta o config

  export type Mode = 'cpu' | 'local' | 'online';
  export interface SessionConfig {
    mode: Mode; seed: number; level?: Level;
    teams: Record<Side, CountryCode | null>;   // `D-90`: `null` só no `online`, e só no lado remoto
    localSide: Side; roomId?: string;
  }
  export interface Session {
    state(): MatchState;
    choose(zone: Zone): void;                                        // a escolha deste aparelho
    // `D-90`: o 3º argumento é como M7 sabe a seleção do OUTRO sem um 5º método.
    subscribe(fn: (s, link, teams: Record<Side, CountryCode | null>) => void): () => void;
    dispose(): void;
  }
  export function createSession(cfg: SessionConfig): Session;
  ```
- **`D-90` reabriu esta porta, e só nisto:** `teams` aceita `null` no lado remoto do `online` até o `Pick` do outro aparelho chegar, e esse `null` **é** o estado de espera da tela — enquanto ele estiver ali, M7 não deixa cobrar. `assertConfig` segue recusando `null` em `cpu`/`local` e no `localSide` de qualquer modo. Ver [[t31_selecao_por_aparelho]].
- **Estado que possui:** modo, lado local, escolha pendente da rodada e nº de sequência do peer. **Não** possui placar — placar é de M2.
- **Skill responsável:** [[b_process/skills/backend-bff/SKILL|backend-bff]]
- **Portão:** os três modos produzem o **mesmo** `MatchState` para a mesma sequência de zonas — é o teste que prova que a regra não foi duplicada (`D-01`) · evento remoto fora de ordem, repetido ou com zona inválida é descartado e **nunca chega a M2** [Fonte: a_context/regras_partida.md#invariantes] · `dispose()` fecha o canal e não deixa assinante vivo · **os três tipos de fora que a porta de M5 usa — `MatchState`, `LinkStatus` e `Level` — são reexportados por ela**; a regra é "todo tipo que aparece na assinatura de M5 sai por M5", senão o portão de camada de M7 vira impossível de cumprir para o tipo esquecido.
- **Onde a stack vai doer:** é aqui que o online contamina o resto se a fronteira vazar. `choose()` resolve na hora no modo local e espera a rede no online — a **assinatura tem de ser a mesma nos três modos**, senão M7 ganha um `if (mode === 'online')` e a tela passa a conhecer rede. `Q-04` bloqueia o comportamento quando o peer some no meio: até responder, o modo online não fecha E-4.

### M6 — Transporte online P2P

- **Recebe:** jogadas serializadas — dezenas de bytes cada [Fonte: a_context/online_p2p.md#como-funciona].
- **Entrega:** um canal com envio, recebimento e **status de conexão explícito, inclusive a falha**; e um ID de sala.
- **Porta de entrada:** `src/net/index.ts`
  ```ts
  export type LinkStatus = 'idle' | 'waiting' | 'connected' | 'failed' | 'closed';
  export interface Move { seq: number; side: Side; zone: Zone; }
  export interface Pick { side: Side; team: CountryCode; }   // `D-90`: a seleção de QUEM manda
  export type Payload = Move | Pick;                         // `D-90`
  export interface IceConfig { turn?: { urls: string; username: string; credential: string } }
  export interface Channel {
    send(p: Payload): void;                  // `D-90`: era `send(m: Move)`
    onMove(fn: (p: Payload) => void): void;  // `D-90`: quem discrimina é M5, não M6
    onStatus(fn: (s: LinkStatus) => void): void;
    close(): void;
  }
  export function hostRoom(ice?: IceConfig): { roomId: string; channel: Channel };
  export function joinRoom(roomId: string, ice?: IceConfig): Channel;
  ```
- **`D-90` reabriu esta porta, e só nisto:** o fio passou a carregar `Pick` ao lado de `Move`, pelos **mesmos 4 métodos** — um 5º (`onPick`) é o precedente que `D-39` recusou. M6 continua sem interpretar o que carrega: quem valida o código de país é M5, com `assertCatalogCode` (`D-61`). Custo, mortas e portão em [[t31_selecao_por_aparelho]].
- **Estado que possui:** a conexão, o ID de sala e o relógio de timeout. **Nenhum estado de disputa** — M6 não sabe o que é gol.
- **Skill responsável:** [[b_process/skills/microservice-sync/SKILL|microservice-sync]]
- **TURN tem dono, e o dono é este módulo.** `IceConfig` existe para que o relay seja configurável sem tocar em mais nada. Duas saídas, e o plano exige que uma seja escolhida em E-4, por escrito: (a) usar uma camada gratuita de TURN, que então **ganha linha na tabela de custo** de [[stack]] e é verificada pelo portão de M9; ou (b) declarar TURN fora de escopo, e nesse caso o portão de E-4 registra **quantos por cento ficam sem online** — não "alguns jogadores" [Fonte: a_context/online_p2p.md#a-lacuna-declarada].
- **Portão:** `roomId` opaco e aleatório, nunca sequencial · **defeito 6 da v1 não se repete:** o ID é gerado no cliente porque não há servidor, então ele não pode ser previsível nem colidir entre abas, e **nenhuma decisão de disputa deriva dele** — quem valida jogada é M5 contra o `MatchState` de M2 [Fonte: a_context/regras_partida.md#defeitos-medidos-na-v1] · peer que não conecta em **20 s** vira `'failed'`, com mensagem, nunca tela travada [Fonte: a_context/online_p2p.md#riscos-que-precisam-de-fallback-escrito] · com a sinalização derrubada de propósito, `cpu` e `local` continuam jogáveis · toda dependência e todo host que este módulo alcança têm linha na tabela de custo de [[stack]].
- **Onde a stack vai doer:** 15-30% dos jogadores atrás de CGNAT não conectam sem TURN — e CGNAT é o padrão de operadora móvel, exatamente o público deste jogo. **O sandbox do agente não produz esse número:** é medição do dono, dois aparelhos, rede de operadora, não Wi-Fi de casa. Os 20 s do timeout são escolha técnica deste plano, não medição: longos o bastante para o ICE completar em rede móvel, curtos o bastante para a tela não parecer travada. E-4 pode ajustá-los com o número na mão.

### M7 — Tela (Phaser)

- **Recebe:** `MatchState` e `LinkStatus` pela porta de M5 (que os reexporta); as seleções por M4; o chaveamento por M8.
- **Entrega:** as cenas jogáveis por toque, com os 4 estados por tela, e a leitura/escrita das preferências do aparelho.
- **Porta de entrada:** `src/ui/main.ts` → `export function bootGame(container: HTMLElement): void`
- **Estado que possui:** cena/animação (memória) e, em `localStorage`, **as preferências do aparelho** (nível da CPU, som, última seleção) **e o torneio salvo** — o `TournamentState` que M8 devolve por `toJSON()` (`D-57`). Só isso: `localStorage` não guarda disputa em andamento, histórico de zonas nem nada que identifique a pessoa. O torneio salvo cabe nessa regra porque é código de país e inteiro, e nada mais — o portão abaixo cobra isso por teste, não por promessa.
- **Skill responsável:** [[b_process/skills/frontend-uiux/SKILL|frontend-uiux]]
- **Portão — jogabilidade:** fluxo crítico completo por toque em viewport 360x640 · ≥30 fps no celular real do dono (abaixo disso abre o gatilho de `D-02`) · nenhum texto técnico vazando na tela ("ICE failed" não é mensagem de jogo).
- **Portão — camada:** `grep` por import de `src/engine`, `src/cpu` ou `src/net` dentro de `src/ui/` retorna zero (os tipos vêm de M5 e de M8).
- **Portão — o que M7 grava:** o que vai para `localStorage` é conferido por teste contra uma lista fechada de chaves, e o torneio salvo só contém código de país e número — zero texto livre, zero data, zero identificador de aparelho. **Torneio salvo que não desserializa é descartado em silêncio e o jogo abre no menu**, nunca numa tela quebrada: o dado vem do navegador do jogador, que pode ter sido editado à mão ou ficado de uma versão anterior.
- **Portão — licença (M7 é quem desenha, e por isso é aqui que a restrição morde):**
  - **todo** arquivo em `assets/` — não só bandeira — tem linha na tabela de procedência de [[licenciamento]]; sem linha, não entra no repositório [Fonte: a_context/licenciamento.md#procedência-de-asset];
  - zero uniforme oficial identificável de clube ou seleção; zero nome, apelido, rosto ou número de jogador real [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto];
  - `grep -rniE "fifa|copa do mundo|world cup|brasileir[ãa]o|libertadores|champions league"` em `src/` e em `assets/` retorna zero.
- **Onde a stack vai doer:** Phaser cabe (~345 KB min+gzip, `D-02`), mas em 360x640 as 3 zonas têm de ser **alvos de toque grandes**, não pixels do gol. E o primeiro asset que não é bandeira nasce aqui, em E-3 — três etapas antes da varredura de `assets/` de E-6. Por isso a procedência é portão deste módulo, e não só da entrega.

### M8 — Torneio

> **Acrescentado por `D-111`** (`P-3`): a porta ganha `chaveamento(state)`, função de leitura sobre o **retrato** — não método em `Tournament`, que segue com os 5 de `D-13`/`D-58`. O retrato continua **opaco para M7** (`D-68`): quem deriva as 64 é M8, e M7 recebe `Disputa[]` pronto. Entrega e portão abaixo.

> **Alterado por `D-57`**, que supersede `D-13` **só no que M8 exige**: cai o portão "sem par repetido", a porta passa a serializar, e M8 importa M2/M3. O resto de `D-13` segue de pé.

- **Recebe:** as 32 participantes, **qual delas é a do jogador**, o nível da CPU e a semente. Depois, só o vencedor de cada disputa **do jogador**.
- **Entrega:** a próxima disputa do jogador, a rodada, a classificação, o campeão — e a **forma serializada** do chaveamento, para M7 gravar.
- **Porta de entrada:** `src/tournament/index.ts`
  ```ts
  export type { Level } from '../cpu';   // reexporta: M7 monta o config sem importar M3

  export type Stage = 'groups' | 'r16' | 'quarter' | 'semi' | 'third' | 'final';
  export interface TournamentConfig {
    entrants: readonly CountryCode[];    // 32 (D-51)
    human: CountryCode;                  // a do jogador; as outras disputas são simuladas
    level: Level;                        // UM valor: sem progressão (D-60); teto de 70% (D-10)
    seed: number;
  }
  export interface Standing {                        // linha da tabela de um grupo
    code: CountryCode; wins: number; goalsFor: number; goalsAgainst: number;
  }
  export interface TournamentState { /* opaco para quem lê; estável para quem grava */ }
  export interface Tournament {
    current(): { teams: Record<Side, CountryCode>; stage: Stage; round: number } | null;
    report(winner: Side): void;          // só a disputa DO JOGADOR entra por aqui
    group(code: CountryCode): readonly Standing[];    // a tabela do grupo de `code`
    champion(): CountryCode | null;
    toJSON(): TournamentState;           // quem PERSISTE é M7 (D-57)
  }
  export function createTournament(cfg: TournamentConfig): Tournament;
  export function restoreTournament(state: TournamentState): Tournament;

  // ── acrescentado por `D-111` (`P-3`): o chaveamento inteiro, LIDO ──────────────────
  export interface Disputa {
    readonly stage: Stage;
    readonly round: number;
    readonly group: number;              // 0..7 nos grupos; -1 no mata-mata
    readonly teams: Record<Side, CountryCode>;
    readonly winner: Side | null;        // `null` = ainda não jogada
    readonly goals: Record<Side, number> | null;  // `null` = placar AUSENTE (D-67), nunca 0
  }
  /** As disputas cujo par M8 já decidiu, na ordem da fila. Pura: não toca o gerador. */
  export function chaveamento(state: TournamentState): readonly Disputa[];
  ```
- **A assinatura mudou, e a mudança é o ponto** (aprovada pelo dono em `D-58`). `D-13` tinha `createTournament(entrants, rng)`; agora M8 recebe a **semente**, não um `Rng` pronto. É o que torna `D-57` possível: um `Rng` que veio de fora tem cursor que M8 não controla nem sabe serializar, e o torneio restaurado sortearia de um estado diferente. `report()` continua recebendo só o vencedor, e `current()` ganhou `stage` porque "rodada 4" não diz se é oitavas ou terceira rodada de grupo.
- **Estado que possui:** o chaveamento e o cursor do próprio gerador. A **cópia salva** é de M7 (tabela de donos de estado) — M8 não conhece `localStorage`, e um `grep -rn "localStorage" src/tournament/` no portão prova isso.
- **Skill responsável:** [[b_process/skills/backend-domain/SKILL|backend-domain]]
- **A dificuldade não sobe (`D-60`).** O torneio inteiro roda no nível escolhido no início — grupos e final iguais. `TournamentConfig.level` é **um** valor, e isso agora é decisão: `D-13` falava em "nenhuma progressão passa dos 70%" sem que ninguém tivesse decidido que havia progressão, e uma frase assim é convite para alguém implementar uma.
- **O sorteio dos grupos é CEGO (`D-59`).** As 32 caem nos 8 grupos direto pelo `Rng`, sem potes e sem cabeça de chave — o dono escolheu variância, e o custo está medido: **50,2%** das sementes põem ao menos duas das quatro primeiras no mesmo grupo, e **9,7%** juntam a 1ª com a 2ª. Isso é o comportamento pretendido, não defeito: um teste que reprovasse "grupo forte demais" estaria reprovando `D-59`.
- **O formato, em número (`D-53`):** 8 grupos de 4 = **48** disputas de grupo · mata-mata de 16 = 8 + 4 + 2 + 1 = **15** · disputa de 3º lugar = **1**. Total **64**. Classifica-se por **vitórias** — a disputa nunca empata (`D-09`), então não há ponto de empate a distribuir —, e o desempate é, nesta ordem: **confronto direto → saldo → gols → sorteio** com o `Rng` (`D-53`).
- **Quem joga o quê:** a disputa do jogador sai por `current()`, é conduzida por M7 **através de M5** e volta por `report(winner)`. Todas as outras M8 simula sozinho, chamando M2 com duas CPUs de M3 — **é por isso que M8 passou a importar M2 e M3** (`D-57`). M5 não serve para isso: `choose()` é a escolha *deste aparelho*, e uma sessão de M5 fica parada esperando alguém que, nas disputas dos outros, não existe. **A conta:** o jogador disputa de **3 a 7** das 64 — 3 na fase de grupos, mais até 4 no mata-mata (oitavas, quartas, semi, e final **ou** 3º lugar) —, então M8 simula entre **57 e 61**.
- **O jogador eliminado não encerra o torneio.** Sai da conta: 64 disputas com um campeão é o portão, e um torneio que para na eliminação entrega menos que 64. No `report()` que elimina o jogador, M8 simula tudo o que falta de uma vez; a partir daí `current()` devolve `null` e `champion()` devolve o vencedor.
- **Portão:** o torneio termina em **exatamente 64 disputas** com **um** campeão, contadas por instrumentação e não por inspeção · a mesma semente com a mesma seleção do jogador dá o mesmo chaveamento e o mesmo campeão, **duas execuções seguidas** · **`toJSON()` no meio e `restoreTournament()` reproduzem exatamente a mesma linha do tempo até o campeão** que a execução sem recarregar — é o teste que prova a sobrevivência ao reload, e sem ele "serializa" é só uma assinatura · um teste por critério de desempate, **na ordem**, e o sorteio só é alcançado quando os três anteriores empatam · dentro da fase de grupos **nenhum par se repete** (as 48 são as 6 combinações de cada grupo) · **o sorteio é cego e uniforme**: sobre milhares de sementes, cada seleção cai em cada um dos 8 grupos com frequência dentro de faixa declarada — mesmo método do portão de M3, frequência medida e não fórmula conferida no olho · e **existe semente em que a 1ª e a 2ª do catálogo dividem grupo**, que é o teste que reprova quem introduzir potes: com cabeça de chave essa semente não existiria · `current()` sempre devolve um par que contém a seleção do jogador · todo participante existe em M4 · a CPU roda no nível recebido do começo ao fim, sem subir de rodada (`D-60`), e respeita o teto de 70% [Fonte: a_context/regras_partida.md#cpu-d-10] · `grep -rn "Math.random" src/` continua em 1 e `grep -rn "localStorage" src/tournament/` em 0.
- **Portão de `chaveamento(state)` (`D-111`).** `chaveamento` é **pura**: duas chamadas sobre o mesmo retrato dão listas iguais campo a campo, e o retrato sai idêntico ao que entrou — inclusive `consumed`, que é o que prova que ela não sorteou (ler não pode fechar grupo, e fechar grupo consome `Rng`) · **só o que M8 já decidiu entra**: a lista tem **48** enquanto `groupOrder` está vazio, **56** assim que ele fecha, e **64** quando há campeão — nunca um par de fase que ainda depende de resultado · para toda disputa já jogada, `winner` é o MESMO vencedor da linha do tempo de M8, conferido contra `group()` e `champion()` na mesma semente · `goals` é `null` **exatamente** nas disputas do jogador e em nenhuma outra (`D-67`/`Q-13`: ausência declarada, nunca `0`) · e a opacidade de `D-68` vira varredura de disco no portão de camada de M7: `grep -rnE "\.(entrants|groupOrder|results|goalsA|goalsB)\b" src/ui/` devolve **zero**, que é o teste que reprova quem reintroduzir a saída (a) pela porta dos fundos.
- **O portão "sem par repetido" de `D-13` foi retirado (`D-57`), não esquecido.** Ele era verdadeiro num mata-mata puro e é **falso** neste formato: duas seleções do mesmo grupo se reencontram no mata-mata por construção, e um portão que reprova o comportamento correto seria removido no primeiro teste vermelho — melhor removê-lo aqui, com a linha de decisão que explica por quê. O que sobrou dele é a versão verdadeira: sem par repetido **dentro da fase de grupos**.
- **Onde a stack vai doer:** **restaurar o chaveamento não restaura o gerador.** A porta de M1 (`Rng`) expõe `int()` e mais nada — não há cursor para ler nem para escrever —, então um torneio restaurado continuaria sorteando de um estado diferente e as simuladas divergiriam, com o teste de determinismo passando (ele não recarrega) e o jogo mentindo em campo. A saída que **não** toca porta congelada: `TournamentState` guarda a semente e **quantos sorteios foram consumidos**, e `restoreTournament` refaz o `Rng` descartando essa quantidade — alguns milhares de `int()`, custo irrelevante. A outra saída seria dar um cursor a M1, e isso é porta congelada por `D-13`: exigiria `D-NN` próprio. O segundo lugar onde dói é o volume: 64 disputas × ~12 cobranças é o dobro do que o motor já roda num teste, e o teste de determinismo roda tudo **duas vezes** — se M2 ou M3 tiverem alocação por cobrança, é aqui que a suíte fica lenta, não em E-2.

### M9 — Build e publicação

- **Recebe:** o código dos outros módulos.
- **Entrega:** o build estático publicado, e o **número** do bundle lido da saída do build.
- **Porta de entrada:** `vite.config.ts` + `.github/workflows/pages.yml`
- **Estado que possui:** a configuração de build (`base`, `root`, `outDir`). Nenhum estado de runtime.
- **Skill responsável:** [[b_process/skills/iac-docker-terraform/SKILL|iac-docker-terraform]] (sem Docker: o "empacotar e operar" deste projeto é build estático + Pages)
- **Portão — build:** `npx tsc --noEmit && npm run build` verdes na máquina do dono · bundle inicial < 8 MB **lido da saída**, nunca estimado · a página publicada carrega todos os assets sem 404 · nenhum segredo versionado.
- **Portão — custo (a restrição "R$ 0" só existe se for verificada aqui):** toda dependência de runtime e todo endpoint externo que o build publicado alcança têm linha na tabela de custo de [[stack]], cada uma com a camada usada e a confirmação de que ela **não exige cartão**; host que aparece no `dist/` e não está na tabela reprova.
- **Portão — privacidade:** zero `<script>` de origem externa no HTML publicado · zero endpoint externo em runtime fora de **três** exceções nominais de M6 — sinalização, relay e os **STUN de descoberta de endereço** (`D-71`) · nenhuma chamada de telemetria, analytics ou fonte remota.
- **Onde a stack vai doer:** o GitHub Pages de repositório serve em `/tapgo-v2/`, não na raiz. Com o `base` padrão, o build gera caminhos absolutos e **todo asset dá 404 só em produção** — verde no `npm run dev`, quebrado no ar. É a falha clássica desta combinação, e o motivo de E-1 publicar uma página vazia antes de existir jogo. HTTPS, que o WebRTC exige, o Pages já dá.

## Milestones com portão (cada uma só abre com o portão da anterior)

| Etapa | Abre quando | Portão de saída |
|---|---|---|
| **E-1 · Esqueleto que publica** | plano congelado (`D-13`) — **aberta desde 2026-08-07** | M1 + esqueleto de M9: `npx tsc --noEmit && npm run build` verdes · página no ar pelo Pages carregando um asset de teste **sem 404** · as duas checagens de camada já rodam (uma ocorrência de `Math.random`, zero import de motor na UI) |
| **E-2 · Motor sem tela** | E-1 fechada | M2 + M3: um teste por invariante de [[regras_partida]] · regressão dos defeitos **1, 2, 4 e 5** da v1 em M2 e do **3** em M1 — o defeito 6 é de ID de sala e fecha em M6 (E-4) · `Number.isInteger` em toda transição de placar · frequência da CPU medida ≤ 70% em cada papel · suíte roda 2x com o mesmo placar |
| **E-3 · Jogo local jogável** | E-2 fechada | M4 (lista de fixação) + M5 (`cpu`, `local`) + M7: disputa completa, 5 cobranças e alternadas, jogada **só por toque** em 360x640 no celular real do dono, terminando com o placar correto · todo asset novo com linha de procedência |
| **E-4 · Online por link** | E-3 fechada **e** `Q-04` respondida | M6 + M5 (`online`): dois aparelhos em **rede móvel real** completam uma disputa · **duas medições, não uma:** a taxa **sem TURN** é medida e registrada sempre — é ela que alimenta o gatilho de revisão de `D-01` — e o corte de **≥ 70% é cobrado sobre a configuração que efetivamente vai ao ar**. Se TURN ficar fora de escopo as duas são a mesma medição, e o pior caso declarado em [[online_p2p]] (30% falhando) cai **exatamente** no corte: passa raspando, deixando 30% sem online — é o cenário em que a decisão de TURN tem de estar escrita com percentual, não com adjetivo · decisão de TURN escrita: camada gratuita com linha na tabela de custo, **ou** fora de escopo com o percentual sem online registrado · falha mostra timeout honesto em 20 s e os modos locais seguem intactos |
| **E-5 · Torneio** | **ABERTA em 2026-08-12:** E-3 fechada, `Q-03` respondida (`D-51`, `D-53`, `D-54`, `D-55`) e `Q-05` respondida (`D-56`) | M8 + tela de torneio (M7) + catálogo real: o torneio termina com campeão em **exatamente 64 disputas**, jogável de ponta a ponta por toque · **o torneio sobrevive a um reload no meio** — fechar e reabrir o navegador continua de onde parou (`D-57`) · **toda** bandeira e todo asset novo com linha de procedência em [[licenciamento]], mais o texto da licença do flag-icons · o nome **TAP GO Cup** passa no `grep` da lista-morta |
| **E-6 · Entrega** | E-4 **e** E-5 fechadas | todo o Critério de aceite do [[a_context_source|CONTEXT]] verde · tabela de custo de [[stack]] sem linha em branco · `python scripts/check.py --historico-completo` verde |

E-4 e E-5 são paralelas de propósito: `Q-03` travava o torneio, **não** o online — e desde 2026-08-12 não trava mais nenhum dos dois. O que sobra de bloqueio em E-5 não é decisão, é arquivo: as bandeiras de `T-19` (`D-54`), que não podem entrar sem a licença junto.

## Decisões que sustentam este plano

Nada aqui está pendente — as três decisões que o plano pedia foram congeladas no [[c_decisions|DECISIONS]]:

| Decisão | O que ficou decidido |
|---|---|
| `D-11` | Runner de teste = Vitest — todo portão de módulo depende de suíte, e ela não tinha dono |
| `D-12` | `index.html` em `src/`, com `root: 'src'` e `outDir: '../dist'` |
| `D-13` | **Este plano**: módulos, camadas, portas de entrada, donos de estado e portões |

## As 3 perguntas que mais mudariam este plano

> Reescritas em 2026-08-12: as duas primeiras da lista de `D-13` (`Q-03` e `Q-05`) foram respondidas, e `Q-04` também (`D-35`). Estas são as três de agora.

1. ~~**O histograma da CPU atravessa as disputas do torneio, ou zera a cada uma?**~~ **Respondida em 2026-08-19 por `D-66` (`T-12`): um `Cpu` por disputa**, criado no início dela e descartado no fim — cada adversário começa cego, e a progressão *implícita* que `D-60` recusou não nasce. O teste que a sustenta é um oráculo que refaz a simulação do zero disputa a disputa; reusar a instância também quebraria o recarregamento, porque o histograma não vai no retrato.
2. ~~**`Q-11` — como M7 recebe o `roomId` do anfitrião.**~~ **Respondida em 2026-08-19 por `D-73` (saída 1): M5 reexporta `newRoomId`, M7 sorteia o ID e sempre o passa nos dois aparelhos.** A tela de convite saiu com `T-21`, e o sorteio de quem cobra primeiro no `online` — que pegava carona nesta porta — fechou em 2026-08-29 com `T-17`/`D-98`, semeado pelo `roomId` que os dois já recebem. Nenhuma porta congelada foi reaberta: `Session` segue com os quatro métodos de `D-13`.
3. **`Q-08` — `pick(role)` lê o histograma do mesmo papel?** Prazo vencido (`QA-07`), e agora com peso maior: com `D-57`, a CPU deixa de jogar só a disputa do jogador e passa a jogar **57 a 61 disputas simuladas** por torneio. Um viés que hoje aparece em 1 disputa passa a aparecer em quase todas as 64.
