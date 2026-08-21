/**
 * M7 — os bonecos do campo, desenhados em grade de pixels.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * ## Por que grade de texto, e não arquivo de imagem
 * Nada aqui vira arquivo em `src/assets/`. O sprite é **dado no código**, e isso paga três coisas
 * que um PNG não pagaria:
 *
 * 1. **Procedência trivial.** Arte que nasce no repositório não tem origem a rastrear — é o mesmo
 *    caminho dos três áudios, sintetizados por `src/scripts/gen-audio.mjs` em vez de baixados.
 * 2. **A cor da camisa é parâmetro.** O pedido é "cada goleiro com a cor da sua seleção"; com PNG
 *    seriam 32 arquivos ou um `tint` que também tingiria pele e chuteira. Aqui a camisa é um
 *    caractere da grade, e só ele muda.
 * 3. **Revisável e testável.** Diferença de sprite aparece no `git diff` como texto, e a suíte
 *    confere a grade sem navegador — o que importa num projeto onde nenhuma tela tem teste.
 *
 * ## O alfabeto
 * Um caractere = um pixel. `.` é transparente. As demais letras são **papéis**, não cores: quem
 * resolve papel→cor é `paleta()`, e é lá que a camisa recebe a cor da seleção.
 *
 * ## A camisa passou a ser a cor nacional (`T-29`/`D-88`, saída (B) de `Q-16`)
 * Até aqui a camisa saía de um matiz de hash, arbitrário de propósito. Agora ela sai de
 * `CORES_NACIONAIS`, tabela curada e revisada pelo dono — o que [[licenciamento]] libera como
 * "cores nacionais e padrões genéricos", com a condição de **não reproduzir uniforme oficial
 * identificável**. Cor chapada e listra genérica num boneco de 18 pixels são cor e listra: não há
 * escudo, gola, patrocínio nem desenho de uniforme em lugar nenhum deste arquivo.
 *
 * **O que mudou de verdade não é a cor — é o canal de desempate.** O `matizDistinto` de `T-20`
 * separava dois lados parecidos jogando o matiz do lado B para o oposto do círculo; com cor
 * nacional isso vira Espanha × Portugal com uma camisa ciana, que é o contrário do pedido. Quem
 * separa agora é o **padrão**: o lado B ganha listras e **mantém a cor nacional**. Ver
 * `camisasDaDisputa`.
 */

/** Papéis do alfabeto de sprite. `.` (transparente) não é papel e não entra aqui. */
export type Papel = 'K' | 'P' | 'C' | 'G' | 'S' | 'M' | 'B' | 'W' | 'D';

export type Sprite = readonly string[];

/** Goleiro parado, de frente e de braços abertos — a pose que diz "goleiro". 18x20. */
export const GOLEIRO_PARADO: Sprite = [
  '.......KKKK.......',
  '......KKKKKK......',
  '......KPPPPK......',
  '......PPPPPP......',
  '......PPPPPP......',
  '.......PPPP.......',
  'GGP...CCCCCCCC.PGG',
  'GGPPPPCCCCCCCCPPGG',
  'GGP...CCCCCCCC.PGG',
  '......CCCCCCCC....',
  '......CCCCCCCC....',
  '......CCCCCCCC....',
  '......SSSSSSSS....',
  '......SSSSSSSS....',
  '......SS....SS....',
  '......MM....MM....',
  '......MM....MM....',
  '......MM....MM....',
  '.....BBB....BBB...',
  '.....BBB....BBB...',
];

/** Goleiro no ar, mergulhando para a DIREITA de quem olha. 26x14 — espelhado para a esquerda. */
export const GOLEIRO_MERGULHO: Sprite = [
  '......................GGGG',
  '....................GGGGGG',
  '................PPPPPGGG..',
  '.............PPPPPPP......',
  '..........KKKKPPPP........',
  '.........KKKKKKKK.........',
  '......CCCKKPPPPK..........',
  '...CCCCCCCCCPPP...........',
  '.CCCCCCCCCCCCC............',
  'SSSSSCCCCCCCCC............',
  'SSSSSSSSSSS...............',
  'MMMMSSSSS.................',
  'MMMM......................',
  'BBBB......................',
];

/** Batedor de costas, parado. 18x20 — de costas, então não há rosto a desenhar. */
export const BATEDOR_PARADO: Sprite = [
  '.......KKKK.......',
  '......KKKKKK......',
  '......KKKKKK......',
  '......KKKKKK......',
  '.......PPPP.......',
  '.......PPPP.......',
  '......CCCCCC......',
  '.....CCCCCCCC.....',
  '..PP.CCCCCCCC.PP..',
  '..PP.CCCCCCCC.PP..',
  '..PP.CCCCCCCC.PP..',
  '.....CCCCCCCC.....',
  '.....CCCCCCCC.....',
  '.....SSSSSSSS.....',
  '.....SSSSSSSS.....',
  '.....SS....SS.....',
  '.....MM....MM.....',
  '.....MM....MM.....',
  '....BBB....BBB....',
  '....BBB....BBB....',
];

/** Batedor de costas no gesto do chute — perna direita à frente, braço aberto. 20x20. */
export const BATEDOR_CHUTE: Sprite = [
  '........KKKK........',
  '.......KKKKKK.......',
  '.......KKKKKK.......',
  '.......KKKKKK.......',
  '........PPPP........',
  '........PPPP........',
  '..P...CCCCCCCC......',
  '..PP.CCCCCCCCCC.....',
  '...PPCCCCCCCCCCPP...',
  '....CCCCCCCCCCCPP...',
  '....CCCCCCCCCC..P...',
  '.....CCCCCCCC.......',
  '.....SSSSSSSS.......',
  '....SSSSSSSSSS......',
  '....SS......SS......',
  '...MM........MM.....',
  '..MM..........MM....',
  '.BBB...........MM...',
  '.BBB............BB..',
  '................BB..',
];

/** A bola. 10x10, e o único sprite sem camisa: bola não é de time nenhum. */
export const BOLA: Sprite = [
  '..WWWWWW..',
  '.WWWWWWWW.',
  'WWWWDDWWWW',
  'WWWDDDDWWW',
  'WWWDDDDWWW',
  'WWWWDDWWWW',
  'WWDWWWWDWW',
  'WWDDWWDDWW',
  '.WWWWWWWW.',
  '..WWWWWW..',
];

/** Todo caractere que a grade aceita. Fora desta lista é erro de digitação, e o teste pega. */
export const ALFABETO = '.KPCGSMBWD';

/** Largura e altura em pixels de um sprite. */
export function dimensoes(sprite: Sprite): { largura: number; altura: number } {
  return { largura: sprite[0]?.length ?? 0, altura: sprite.length };
}

/** Uma cor da camisa, em HSL. **Não** é só matiz: branco é `s: 0`, e sem isso ele não existe. */
export interface Cor {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** Como a camisa é pintada. `listras` é o canal que separa dois lados da MESMA cor nacional. */
export type Padrao = 'liso' | 'listras';

/** A camisa de um lado nesta disputa: a cor nacional, mais o padrão que o desempate decidiu. */
export interface Camisa {
  readonly cor: Cor;
  readonly padrao: Padrao;
}

/**
 * As cores nacionais, por NOME (`D-88`).
 *
 * **Uma cor por nome, e é essa a decisão que mais importa aqui.** Doze seleções desta tabela têm
 * vermelho, e elas têm o **mesmo** vermelho — porque têm mesmo. Inventar doze vermelhos separados
 * por três pontos de luminosidade seria fingir uma precisão que ninguém enxerga num boneco de 18
 * pixels, e ainda por cima fingir que a diferença é dado nacional quando ela seria só minha.
 * O que separa duas camisas vermelhas é o **padrão**, não uma cor quase igual.
 *
 * O `verde` é escuro por medição, não por gosto: no tom médio ele ficava a **29,7** de distância
 * RGB da faixa mais parecida do gramado de `cena.ts` — camisa verde sumindo em campo verde, e
 * para as cinco seleções verdes de uma vez. Neste tom a distância é **72,4**.
 */
export const CORES_NACIONAIS = {
  vermelho: { h: 0, s: 72, l: 48 },
  'vermelho-escuro': { h: 350, s: 72, l: 34 },
  laranja: { h: 24, s: 85, l: 55 },
  amarelo: { h: 50, s: 95, l: 55 },
  verde: { h: 145, s: 75, l: 22 },
  azul: { h: 222, s: 70, l: 40 },
  celeste: { h: 200, s: 65, l: 62 },
  branco: { h: 0, s: 0, l: 90 },
} as const satisfies Readonly<Record<string, Cor>>;

export type NomeDeCor = keyof typeof CORES_NACIONAIS;

/**
 * As 32 seleções e a cor nacional de cada uma — **dado curado, revisado pelo dono** (`Q-16`).
 *
 * Não é derivável: nem do código ISO, nem do catálogo de M4, nem da bandeira que `T-19` trouxe
 * (a cor esportiva de `NL`, `IT`, `AR`, `UY` e `AU` **não está** na bandeira delas). É por isso
 * que `P-6` a travou como decisão do dono, e é por isso que ela mora numa tabela literal em vez
 * de sair de uma conta. Mexer aqui é `D-NN` novo, nunca efeito colateral de tarefa de arte.
 *
 * A tabela inteira, com a base de cada linha e a medição que a acompanha: [[cores_nacionais]].
 */
export const CAMISA_NACIONAL = {
  ES: 'vermelho',
  AR: 'celeste',
  FR: 'azul',
  'GB-ENG': 'branco',
  BR: 'amarelo',
  MA: 'vermelho',
  PT: 'vermelho-escuro',
  BE: 'vermelho',
  NL: 'laranja',
  MX: 'verde',
  CO: 'amarelo',
  DE: 'branco',
  HR: 'vermelho',
  CH: 'vermelho',
  IT: 'azul',
  US: 'azul',
  JP: 'azul',
  SN: 'verde',
  NO: 'vermelho',
  UY: 'celeste',
  DK: 'vermelho',
  IR: 'verde',
  AT: 'vermelho',
  EG: 'vermelho',
  EC: 'amarelo',
  NG: 'verde',
  TR: 'vermelho',
  AU: 'amarelo',
  DZ: 'verde',
  CA: 'vermelho',
  CI: 'laranja',
  KR: 'vermelho',
} as const satisfies Readonly<Record<string, NomeDeCor>>;

/**
 * A cor nacional de uma seleção, com saída declarada para quem não está na tabela.
 *
 * Código fora do catálogo devolve `branco` em vez de `undefined`: um boneco sem cor não é um
 * boneco discreto, é um retângulo transparente no meio do campo. É a mesma regra de `nomeSelecao`
 * em `rotulos.ts` — campo opcional tem saída, e a saída é a menos ruidosa que existe.
 */
export function corNacional(code: string): Cor {
  const nome = (CAMISA_NACIONAL as Readonly<Record<string, NomeDeCor | undefined>>)[code];
  return nome === undefined ? CORES_NACIONAIS.branco : CORES_NACIONAIS[nome];
}

/**
 * Papel → cor, com a camisa saindo da cor nacional da seleção.
 *
 * Pele e cabelo são fixos e **neutros de propósito**: o jogo não representa pessoa nenhuma, e
 * variar tom de pele por seleção seria inventar identidade onde só existe um código ISO.
 *
 * Luva, calção e meião saem da camisa por deslocamento **relativo**, e não por número fixo como
 * antes. É o que faz o branco funcionar: com `s` e `l` cravados em `hsl(matiz, 40, 82)`, uma cor
 * de saturação zero voltava a ter cor, e o kit branco saía colorido nas pontas.
 */
export function paleta(cor: Cor): Readonly<Record<Papel, number>> {
  const claro = Math.min(92, cor.l + 34);
  const escuro = Math.max(12, cor.l - 24);

  return {
    K: 0x3b2a1e, // cabelo
    P: 0xf0c9a0, // pele
    C: hsl(cor.h, cor.s, cor.l), // camisa — a cor nacional, e só ela
    G: hsl(cor.h, cor.s * 0.55, claro), // luva, puxando a camisa para o claro
    S: hsl(cor.h, cor.s * 0.62, escuro), // calção, a mesma cor no escuro
    M: hsl(cor.h, cor.s, Math.max(14, cor.l - 8)), // meião
    B: 0x1a1a20, // chuteira
    W: 0xf7f9fc, // branco da bola
    D: 0x20242e, // gomo escuro da bola
  };
}

/**
 * A cor da listra, que sai da PRÓPRIA camisa e não de uma tabela.
 *
 * Camisa clara ganha listra escura, camisa escura ganha listra clara — uma regra, zero dado novo,
 * e o resultado é sempre visível sobre a base porque é a base que escolhe. O branco cai no ramo
 * escuro, e é o único lugar onde o preto entra no jogo.
 */
export function corDaListra(cor: Cor): Cor {
  return cor.l >= 55 ? { h: 0, s: 0, l: 16 } : { h: 0, s: 0, l: 92 };
}

/** Largura da listra, em pixels da grade. Duas ligadas, duas desligadas: a camisa tem 8 de largura. */
export const LARGURA_DA_LISTRA = 2;

/**
 * A cor de um pixel, já com o padrão aplicado.
 *
 * **Só a camisa (`C`) recebe listra.** Calção e meião ficam lisos de propósito: listrar o boneco
 * inteiro num sprite de 18 pixels vira ruído, e o que precisa ser lido de longe é o tronco.
 */
export function corDoPixel(
  camisa: Camisa,
  cores: Readonly<Record<Papel, number>>,
  papel: Papel,
  x: number,
): number {
  if (papel !== 'C' || camisa.padrao !== 'listras') return cores[papel];
  const naListra = Math.floor(x / LARGURA_DA_LISTRA) % 2 === 1;
  return naListra ? hslDaCor(corDaListra(camisa.cor)) : cores.C;
}

/** Distância entre duas cores no cubo RGB. 0 é a mesma cor; ~441 é preto contra branco. */
export function distanciaDeCor(a: Cor, b: Cor): number {
  const [ra, ga, ba] = canais(hslDaCor(a));
  const [rb, gb, bb] = canais(hslDaCor(b));
  return Math.hypot(ra - rb, ga - gb, ba - bb);
}

function canais(rgb: number): [number, number, number] {
  return [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
}

function hslDaCor(cor: Cor): number {
  return hsl(cor.h, cor.s, cor.l);
}

/**
 * Abaixo desta distância RGB, duas camisas são a mesma camisa para quem está jogando.
 *
 * **O número não é chutado, e a folga dos dois lados é grande:** medida contra as 8 cores da
 * tabela, a menor distância entre cores DIFERENTES é **63,8** (vermelho × vermelho-escuro), e
 * entre cores iguais é **0** por construção. Qualquer valor entre 1 e 63 separa os dois casos;
 * 40 fica no meio e não depende de ajuste fino se uma cor mudar de tom um dia.
 */
export const DISTANCIA_MINIMA = 40;

/**
 * As duas camisas de uma disputa, já desempatadas.
 *
 * **Quem cede é sempre o lado B**, para o resultado não depender da ordem em que os dois chegaram
 * — mesma regra que o `matizDistinto` de `T-20` seguia. O que mudou é o que ele cede: antes era a
 * COR (o matiz ia para o oposto do círculo, e Portugal virava ciano contra a Espanha); agora é o
 * PADRÃO. As duas camisas continuam na cor nacional, e é isso que a saída (B) de `Q-16` comprou.
 *
 * Seleção contra ela mesma é permitido e sai com as duas camisas iguais — cor igual ali é honesta,
 * e listrar uma das duas diria que são seleções diferentes.
 */
export function camisasDaDisputa(codeA: string, codeB: string): { A: Camisa; B: Camisa } {
  const corA = corNacional(codeA);
  const corB = corNacional(codeB);
  const colidem = codeA !== codeB && distanciaDeCor(corA, corB) < DISTANCIA_MINIMA;

  return {
    A: { cor: corA, padrao: 'liso' },
    B: { cor: corB, padrao: colidem ? 'listras' : 'liso' },
  };
}

/**
 * HSL → inteiro RGB, porque `matiz` chega em grau e Phaser quer `0xRRGGBB`.
 *
 * @param h 0..359 · @param s 0..100 · @param l 0..100
 */
export function hsl(h: number, s: number, l: number): number {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = ln - c / 2;

  const [r, g, b] =
    hh < 1 ? [c, x, 0]
    : hh < 2 ? [x, c, 0]
    : hh < 3 ? [0, c, x]
    : hh < 4 ? [0, x, c]
    : hh < 5 ? [x, 0, c]
    : [c, 0, x];

  const oito = (v: number): number => Math.max(0, Math.min(255, Math.round((v + m) * 255)));
  return (oito(r) << 16) | (oito(g) << 8) | oito(b);
}

/*
 * `matizDistinto` e `SEPARACAO_MINIMA` saíram daqui em `T-29` (`D-88`).
 *
 * Eles resolviam o mesmo problema — dois lados com camisa parecida —, mas pagando com a COR: o
 * matiz do lado B ia para o oposto do círculo. Com cor de hash isso não custava nada, porque a
 * cor não significava nada. Com cor nacional o preço vira Espanha × Portugal com uma camisa ciana,
 * e aí o conserto contradiz o pedido que o card veio atender.
 *
 * Quem faz o trabalho agora é `camisasDaDisputa`, pelo padrão. Nada foi perdido: a garantia
 * "os dois lados nunca saem com a mesma camisa" continua sendo cobrada por teste sobre as 32x32.
 */
