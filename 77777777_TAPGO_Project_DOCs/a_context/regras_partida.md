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
- Alternadas (`D-09`): rodada = 1 cobrança de cada lado. O fim de jogo é avaliado **só ao fim da rodada**; se houver diferença de gols, vence quem está à frente. Sem teto de rodadas — não existe critério de desempate fora das cobranças.
- A morte matemática **não** se aplica dentro de uma rodada alternada: as duas cobranças da rodada sempre acontecem.
- **Ordem de cobrança (`D-48`): quem cobra primeiro é decidido por sorteio no início da disputa, e essa ordem NÃO muda até o fim** — nem entre as 5 regulares, nem nas alternadas. É a regra real: a IFAB responde, com todas as letras, que a primeira cobrança de cada nova rodada é do time que cobrou primeiro na rodada anterior. Alternar a ordem entre rodadas foi **rejeitado** por contrariar a regra do esporte.
- O sorteio usa o gerador com semente de M1, nunca o nativo: a disputa continua reproduzindo o mesmo placar para a mesma semente, que é critério de aceite do projeto.
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

## CPU (`D-10`)
A v1 sorteava 1/3 puro — sem leitura, sem dificuldade. O jogador não melhora contra ruído.
A CPU pondera o histórico de zonas do jogador **na sessão**, em 3 níveis:

| Nível | Peso do histórico | Peso uniforme |
|---|---|---|
| Fácil | 0% | 100% (é a v1) |
| Médio | 50% | 50% |
| Difícil | 70% | 30% |

Invariantes da CPU (viram teste):
- **Teto absoluto de 70%.** Nenhum nível, nenhuma progressão e nenhum torneio passam disso: o jogador sempre consegue enganar a CPU.
- Histórico vive **em memória**, escopo da sessão; zera ao recarregar. Nada em `localStorage` — não é dado do aparelho, é estado de partida.
- Sorteio usa a semente do motor. Mesma semente + mesmas entradas = mesmas escolhas da CPU.
- Com histórico vazio (primeira cobrança), a distribuição é uniforme em qualquer nível.

## Torneio (`D-53`) — a regra fica aqui, o desenho fica no PLANO
Não é regra do motor: M2 não sabe o que é torneio. O que M8 acrescenta e vira teste:
- Classifica-se por **vitórias**, não por pontos — a disputa nunca empata, então não há empate a distribuir.
- Desempate, **nesta ordem**: confronto direto → saldo de gols → gols marcados → **sorteio com o `Rng` de M1**.
  O sorteio é o último critério e só é alcançado quando os três anteriores empatam; nunca o `Math.random` nativo.
- As disputas sem o jogador são **simuladas pelo motor** (M2 com duas CPUs de M3) e obedecem ao mesmo teto de 70%.

## Lacunas declaradas (não inventar)
- ~~`Q-03` — quantas e quais seleções entram, e o nome do torneio.~~ **Respondida em 2026-08-12:** 32 seleções
  (`D-51`) e **TAP GO Cup** (`D-55`). A lista curada está em [[m4_lista_das_32]] — não se digita de memória.
- Desconexão no meio da partida online: consequência ainda não definida (ver [[online_p2p]]).
