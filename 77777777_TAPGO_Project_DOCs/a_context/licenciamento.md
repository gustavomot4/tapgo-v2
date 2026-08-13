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
**Decidido em 2026-08-12 (`D-55`): TAP GO Cup.** Os outros dois candidatos levantados aqui — "Copa TAP GO"
e "Torneio das Nações" — não foram escolhidos e ficam registrados como as alternativas que existiam.
O nome é cobrado pelo mesmo `grep` da lista-morta que E-5 varre: original não é o que parece original, é o
que passa na varredura.

## Procedência de asset (portão da Fase 6)
Todo arquivo em `assets/` tem uma linha nesta tabela antes de entrar no repositório. Sem linha, não entra.

Desde `T-10` a tabela é **cobrada por teste**: `src/tests/ui.test.ts` varre `src/assets/` e reprova
o arquivo que não tiver linha aqui. Portão que só existe em prosa é portão que ninguém roda.

As 32 bandeiras têm linha **na tabela da seção "Bandeiras"**, e não nesta: repetir a mesma licença e o
mesmo autor 32 vezes esconderia o que muda de arquivo para arquivo. O portão não muda — o teste varre a
página inteira atrás do caminho, não uma tabela específica.

| Arquivo | Origem | Licença | Autor |
|---|---|---|---|
| `src/assets/base-probe.svg` | criado em T-05, sem referência a nenhuma imagem externa: retângulo, círculo e um sinal de conferido | do projeto | projeto TAP GO v2 (agente, sessão T-05) |
| `src/assets/audio/chute.wav` | **sintetizado** em T-10 por `src/scripts/gen-audio.mjs`: varredura de senoide 190→62 Hz mais rajada de ruído de LCG com semente fixa. Nenhum sample, nenhuma gravação, nenhum download | do projeto | projeto TAP GO v2 (agente, sessão T-10) |
| `src/assets/audio/gol.wav` | **sintetizado** em T-10 pelo mesmo script: tríade 523/659/784 Hz com envelope exponencial | do projeto | projeto TAP GO v2 (agente, sessão T-10) |
| `src/assets/audio/defesa.wav` | **sintetizado** em T-10 pelo mesmo script: ruído de LCG com média móvel mais varredura 320→128 Hz | do projeto | projeto TAP GO v2 (agente, sessão T-10) |
| `src/assets/flags/LICENSE.txt` | cópia do `LICENSE` do pacote **flag-icons 7.5.0** (npm), com um cabeçalho do projeto dizendo o que ele cobre; o aviso da MIT está íntegro e verbatim abaixo do traço | MIT | Panayiotis Lipiridis |

### Bandeiras: a licença entrou primeiro
`D-54` escolheu o **flag-icons** — SVG, licença **MIT**, `Copyright (c) 2013 Panayiotis Lipiridis`.

Duas condições, e as duas são portão de `T-19`, não recomendação:
- **O texto da licença entra ANTES do primeiro SVG.** A MIT é permissiva mas exige manter o aviso de copyright;
  arquivo primeiro e licença depois é exatamente a janela em que a regra desta página é violada.
- **Nada de hotlink nem de CDN.** É a mesma linha que a v1 quebrou com a Wikipédia, e vale igual para uma fonte
  com licença boa: além do direito, hotlink quebra o jogo offline.

A primeira condição foi cumprida **na ordem, e a ordem está no histórico do git**: o commit que trouxe
`src/assets/flags/LICENSE.txt` é anterior ao que trouxe os SVGs. Ordem declarada em prosa é ordem que
ninguém confere.

A Inglaterra é o caso que obrigou `D-52`: ela não tem código ISO-3166-1, e entra como `GB-ENG`. Isso é **código de
subdivisão**, não bandeira de federação — a `GB-ENG` é a cruz de São Jorge, símbolo territorial, e continua dentro
da regra de uma linha desta página.

### Por que os três áudios são conferíveis, e não só declarados
`gen-audio.mjs` é determinístico — o ruído sai de um LCG com semente fixa, não de `Math.random()`.
Rodar `node src/scripts/gen-audio.mjs` reproduz os mesmos bytes, então a origem se confere por hash
em vez de por confiança. Os de hoje (SHA-256, 16 primeiros dígitos):

| Arquivo | SHA-256 (início) | Bytes |
|---|---|---|
| `chute.wav` | `ea097ebf330acf8b` | 7.100 |
| `gol.wav` | `951c898272861372` | 27.386 |
| `defesa.wav` | `d2e0636e5d6b7206` | 13.274 |

Nenhuma imagem entrou em T-10: o campo, o gol e a bola são primitivos desenhados em código
(`src/ui/cena.ts`), e a identidade de seleção é o código ISO num disco de cor derivada do próprio
código — não é bandeira, não imita nenhuma, e sai quando `A-04` entregar as bandeiras de verdade.

## Sobre publicar mesmo assim
A itch.io é **reativa**: hospeda e só derruba após DMCA do titular. Isso não é permissão — é a chance de
levar takedown depois de divulgar. O projeto não depende dessa tolerância.

## Fontes
- Lei Pelé art. 87 — https://www.jusbrasil.com.br/topicos/11307339/artigo-87-da-lei-n-9615-de-24-de-marco-de-1998
- Direito de imagem de atleta em games (art. 87-A) — https://www.migalhas.com.br/depeso/377216/direito-de-imagem-de-atletas-profissionais-em-jogos-eletronicos
- EA condenada por uso indevido de imagem — https://www.conjur.com.br/2019-nov-23/ea-fifa-indenizar-jogador-uso-indevido-imagem/
- Marcas da FIFA e nomes de país — https://theipcenter.com/2024/05/navigating-fifas-world-cup-trademarks/
- Política reativa da itch.io — https://itch.io/t/2405034/can-i-use-copyrighted-characters-or-royalty-free-assets-in-my-indie-game
