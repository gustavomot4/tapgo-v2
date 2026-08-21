---
tags: [nota, m4, catalogo]
status: atual
---
# M4 — notas de evidência de `D-22` e `D-23`

> Evidência longa das duas decisões de T-08. Mora aqui, e não em `c_decisions.md`, porque o
> teto de lá é de 2 frases por linha [Fonte: a_context/c_decisions.md, cabeçalho].

## `D-22` — por que `Team.flag` virou `string | null`

O contrato congelado de M4 dizia `flag: string`, e o portão do módulo exige que todo arquivo em
`flag` seja **local e com linha na tabela de procedência** de `licenciamento.md`. Antes de `A-04`
não existe nenhum arquivo de bandeira, e as três saídas possíveis para um campo `string` eram
todas defeito:

| Saída | Por que não |
|---|---|
| Caminho para arquivo que não existe | Inventa procedência: fura o portão de licença e só quebra na tela |
| `""` | Viola "ausente ≠ zero" — o vazio vira dado e some do radar |
| Reusar `base-probe.svg` (o único asset com procedência hoje) | Passa no portão pela letra e esconde a lacuna atrás de um arquivo real; ainda acopla M4 a um asset de M9 |

`null` é o único valor que diz a verdade: *o asset ainda não existe*. Como muda contrato de saída,
é `D-NN` e não edição silenciosa — regra 11 da skill `backend-domain` e `D-13`.

A lacuna é estrutural, não uma nota de rodapé: `CATALOG_IS_FIXTURE` é exportada e o teste
"A-04 derruba este teste de propósito" falha assim que a lista real entrar, obrigando a revisitar
o portão de licença com os arquivos de bandeira na mão.

## `D-23` — por que o `name` sai do ICU, em locale fixo

O portão de M4 exige `name` **derivado do código**, nunca texto digitado. `Intl.DisplayNames`
é a única fonte já embarcada no runtime: zero país digitado, zero peso no bundle, zero dependência
nova na tabela de custo de `stack.md`.

Duas escolhas dentro dela:

- **Locale fixo `pt-BR`**, não o do aparelho. O catálogo é declarado imutável e "resolve em build"
  [Fonte: a_context/b_plan.md#quem-é-dono-de-qual-estado]; com o locale do aparelho, dois celulares
  mostrariam nomes diferentes para a mesma seleção e a imutabilidade cairia sem ninguém notar.
- **`fallback: 'none'` + lançar.** Com o fallback padrão, um código desconhecido — ou um Node com
  ICU podado — devolveria o próprio código, e o jogo mostraria uma seleção chamada "XX". Falha alta
  é mais barata que dado silenciosamente errado; mesmo raciocínio de `D-15`.

### Limite declarado: o ICU não é validador de ISO 3166-1

Medido neste projeto, com `fallback: 'none'`:

| Código | O ICU devolve | O que é de verdade |
|---|---|---|
| `SU` | Rússia | Retirado (URSS) |
| `YU`, `CS` | Sérvia | Retirados |
| `AN` | Curaçao | Retirado |
| `UK` | Reino Unido | Excepcionalmente reservado — o código oficial é `GB` |
| `EU` | União Europeia | Excepcionalmente reservado, não é país |
| `XA`, `XK` | nome resolve | Faixa de uso do usuário |
| `QQ`, `AA`, `QM` | `undefined` | Faixa de uso do usuário |

`assertAlpha2` cobre o que é **regra estrutural da norma** (formato de 2 maiúsculas e as faixas de
uso do usuário `AA`, `QM`–`QZ`, `XA`–`XZ`, `ZZ` — uma comparação de faixa, não uma lista digitada).
O resto — retirados e excepcionalmente reservados — exigiria a lista oficial da ISO, que é **dado
curado**: inventá-la aqui seria inventar fonte. Ela entra junto com o catálogo real em `A-04`, e
até lá o buraco fica declarado: um código retirado passaria pelo portão.

Na prática o risco é contido, porque o catálogo é lista fechada e curada — nenhum código chega de
entrada de usuário. Mas quem escrever a lista de `A-04` precisa saber que o portão **não** vai
pegar `UK` no lugar de `GB`.

## `D-62` — por que `?no-inline` e por que a suíte não veria

Íntegra da evidência de `D-62`, movida do registro pelo corte de [[registro_no_teto]] §5.1.

O caminho do SVG passa a vir do **arquivo versionado** (`import.meta.glob` eager sobre
`src/assets/flags/`), não de uma segunda lista digitada ao lado de `CODES` — é a mesma razão de
`D-61`: duas listas divergem, uma lista não.

Sem `?no-inline`, **24 dos 32** SVGs virariam `data:` no build, e `Team.flag` passaria a ter **dois
formatos** — caminho para uns, `data:` para outros. E a suíte **NÃO veria**, porque roda em modo
dev, onde nada é embutido: o defeito só existiria no `dist/`, exatamente onde ninguém tem teste.

É também por isso que seleção sem arquivo **derruba o carregamento** em vez de degradar: catálogo
com bandeira faltando é `Team.flag` nulo silencioso, e a lista das 32 está em [[m4_lista_das_32]].
