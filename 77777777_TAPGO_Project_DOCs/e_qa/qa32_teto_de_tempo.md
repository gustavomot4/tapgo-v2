---
tags: [qa, nota]
status: atual
---
# `QA-32` — o teto de tempo da suíte, e por que ele é 20.000 ms

> Nota de evidência de `QA-32`. O ID mora em [[d_qa|QA]]; aqui fica o que não cabe em 2 frases.
> **Fechado em 2026-08-21**, sessão da skill `testing`. A correção inteira é declaração de
> configuração: **nenhuma asserção foi tocada**, e o número que o CONTEXT cita não se moveu.

## O defeito

Ninguém nunca declarou `testTimeout`, então valia o padrão do Vitest: **5.000 ms por teste**
(e outros 5.000 ms por hook). Isso funcionou enquanto a máquina do dono estava ociosa na hora
do `npm test`, e só.

## Os testes que estouram, e por que são lentos

Não são lentos por descuido. As três provas abaixo verificam propriedades que **só se medem por
repetição** — não há atalho que troque o custo por uma asserção mais esperta:

| módulo | prova | por que repete |
|---|---|---|
| M2 | `Number.isInteger` em toda transição de placar, 1.000 cobranças sorteadas com semente fixa | a representação obrigatória de `D-02` (inteiro, nunca float) é invariante: uma amostra não a prova |
| M2 | `T-17`/`D-48` — a ordem de cobrança não alterna, em disputas sorteadas e longas | o defeito só aparece em disputa longa; disputa curta passa por acaso |
| M3 | teto absoluto de 70% (`D-10`), 3 níveis × 1.000 formatos de histograma | teto é máximo sobre o espaço de estados, não sobre um estado |
| M3 | teto de 70% **medido por frequência**, em cada papel (shooter e keeper), e o médio entre fácil e difícil | frequência é estatística: com poucas amostras o intervalo é largo demais para reprovar nada |
| M6 | ID de sala não colide em **20.000 sorteios** | colisão é evento raro; amostra pequena nunca a veria |
| M6 | `QA-09` — o rótulo de sincronia nunca expõe mais que 6 caracteres do ID | varre o espaço de rótulos derivados |

## A medição que abriu o achado

- Com a máquina **livre**: `npm test` verde, e o pior caso individual medido foi **1.468 ms**
  (`QA-09` · rótulo de sincronia). Nenhum arquivo passou de ~5,2 s no total.
- Com **build e servidor de desenvolvimento rodando** ao lado: **3 falhas por tempo**, e nada
  mais. Mesma semente, mesmas asserções, mesmo resultado lógico — só mais devagar.

Isto é a definição de teste instável (regra 10 da skill `testing`): o resultado depende de algo
que não é o comportamento sob teste. E a saída "roda de novo até passar" é justamente a que a
regra proíbe, porque termina em suíte que ninguém encara.

## A correção

Em `vite.config.ts`:

```ts
test: {
  testTimeout: 20_000,
  hookTimeout: 20_000,
}
```

E o `defineConfig` passou a ser importado de `vitest/config` em vez de `vite` — sem isso o campo
`test` é propriedade desconhecida no tipo. O `tsc` do portão não pegaria de qualquer jeito,
porque `include: ["src"]` não alcança o `vite.config.ts` — que é exatamente o `QA-04`, **ainda
aberto**. A importação certa é o que impede este arquivo de depender daquele buraco.

## Por que 20.000, e não outro número

O teto tem uma função só: separar *máquina ocupada* de *travamento*. O número foi escolhido pelas
duas bordas, não por gosto:

- **Piso:** ~13× o pior caso medido (1.468 ms). Absorve a máquina disputada sem margem apertada,
  e absorve também a variação entre a máquina do dono e um runner mais fraco.
- **Teto:** ainda uma ordem de grandeza abaixo de um travamento de verdade — laço que não fecha,
  ou espera de rede (que a regra 6 da skill proíbe no teste automatizado, mas um dublê mal feito
  pode reintroduzir). Esses continuam reprovando em 20 s, não em minutos.

Teto herdado transformava o portão em sorteio. Teto grande demais o transformaria em espera. O
`hookTimeout` foi junto pelo mesmo motivo: ele também vale 5.000 ms por padrão, e um `beforeEach`
estourado derruba o **arquivo inteiro** — falha mais confusa que a do caso isolado, mesma causa.

## A prova de que o teto novo vale

Uma sonda temporária de **7 s** (acima do padrão antigo, abaixo do novo) foi escrita, rodada e
apagada:

```
✓ tests/__qa32_probe.test.ts (1 test) 7017ms
```

Ela passou — o que não aconteceria com os 5.000 ms herdados. **Foi apagada em seguida** e não
entra na contagem da suíte.

## O que NÃO mudou (era o receio registrado na linha de `QA-32`)

A linha original dizia "não feito aqui porque mexe no portão que toda sessão cita como número".
Não mexeu:

| portão | antes | depois |
|---|---|---|
| suíte | 598/598 | **598/598** |
| `tsc --noEmit` | limpo | **limpo** |
| `check.py` | verde | **verde** |
| bundle inicial | 424.987 B | **424.987 B** |

O bundle não se move porque `vitest/config` é dependência de desenvolvimento e não entra em
grafo nenhum do `vite build`.

## O que fica declarado de fora

- **`QA-04` continua aberto.** O `vite.config.ts` segue fora do `tsc`; esta sessão contornou o
  efeito (importando o `defineConfig` certo), não a causa. É de outro dono, regra 4.
- **Não há teto por arquivo nem por teste individual.** Os 20.000 ms valem para os 598. Um teste
  novo que passe a demorar 15 s passaria despercebido. Se isso incomodar, o instrumento é
  `--reporter=verbose` com olho no tempo, não um teto mais apertado — que traria o flaky de volta.
- **Não foi medido em runner de CI**, porque o projeto não tem um (`D-01`: build estático, sem
  servidor próprio). O número vale para a máquina do dono e para o sandbox.
