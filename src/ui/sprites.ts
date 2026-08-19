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
 * resolve papel→cor é `paleta()`, e é lá que a camisa recebe o matiz da seleção.
 *
 * **O matiz não representa cor nacional nenhuma** — ele sai da soma dos caracteres do código ISO
 * (ver `marcaSelecao` em `rotulos.ts`), é arbitrário e estável, e existe só para dois goleiros em
 * campo não saírem iguais. Reproduzir uniforme de seleção é o que [[licenciamento]] proíbe.
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

/**
 * Papel → cor, com a camisa saindo do matiz da seleção.
 *
 * Pele e cabelo são fixos e **neutros de propósito**: o jogo não representa pessoa nenhuma, e
 * variar tom de pele por seleção seria inventar identidade onde só existe um código ISO.
 */
export function paleta(matiz: number): Readonly<Record<Papel, number>> {
  return {
    K: 0x3b2a1e, // cabelo
    P: 0xf0c9a0, // pele
    C: hsl(matiz, 72, 52), // camisa — o matiz da seleção, e só ela
    G: hsl(matiz, 40, 82), // luva, puxando a camisa para o claro
    S: hsl(matiz, 45, 24), // calção, a mesma cor no escuro
    M: hsl(matiz, 72, 44), // meião
    B: 0x1a1a20, // chuteira
    W: 0xf7f9fc, // branco da bola
    D: 0x20242e, // gomo escuro da bola
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

/**
 * Distância angular mínima entre as camisas dos dois lados de UMA disputa.
 *
 * 40 graus é onde duas camisas deixam de ser "parecidas" e passam a ser confundíveis num boneco
 * de 18 pixels visto em 360x640.
 */
export const SEPARACAO_MINIMA = 40;

/**
 * O matiz do lado B, afastado do de A quando os dois quase coincidem.
 *
 * **Existe porque o matiz de `marcaSelecao` não é injetor:** o hash `(soma*37)%360` de `T-10` dá
 * **30** cores distintas para as 32 seleções — `FR`/`NL` e `MA`/`EG` caem no mesmo valor, conferido
 * contra o catálogo. No disco isso era cosmético; em campo, com goleiro e batedor coloridos, os
 * dois lados de França × Holanda
 * poria os dois bonecos com a MESMA camisa, e a pessoa perderia quem é quem. Ver `QA-20`.
 *
 * O conserto é **local à disputa** de propósito: mudar o hash mudaria a cor de marca de todas as
 * seleções em todas as telas, e isso é `D-NN` do dono, não efeito colateral de uma tarefa de arte.
 *
 * **Consequência declarada:** nos três pares acima, a camisa do lado B em campo deixa de casar com
 * o disco dele no placar. É troca consciente — em campo, distinguir os dois bonecos é a função, e
 * casar com o cabeçalho é conforto.
 */
export function matizDistinto(a: number, b: number): number {
  const bruto = Math.abs(((a % 360) + 360) % 360 - (((b % 360) + 360) % 360));
  const distancia = Math.min(bruto, 360 - bruto);
  if (distancia >= SEPARACAO_MINIMA) return ((b % 360) + 360) % 360;
  // Manda para o oposto: é o ponto de maior distância possível, e é determinístico.
  return (a + 180) % 360;
}
