---
tags: [contexto, tema, regras]
status: atual
---
# Regras da disputa — o motor, e o que a v1 errava

> Leia ao mexer no motor de regras ou na CPU. Estas frases viram **teste** antes de virar código.

## Jornada
escolher modo -> escolher seleção -> alternar cobrança/defesa -> resultado -> (torneio: próxima fase)

## Mecânica herdada da v1 (mantida)
Três zonas: esquerda, meio, direita. Quem cobra escolhe uma; quem defende escolhe uma.
Mesma zona = defesa. Zonas diferentes = gol. Cobranças alternadas, 5 para cada lado.

## Invariantes (frases verificáveis — viram teste)
- `gols <= cobranças` para cada lado, sempre.
- Toda cobrança registra exatamente uma zona e exatamente um resultado (gol ou defesa).
- A disputa termina no instante em que a diferença de gols é maior que as cobranças restantes do adversário — **sem cobranças inúteis depois disso**.
- Empate após 5 cobranças -> alternadas: a disputa só termina com número **igual** de cobranças dos dois lados.
- Reexecutar a mesma sequência de entradas produz o mesmo placar (motor determinístico dada a semente).
- Nenhum estado de partida vem do cliente adversário sem validação local.

## Defeitos medidos na v1 (não repetir — viram teste de regressão)
| # | Defeito | Efeito |
|---|---|---|
| 1 | `fezGOl = 1` em vez de `fezGol` (chute no meio, goleiro na esquerda) | cria global nova; o placar visual usa o valor da jogada anterior |
| 2 | `AtualizarPlacar` usa o mesmo `fezGol` para os dois lados | marcador do adversário reflete o resultado do usuário |
| 3 | `Math.random() * 7 + 1` | nunca sorteia o índice 0 e assume 8 times fixos |
| 4 | `EscolherTime` navega antes de sortear o adversário | sorteio pode não executar |
| 5 | Fim de jogo checado só dentro de `AtualizarPlacar` | condição de alternadas dispara em estado inconsistente |
| 6 | `idPartida` calculado no cliente | colide entre abas e é forjável |

> O defeito 1 é o argumento concreto para TypeScript (D-02): `noImplicitGlobals` + `strict` transformam
> esse erro de digitação em falha de compilação, não em bug silencioso de placar.

## CPU
A v1 sorteava 1/3 puro — sem leitura, sem dificuldade. O jogador não melhora contra ruído.
Direção pretendida: a CPU pondera o histórico de zonas do jogador na sessão. **Nível de dificuldade e
fórmula: `Q-02`, decisão do dono.**

## Lacunas declaradas (não inventar)
- `Q-01` — regra exata das alternadas e da morte súbita.
- `Q-02` — a CPU adapta ao padrão do jogador? Com que teto de dificuldade?
- `Q-03` — quantas e quais seleções entram, e o nome do torneio.
- Desconexão no meio da partida online: consequência ainda não definida (ver [[online_p2p]]).
