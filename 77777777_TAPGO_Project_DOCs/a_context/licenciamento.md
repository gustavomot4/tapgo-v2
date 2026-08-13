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

#### As 32, arquivo a arquivo (`T-19`, 2026-08-12)

**Origem de todas:** pacote npm **flag-icons 7.5.0**, pasta `flags/4x3/`, cópia **byte a byte** — nenhum SVG foi
editado, otimizado ou redesenhado. **Licença:** MIT, `Copyright (c) 2013 Panayiotis Lipiridis`, texto íntegro em
`src/assets/flags/LICENSE.txt`. O que muda de linha para linha é só o que está abaixo, e o SHA-256 é o que torna a
procedência **conferível** em vez de declarada — mesmo raciocínio dos três áudios de `T-10`.

O nome do arquivo é o código em minúscula, e o catálogo o **deriva** (`M4`): não existe segunda lista para divergir.
Nenhum dos 32 referencia recurso externo — as únicas ocorrências de `http` são declarações de namespace XML do W3C,
e todo `href` interno aponta para um `#id` do próprio arquivo. Cobrado por teste em `src/tests/teams.test.ts`.

| Arquivo | Origem no pacote | SHA-256 (início) | Bytes |
|---|---|---|---|
| `src/assets/flags/es.svg` | `flags/4x3/es.svg` | `f9cfaff858e95f83` | 80.958 |
| `src/assets/flags/ar.svg` | `flags/4x3/ar.svg` | `da39bfbe83fd35fa` | 3.461 |
| `src/assets/flags/fr.svg` | `flags/4x3/fr.svg` | `8cdacc8d79bcf210` | 231 |
| `src/assets/flags/gb-eng.svg` | `flags/4x3/gb-eng.svg` | `53797ba9e2dd9b18` | 239 |
| `src/assets/flags/br.svg` | `flags/4x3/br.svg` | `b0a912826c3ffd72` | 7.140 |
| `src/assets/flags/ma.svg` | `flags/4x3/ma.svg` | `28cfcdecf9675b0a` | 247 |
| `src/assets/flags/pt.svg` | `flags/4x3/pt.svg` | `a7a2cf0b44aaaaf4` | 8.001 |
| `src/assets/flags/be.svg` | `flags/4x3/be.svg` | `d6aff6fa4c913404` | 302 |
| `src/assets/flags/nl.svg` | `flags/4x3/nl.svg` | `8f691f17fe708945` | 225 |
| `src/assets/flags/mx.svg` | `flags/4x3/mx.svg` | `9dbc8ad8b35e52ce` | 84.753 |
| `src/assets/flags/co.svg` | `flags/4x3/co.svg` | `6bab3c96c1657510` | 286 |
| `src/assets/flags/de.svg` | `flags/4x3/de.svg` | `efd480af5a154a76` | 221 |
| `src/assets/flags/hr.svg` | `flags/4x3/hr.svg` | `3c98eae5ee93f0d7` | 30.732 |
| `src/assets/flags/ch.svg` | `flags/4x3/ch.svg` | `ac676cd39d703298` | 290 |
| `src/assets/flags/it.svg` | `flags/4x3/it.svg` | `9fa88118818d9b64` | 289 |
| `src/assets/flags/us.svg` | `flags/4x3/us.svg` | `e7be4240cf579879` | 648 |
| `src/assets/flags/jp.svg` | `flags/4x3/jp.svg` | `bfea80baf9989383` | 470 |
| `src/assets/flags/sn.svg` | `flags/4x3/sn.svg` | `6437db13c13fa5cc` | 421 |
| `src/assets/flags/no.svg` | `flags/4x3/no.svg` | `ceea17af051dceef` | 318 |
| `src/assets/flags/uy.svg` | `flags/4x3/uy.svg` | `47656c0bf4961a1f` | 1.724 |
| `src/assets/flags/dk.svg` | `flags/4x3/dk.svg` | `d2847c0bd7a1fb97` | 236 |
| `src/assets/flags/ir.svg` | `flags/4x3/ir.svg` | `cb363e09bafbff6d` | 15.397 |
| `src/assets/flags/at.svg` | `flags/4x3/at.svg` | `c0e5cb3c1d59fd00` | 195 |
| `src/assets/flags/eg.svg` | `flags/4x3/eg.svg` | `3f85d1d2bdb03692` | 8.726 |
| `src/assets/flags/ec.svg` | `flags/4x3/ec.svg` | `4472b0618e2f5e31` | 28.777 |
| `src/assets/flags/ng.svg` | `flags/4x3/ng.svg` | `b7a2a45a6499095e` | 257 |
| `src/assets/flags/tr.svg` | `flags/4x3/tr.svg` | `256a1d6afbedb9f7` | 549 |
| `src/assets/flags/au.svg` | `flags/4x3/au.svg` | `cbb2206c5e59a25d` | 1.296 |
| `src/assets/flags/dz.svg` | `flags/4x3/dz.svg` | `9ea0cf93222ab7b5` | 294 |
| `src/assets/flags/ca.svg` | `flags/4x3/ca.svg` | `345ec9dac057e203` | 625 |
| `src/assets/flags/ci.svg` | `flags/4x3/ci.svg` | `4ecfea70e4e0860f` | 277 |
| `src/assets/flags/kr.svg` | `flags/4x3/kr.svg` | `7a6cd5b51d0e2841` | 1.061 |

**Soma: 278.646 B** nos 32, na ordem de `D-51`. Cinco arquivos (`mx`, `es`, `hr`, `ec`, `ir`) respondem por **88%**
disso — são as bandeiras com brasão de Estado desenhado em vetor. Brasão **de Estado** é símbolo nacional e está na
linha "Bandeira nacional" da tabela do topo; a lista-morta desta página proíbe brasão de **clube e de federação**,
que é outra coisa e não entrou aqui.

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
código — não é bandeira e não imita nenhuma.

**O disco continua na tela depois de `T-19`** (`QA-19`): M4 já entrega o caminho do SVG, mas quem desenha é M7, e
`marca()` põe o valor de `flag` como **texto** dentro do disco. Nada de licença muda com isso — o que está no ar é
um caminho, não imagem de terceiro —, mas a bandeira só aparece quando a sessão de M7 trocar o texto por `<img>`.

## Sobre publicar mesmo assim
A itch.io é **reativa**: hospeda e só derruba após DMCA do titular. Isso não é permissão — é a chance de
levar takedown depois de divulgar. O projeto não depende dessa tolerância.

## Fontes
- Lei Pelé art. 87 — https://www.jusbrasil.com.br/topicos/11307339/artigo-87-da-lei-n-9615-de-24-de-marco-de-1998
- Direito de imagem de atleta em games (art. 87-A) — https://www.migalhas.com.br/depeso/377216/direito-de-imagem-de-atletas-profissionais-em-jogos-eletronicos
- EA condenada por uso indevido de imagem — https://www.conjur.com.br/2019-nov-23/ea-fifa-indenizar-jogador-uso-indevido-imagem/
- Marcas da FIFA e nomes de país — https://theipcenter.com/2024/05/navigating-fifas-world-cup-trademarks/
- Política reativa da itch.io — https://itch.io/t/2405034/can-i-use-copyrighted-characters-or-royalty-free-assets-in-my-indie-game
