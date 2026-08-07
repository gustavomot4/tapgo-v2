---
tags: [contexto, tema, licenciamento]
status: atual
---
# Licenciamento — o que pode e o que não pode aparecer no jogo

> Leia ao criar ou alterar qualquer asset, nome de time, escudo, uniforme ou texto de marca.
> **Não é parecer jurídico.** É a base factual que sustenta a restrição inegociável do [[a_context_source|CONTEXT]].

## A regra de uma linha
**Identidade de seleção = nome de país (ISO-3166) + bandeira nacional. Nada além disso.**

## Por que a v1 não podia ser publicada
A v1 usava São Paulo, Corinthians, Palmeiras, Santos, Ponte Preta, Guarani e Juventus da Mooca, com escudos
*hotlinkados* da Wikipédia. O **art. 87 da Lei Pelé (9.615/98)** dá às entidades desportivas propriedade
exclusiva sobre denominação e símbolos — escudo, sigla, mascote — com **proteção automática em todo o
território nacional, por prazo indeterminado e sem necessidade de registro no INPI**. Não é zona cinzenta.

## Por que trocar clube por seleção NÃO resolve sozinho
Escudos de seleção pertencem às **federações nacionais** (CBF, AFA, FA), não à FIFA — a proteção é a mesma.
E `World Cup` / `Copa do Mundo` é marca da FIFA, historicamente fiscalizada de forma agressiva.
Trocar de clube para seleção troca o dono do direito, não sai do problema.

## O que é livre (e é o que o jogo usa)
| Item | Status | Condição |
|---|---|---|
| Nome de país / gentílico ("Brasil", "Argentina") | **Livre** | termo geográfico, não é marca |
| Bandeira nacional | **Livre** | símbolo de Estado |
| Cores nacionais e padrões genéricos (listras, faixas) | **Livre** | não reproduzir uniforme oficial identificável |
| Estilo visual de UI inspirado em jogos comerciais | **Livre** | estilo/layout não é propriedade; não copiar arte nem logotipo |

## O que é proibido no projeto (lista-morta)
- Escudo de clube ou de federação, em qualquer resolução ou grau de estilização.
- Nome, apelido esportivo, rosto ou número de jogador real — **art. 87-A** exige contrato individual por
  atleta, e no Brasil praticamente toda ação de atleta contra desenvolvedora de game foi ganha pelo atleta.
- Os termos `FIFA`, `Copa do Mundo`, `World Cup`, `Brasileirão`, `Libertadores`, `Champions League`.
- Reprodução de uniforme oficial identificável de clube ou seleção.
- Hotlink de imagem de terceiro (a v1 fazia isso com a Wikipédia): além do direito, quebra o jogo offline.

## Nome do torneio no jogo
Precisa ser original. `Q-03` decide o nome final. Candidatos que **não** colidem com marca conhecida:
"Copa TAP GO", "Torneio das Nações", "TAP GO Cup".

## Procedência de asset (portão da Fase 6)
Todo arquivo em `assets/` tem uma linha nesta tabela antes de entrar no repositório. Sem linha, não entra.

| Arquivo | Origem | Licença | Autor |
|---|---|---|---|
| `src/assets/base-probe.svg` | criado em T-05, sem referência a nenhuma imagem externa: retângulo, círculo e um sinal de conferido | do projeto | projeto TAP GO v2 (agente, sessão T-05) |

## Sobre publicar mesmo assim
A itch.io é **reativa**: hospeda e só derruba após DMCA do titular. Isso não é permissão — é a chance de
levar takedown depois de divulgar. O projeto não depende dessa tolerância.

## Fontes
- Lei Pelé art. 87 — https://www.jusbrasil.com.br/topicos/11307339/artigo-87-da-lei-n-9615-de-24-de-marco-de-1998
- Direito de imagem de atleta em games (art. 87-A) — https://www.migalhas.com.br/depeso/377216/direito-de-imagem-de-atletas-profissionais-em-jogos-eletronicos
- EA condenada por uso indevido de imagem — https://www.conjur.com.br/2019-nov-23/ea-fifa-indenizar-jogador-uso-indevido-imagem/
- Marcas da FIFA e nomes de país — https://theipcenter.com/2024/05/navigating-fifas-world-cup-trademarks/
- Política reativa da itch.io — https://itch.io/t/2405034/can-i-use-copyrighted-characters-or-royalty-free-assets-in-my-indie-game
