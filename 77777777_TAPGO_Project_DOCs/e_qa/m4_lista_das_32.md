---
tags: [qa, evidencia, m4]
status: atual
tipo: nota
data: 2026-08-12
---
# M4 — as 32 seleções, e de onde elas saíram

> Evidência de `D-51` (quais seleções) e `D-52` (o `GB-ENG`). Existe porque a regra do projeto é
> **não inventar dado**: a lista abaixo é leitura de fonte externa com data, não memória de quem
> implementa. Quem escrever `T-18` copia daqui — não de lembrança, e não de outra busca nova.

## O critério que ficou congelado (`D-51`)
**As 32 primeiras de um snapshot de ranking de seleções publicado em 20/07/2026.** O que `D-51`
congela é o critério e a data; a lista é consequência dele. Se um dia o corte mudar (34 seleções,
outra data), é `D-NN` novo — a lista não se edita sozinha.

## A lista (lida em 2026-08-12)

| # | Seleção | `code` | # | Seleção | `code` |
|---|---|---|---|---|---|
| 1 | Espanha | `ES` | 17 | Japão | `JP` |
| 2 | Argentina | `AR` | 18 | Senegal | `SN` |
| 3 | França | `FR` | 19 | Noruega | `NO` |
| 4 | **Inglaterra** | **`GB-ENG`** | 20 | Uruguai | `UY` |
| 5 | Brasil | `BR` | 21 | Dinamarca | `DK` |
| 6 | Marrocos | `MA` | 22 | Irã | `IR` |
| 7 | Portugal | `PT` | 23 | Áustria | `AT` |
| 8 | Bélgica | `BE` | 24 | Egito | `EG` |
| 9 | Países Baixos | `NL` | 25 | Equador | `EC` |
| 10 | México | `MX` | 26 | Nigéria | `NG` |
| 11 | Colômbia | `CO` | 27 | Turquia | `TR` |
| 12 | Alemanha | `DE` | 28 | Austrália | `AU` |
| 13 | Croácia | `HR` | 29 | Argélia | `DZ` |
| 14 | Suíça | `CH` | 30 | Canadá | `CA` |
| 15 | Itália | `IT` | 31 | Costa do Marfim | `CI` |
| 16 | Estados Unidos | `US` | 32 | Coreia do Sul | `KR` |

**A coluna "Seleção" é só para esta página ser legível.** No jogo o nome vem do código pelo ICU
(`D-23`), com a exceção nomeada abaixo — copiar estes nomes para dentro de `src/` reprova o portão
de M4, que cobra ausência de literal.

## Conferido, não suposto (rodado em 2026-08-12, Node v22.22.2)
- Os **31** códigos alfa-2 casam `^[A-Z]{2}$`, não se repetem, estão fora das faixas de uso do
  usuário do ISO 3166-1 (`AA`, `QM`–`QZ`, `XA`–`XZ`, `ZZ`) e **todos** resolvem no ICU.
- `new Intl.DisplayNames(['pt'],{type:'region'}).of('GB-ENG')` → **`RangeError: invalid_argument`**.
  O ICU resolve *região*, e `GB-ENG` é *subdivisão*. É por isso que `D-52` custa um literal: o nome
  da Inglaterra é o único que não pode vir do código, e a exceção tem de ser **nomeada e conferida
  por teste**, nunca um afrouxamento do portão — afrouxar devolve o buraco que o portão fechou.
- A `GB` sozinha **não** serve no lugar de `GB-ENG`: `GB` é o Reino Unido inteiro (o ICU devolve
  "Reino Unido"), que não é a seleção listada.

## O corte, e por que ele é o número 32 e não outro
O corte cai entre a 32ª (Coreia do Sul) e a 33ª (Ucrânia). As posições **21 a 33** foram lidas em
**duas fontes independentes** e batem item a item, inclusive nas duas que cercam o corte — é a parte
da lista que mais importa conferir, porque é ela que decide quem entra.

## Fontes
- Ranking pós-Copa de 2026, publicado em 20/07/2026 — https://www.visualcapitalist.com/ranked-fifa-world-rankings-after-2026-world-cup/
- Mesmo ranking, tabela viva (lida com "Updated Aug 9, 2026") — https://www.givemesport.com/fifa-world-rankings/
- Terceira leitura, só do topo, que confere 1–20 e as posições 28 e 32 — https://www.soccerallover.com/2026/07/fifa-world-rankings-july-2026.html
- Licença das bandeiras (`D-54`), MIT com `Copyright (c) 2013 Panayiotis Lipiridis` — https://github.com/lipis/flag-icons

## Armadilha que espera quem implementar
**O nome da entidade que publica o ranking está na lista-morta de [[licenciamento]] — e aparece até
dentro das URLs acima.** Esta procedência mora em `e_qa/` de propósito: o portão de M7 roda
`grep -rniE "fifa|copa do mundo|world cup|..."` em `src/` e em `assets/`, e **nem o termo nem essas
URLs podem atravessar essa fronteira** — um comentário bem-intencionado em `src/data/teams.ts`
explicando de onde veio a lista, ou um link de fonte colado ali, reprova o portão. Dentro do código a
origem se cita como `D-51` e como ponteiro para esta nota, nunca por extenso.

## O que esta lista NÃO é
- Não é a lista de participantes de nenhum torneio real, e o jogo não afirma que seja: são as 32
  primeiras de um ranking, usadas como catálogo de um jogo de pênaltis.
- Não vem com bandeira: `flag` continua `null` (`D-22`) até `T-19` trazer os SVGs com a licença.
- Não foi conferida contra a lista oficial da ISO, que é dado curado e entra com o catálogo real —
  o limite já declarado em `D-23` segue de pé.
