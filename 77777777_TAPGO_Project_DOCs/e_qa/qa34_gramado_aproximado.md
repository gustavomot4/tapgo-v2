---
tags: [qa, m7]
status: aberto
---
# `QA-34` — o teste do gramado mede um gramado aproximado

## O achado

`src/ui/cena.ts` pinta as 4 faixas do gramado com cores **hexadecimais literais**:

`0x3d9448` · `0x469e50` · `0x51ac5b` · `0x5cb765`

O teste `nenhuma cor nacional some no gramado — as 4 faixas do campo, medidas`
(`src/tests/ui.test.ts`) não usa essas cores: ele redeclara as faixas como HSL **aproximado** —
`{h:128,s:41,l:41}`, `{h:127,s:39,l:45}`, `{h:127,s:36,l:50}`, `{h:126,s:35,l:54}` — e mede contra
elas. As duas listas não são a mesma cor depois de `hsl()` arredondar para 8 bits.

## A medição

Menor distância RGB de cada cor nacional até a faixa mais parecida, pelas duas referências:

| Cor | pelo hex real de `cena.ts` | pelo HSL do teste | diferença |
|---|---|---|---|
| vermelho | 192,2 | 191,0 | 1,2 |
| vermelho-escuro | 154,4 | 153,2 | 1,2 |
| laranja | 168,9 | 164,6 | **4,3** |
| amarelo | 174,5 | — | — |
| verde | 72,4 | 72,7 | 0,3 |
| azul | 129,3 | 128,2 | 1,1 |
| celeste | 120,1 | 116,0 | **4,1** |
| branco | 194,7 | 189,5 | **5,2** |

(A linha do `amarelo` é a de hoje, `hsl(50 95% 55%)`; as demais não mudaram.)

**Por que é BAIXO e não MÉDIO:** o teste erra sempre para o lado **seguro** — ele mede distâncias
um pouco MENORES do que as reais em 6 das 7 linhas, então ele reprova antes da tela reprovar. O
`verde` é a exceção (72,7 medido contra 72,4 real), e ali a folga sobre o limiar de 40 é de 32
pontos. Nenhuma cor da tabela de hoje passa por causa da aproximação.

**Por que fica aberto mesmo assim:** a coluna "Distância até o gramado" de [[cores_nacionais]] é
calculada pelo hex real — é o número que descreve a tela — e o teste guarda outro. Duas referências
para a mesma medida é o defeito; a diferença de hoje ser inofensiva é sorte da tabela atual, não
garantia.

## A correção

Exportar as 4 faixas de `cena.ts` como constante e o teste importá-la, em vez de redeclarar.

**Não feito na sessão que achou:** ela existia para trocar uma linha de dado curado
(o `amarelo`), e o portão dela exigia a suíte verde **sem alteração de asserção**. Mexer no teste
é regra 4.

## Como foi achado

Recalculando a coluna do `amarelo` para [[cores_nacionais]]: o número novo batia com o hex de
`cena.ts` e não com o HSL do teste, e aí as 7 linhas antigas mostraram a mesma diferença.
