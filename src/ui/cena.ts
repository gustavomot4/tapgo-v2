/**
 * M7 — a cena da cobrança, em Phaser 3.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * ## A fronteira DOM/canvas
 * Este é o **único** arquivo de M7 que conhece Phaser, e ele desenha — não recebe toque. As três
 * zonas são `<button>` do DOM posicionados por cima do canvas (ver `.zonas` em `estilo.css`).
 *
 * A razão é o portão da skill `frontend-uiux`: teclado percorrendo o fluxo crítico, foco visível
 * e rótulo lido por leitor de tela. `<canvas>` não entrega nenhum dos três — `Tab` não alcança
 * nada dentro dele, não há anel de foco e o leitor de tela vê um retângulo vazio. Com a entrada
 * no DOM e o desenho no canvas, os dois portões fecham ao mesmo tempo: dedo e teclado usam o
 * mesmo `<button>`, e Phaser cuida do que ele faz bem, que é animar.
 *
 * ## Carregado sob demanda
 * Este módulo entra por `import()` dinâmico, e por isso **fica fora do bundle inicial** que
 * `src/scripts/bundle-size.mjs` mede. Phaser custa algumas centenas de kB, e nem o menu nem a
 * escolha de seleções precisam dele: ele chega enquanto a pessoa escolhe as seleções.
 *
 * Se a importação falhar (rede caindo no meio, chunk fora do ar), **a disputa continua jogável**:
 * quem falha é o cenário, não o jogo. Ver `montarCena` e o ramo `campo__sem-canvas`.
 *
 * ## Assets: continuam ZERO arquivos
 * Os bonecos são pixel art, mas nenhum PNG entra em `src/assets/`: a arte é **dado no código**
 * (`sprites.ts`) e vira textura do Phaser em tempo de execução. `assets/` segue com os três
 * áudios e as 32 bandeiras, e a procedência de [[licenciamento]] não ganha linha nova.
 *
 * A camisa recebe o **matiz da seleção** — o mesmo de `marcaSelecao`, arbitrário e derivado do
 * código ISO. Não é cor nacional e não imita uniforme: é o que faz dois goleiros em campo não
 * saírem iguais, que era o pedido, sem tocar no que [[licenciamento]] proíbe.
 */

import Phaser from 'phaser';
import type { Side, Zone } from '../core/index';
import { createRng } from '../core/index';
import {
  BATEDOR_CHUTE,
  BATEDOR_PARADO,
  BOLA,
  GOLEIRO_MERGULHO,
  GOLEIRO_PARADO,
  dimensoes,
  matizDistinto,
  paleta,
} from './sprites';
import type { Papel, Sprite } from './sprites';
import { outroLado } from './derivacao';

const LARGURA = 360;
const ALTURA = 260;

/*
 * Geometria da cena, em pixels lógicos. Os números moram juntos porque quase todos são relativos
 * uns aos outros: mexer na linha do gol sem mexer no goleiro põe o goleiro dentro da rede.
 */
const ARQUIBANCADA_ATE = 56;
const GOL = { esquerda: 60, direita: 300, topo: 62, linha: 152, poste: 6 } as const;

/** Onde a bola termina em cada zona. Casa com as três zonas de toque do DOM por cima do canvas. */
const ALVO: Readonly<Record<Zone, number>> = { L: 96, C: 180, R: 264 };

const BOLA_REPOUSO = { x: 180, y: 226 };
const GOLEIRO_REPOUSO = { x: 180, y: 132 };
const BATEDOR_REPOUSO = { x: 146, y: 198 };
const LINHA_BOLA = 120;

/** Escala de cada sprite. O batedor é maior que o goleiro porque está mais perto de quem olha. */
const ESCALA = { goleiro: 2.2, batedor: 2.4, bola: 1.6 } as const;

/** Semente FIXA da torcida: a arquibancada é cenário, e cenário que muda a cada partida distrai. */
const SEMENTE_DA_TORCIDA = 20260813;

export interface Cena {
  /** Matiz de cada lado, para camisa de goleiro e de batedor. Chamar antes da 1ª cobrança. */
  definirMatizes(matizes: Readonly<Record<Side, number>>): void;
  /** Anima a cobrança inteira e resolve quando ela termina. Nunca rejeita. */
  animar(chute: Zone, defesa: Zone, gol: boolean, cobra: Side): Promise<void>;
  /** Volta bola e bonecos ao lugar, já vestidos para a cobrança de `cobra`. */
  repousar(cobra: Side | null): void;
  destruir(): void;
}

function movimentoReduzido(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

class CobrancaCena extends Phaser.Scene {
  private bola!: Phaser.GameObjects.Image;
  private goleiro!: Phaser.GameObjects.Image;
  private batedor!: Phaser.GameObjects.Image;
  private clarao!: Phaser.GameObjects.Rectangle;
  private pronta = false;

  /** Matiz por lado. O padrão só vale até `definirMatizes`, e existe para nada nascer sem cor. */
  private matizes: Record<Side, number> = { A: 210, B: 15 };
  private cobra: Side = 'A';

  // Sem `override`: `Phaser.Scene` não declara `create` no tipo base — o laço do Phaser a chama
  // por nome, se existir. É o motivo de `noImplicitOverride` não a alcançar.
  public create(): void {
    this.desenharCampo();

    this.texturaDeSprite('bola', BOLA, 0);
    this.texturasDosLados();

    this.goleiro = this.add
      .image(GOLEIRO_REPOUSO.x, GOLEIRO_REPOUSO.y, this.chave('goleiro', 'B'))
      .setScale(ESCALA.goleiro)
      .setDepth(2);

    this.batedor = this.add
      .image(BATEDOR_REPOUSO.x, BATEDOR_REPOUSO.y, this.chave('batedor', 'A'))
      .setScale(ESCALA.batedor)
      .setDepth(3);

    this.bola = this.add
      .image(BOLA_REPOUSO.x, BOLA_REPOUSO.y, 'bola')
      .setScale(ESCALA.bola)
      .setDepth(4);

    // Clarão de resultado: um retângulo transparente que pisca. Mais barato que partículas e
    // suficiente para dizer "aconteceu alguma coisa" sem texto dentro do canvas.
    this.clarao = this.add
      .rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0xffffff, 0)
      .setDepth(5);

    this.pronta = true;
  }

  // ── Texturas ────────────────────────────────────────────────────────────────────────────

  private chave(quem: string, lado: Side): string {
    return `${quem}-${this.matizes[lado]}`;
  }

  /**
   * Pinta uma grade de `sprites.ts` numa textura, um `fillRect` de 1x1 por pixel.
   *
   * É o passo que troca "arquivo de imagem" por "dado no código": a arte fica versionada como
   * texto, e a camisa é parâmetro em vez de virar 32 PNGs.
   */
  private texturaDeSprite(chave: string, sprite: Sprite, matiz: number): void {
    if (this.textures.exists(chave)) return;

    const { largura, altura } = dimensoes(sprite);
    const cores = paleta(matiz);
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    for (let y = 0; y < altura; y += 1) {
      const linha = sprite[y] ?? '';
      for (let x = 0; x < largura; x += 1) {
        const ch = linha[x];
        if (ch === undefined || ch === '.') continue;
        const cor = cores[ch as Papel];
        // Caractere fora do alfabeto é erro de digitação na grade, e a suíte o pega antes daqui.
        // Em runtime ele é ignorado: melhor um pixel faltando do que a cena inteira não subir.
        if (cor === undefined) continue;
        g.fillStyle(cor, 1).fillRect(x, y, 1, 1);
      }
    }

    g.generateTexture(chave, largura, altura);
    g.destroy();
  }

  /** As texturas de boneco desta partida: goleiro e batedor, parado e em ação, dos dois lados. */
  private texturasDosLados(): void {
    for (const lado of ['A', 'B'] as const) {
      const matiz = this.matizes[lado];
      this.texturaDeSprite(`goleiro-${matiz}`, GOLEIRO_PARADO, matiz);
      this.texturaDeSprite(`mergulho-${matiz}`, GOLEIRO_MERGULHO, matiz);
      this.texturaDeSprite(`batedor-${matiz}`, BATEDOR_PARADO, matiz);
      this.texturaDeSprite(`chute-${matiz}`, BATEDOR_CHUTE, matiz);
    }
  }

  public definirMatizes(matizes: Readonly<Record<Side, number>>): void {
    // `B` passa por `matizDistinto` porque o matiz de M7 nao e injetor: 3 pares das 32 colidem
    // (`QA-20`), e camisa igual nos dois bonecos apaga quem e quem no unico lugar onde isso
    // importa. Quem cede e sempre o lado B, para o resultado nao depender da ordem.
    this.matizes = { A: matizes.A, B: matizDistinto(matizes.A, matizes.B) };
    if (!this.pronta) return;
    this.texturasDosLados();
    this.vestir();
  }

  /** Põe em cada boneco a camisa do lado certo: quem cobra é `this.cobra`, quem defende é o outro. */
  private vestir(): void {
    this.batedor.setTexture(this.chave('batedor', this.cobra));
    this.goleiro.setTexture(this.chave('goleiro', outroLado(this.cobra)));
  }

  // ── Cenário ─────────────────────────────────────────────────────────────────────────────

  /**
   * Arquibancada, gramado, gol e rede. Tudo `Graphics`, e continua sem arquivo em `assets/`.
   *
   * As cores são vivas de propósito: o pedido do dono foi "2D com cores vivas", e o campo escuro
   * de `T-10` era o que mais dava ao jogo cara de protótipo.
   */
  private desenharCampo(): void {
    const g = this.add.graphics();

    this.desenharTorcida(g);

    // Gramado em faixas, como campo cortado. A faixa mais clara é a de baixo, onde a bola fica.
    const faixas = [
      { y: ARQUIBANCADA_ATE, h: 40, cor: 0x3d9448 },
      { y: ARQUIBANCADA_ATE + 40, h: 52, cor: 0x469e50 },
      { y: ARQUIBANCADA_ATE + 92, h: 56, cor: 0x51ac5b },
      { y: ARQUIBANCADA_ATE + 148, h: ALTURA, cor: 0x5cb765 },
    ];
    for (const f of faixas) g.fillStyle(f.cor, 1).fillRect(0, f.y, LARGURA, f.h);

    // Rede dentro da boca do gol, antes das traves para elas ficarem por cima.
    const bocaL = GOL.direita - GOL.esquerda;
    const bocaA = GOL.linha - GOL.topo;
    g.fillStyle(0x8fb894, 0.35).fillRect(GOL.esquerda, GOL.topo, bocaL, bocaA);
    g.lineStyle(1, 0xe8f2ea, 0.45);
    for (let x = GOL.esquerda; x <= GOL.direita; x += 12) {
      g.beginPath().moveTo(x, GOL.topo).lineTo(x, GOL.linha).strokePath();
    }
    for (let y = GOL.topo; y <= GOL.linha; y += 12) {
      g.beginPath().moveTo(GOL.esquerda, y).lineTo(GOL.direita, y).strokePath();
    }

    // Traves e travessão.
    g.fillStyle(0xf4faf5, 1);
    g.fillRect(GOL.esquerda - GOL.poste, GOL.topo - GOL.poste, GOL.poste, bocaA + GOL.poste);
    g.fillRect(GOL.direita, GOL.topo - GOL.poste, GOL.poste, bocaA + GOL.poste);
    g.fillRect(GOL.esquerda - GOL.poste, GOL.topo - GOL.poste, bocaL + GOL.poste * 2, GOL.poste);

    // Linha de fundo e grande área — o que dá a leitura de "é um campo", e não de fundo verde.
    g.fillStyle(0xf4faf5, 0.9);
    g.fillRect(0, GOL.linha, LARGURA, 3);
    g.fillRect(16, GOL.linha + 46, 3, 60);
    g.fillRect(LARGURA - 19, GOL.linha + 46, 3, 60);
    g.fillRect(16, GOL.linha + 46, LARGURA - 32, 3);

    // Marca do pênalti.
    g.fillStyle(0xf4faf5, 0.95).fillCircle(BOLA_REPOUSO.x, BOLA_REPOUSO.y + 18, 3);

    g.setDepth(1);
  }

  /**
   * A torcida: blocos pequenos numa arquibancada, sorteados com semente FIXA.
   *
   * Determinística por dois motivos, e nenhum é estética: cenário que muda a cada partida chama
   * atenção para si, e o gerador com semente de M1 mantém o projeto sem gerador nativo — que é
   * portão, e não preferência.
   */
  private desenharTorcida(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x1b2740, 1).fillRect(0, 0, LARGURA, ARQUIBANCADA_ATE);

    const rng = createRng(SEMENTE_DA_TORCIDA);
    // Tons lavados e poucos: torcida com sete cores saturadas vira confete e rouba o olho do
    // gol, que e onde a jogada acontece.
    const tons = [0xc8d2e4, 0xd8c48a, 0x8fa6c4, 0xc49098, 0x9cb89e];

    for (let y = 4; y < ARQUIBANCADA_ATE - 8; y += 7) {
      for (let x = 2; x < LARGURA - 6; x += 6) {
        // Buracos na arquibancada: torcida cheia demais vira textura, não gente.
        if (rng.int(10) < 3) continue;
        const tom = tons[rng.int(tons.length)] ?? 0xe4e9f2;
        g.fillStyle(tom, 0.55).fillRect(x + rng.int(2), y, 4, 5);
      }
    }

    // Sombra na base da arquibancada, para o gramado não colar nela.
    g.fillStyle(0x0d1424, 0.55).fillRect(0, ARQUIBANCADA_ATE - 6, LARGURA, 6);
  }

  public estaPronta(): boolean {
    return this.pronta;
  }

  public voltarAoRepouso(cobra: Side | null): void {
    if (!this.pronta) return;
    this.tweens.killAll();
    if (cobra !== null) this.cobra = cobra;

    this.bola
      .setPosition(BOLA_REPOUSO.x, BOLA_REPOUSO.y)
      .setAlpha(1)
      .setScale(ESCALA.bola)
      .setAngle(0);
    this.goleiro
      .setTexture(this.chave('goleiro', outroLado(this.cobra)))
      .setPosition(GOLEIRO_REPOUSO.x, GOLEIRO_REPOUSO.y)
      .setScale(ESCALA.goleiro)
      .setFlipX(false);
    this.batedor
      .setTexture(this.chave('batedor', this.cobra))
      .setPosition(BATEDOR_REPOUSO.x, BATEDOR_REPOUSO.y)
      .setAlpha(1);
    this.clarao.setAlpha(0);
  }

  public jogar(chute: Zone, defesa: Zone, gol: boolean, cobra: Side): Promise<void> {
    if (!this.pronta) return Promise.resolve();

    const rapido = movimentoReduzido();
    const ms = (n: number): number => (rapido ? 1 : n);

    return new Promise<void>((resolve) => {
      this.voltarAoRepouso(cobra);

      const xChute = ALVO[chute];
      const xDefesa = ALVO[defesa];
      const paraOsLados = xDefesa !== GOLEIRO_REPOUSO.x;

      // O batedor troca para o sprite do chute e some no meio da jogada: ele fica na frente da
      // bola, e mantê-lo em cena esconderia justamente o que a pessoa quer ver.
      this.batedor.setTexture(`chute-${this.matizes[this.cobra]}`);
      this.tweens.add({
        targets: this.batedor,
        alpha: 0,
        duration: ms(220),
        delay: ms(120),
      });

      // Mergulho: sprite deitado, espelhado para o lado certo. Ficar parado no centro é pulinho,
      // e não mergulho — goleiro de pé no meio continua legível como "não saiu do lugar".
      if (paraOsLados) {
        this.goleiro
          .setTexture(`mergulho-${this.matizes[outroLado(this.cobra)]}`)
          .setFlipX(xDefesa < GOLEIRO_REPOUSO.x);
      }
      this.tweens.add({
        targets: this.goleiro,
        x: xDefesa,
        y: paraOsLados ? GOLEIRO_REPOUSO.y + 6 : GOLEIRO_REPOUSO.y - 10,
        duration: ms(300),
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: this.bola,
        x: xChute,
        y: gol ? LINHA_BOLA - 14 : LINHA_BOLA,
        angle: xChute < GOLEIRO_REPOUSO.x ? -220 : 220,
        // A bola encolhe ao se afastar: é a única profundidade que a cena tem, e sem ela o chute
        // parece a bola deslizando no gramado em vez de ir para o fundo.
        scale: ESCALA.bola * 0.7,
        duration: ms(320),
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (gol) {
            this.piscar(0x4ade80, ms(260), resolve);
            return;
          }
          // Defendeu: a bola volta por onde veio, um pouco de lado.
          this.tweens.add({
            targets: this.bola,
            x: xChute + (xChute < 180 ? -34 : 34),
            y: 196,
            scale: ESCALA.bola,
            duration: ms(240),
            ease: 'Quad.easeOut',
          });
          this.piscar(0xff8b93, ms(260), resolve);
        },
      });
    });
  }

  private piscar(cor: number, duracao: number, aoFim: () => void): void {
    this.clarao.setFillStyle(cor, 1);
    this.tweens.add({
      targets: this.clarao,
      alpha: { from: 0.34, to: 0 },
      duration: duracao,
      onComplete: aoFim,
    });
  }
}

/**
 * Cria o jogo Phaser dentro de `pai`.
 *
 * @throws nunca. Falhar aqui é cenário faltando, e quem chama trata mostrando o campo sem canvas.
 */
export async function montarCena(pai: HTMLElement): Promise<Cena> {
  const cena = new CobrancaCena('cobranca');

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: pai,
    width: LARGURA,
    height: ALTURA,
    transparent: true,
    // O áudio do jogo é DOM (`som.ts`), fora do Phaser: ligar o gerenciador dele aqui abriria um
    // `AudioContext` que ninguém usa e que alguns navegadores mantêm suspenso com aviso no console.
    audio: { noAudio: true },
    banner: false,
    // Pixel art com filtro suave vira borrão. `pixelArt` desliga a interpolação, e é o que mantém
    // a borda do boneco quadrada quando a cena é esticada para a largura do celular.
    pixelArt: true,
    // FIT mantém a proporção; o CSS de `.campo__canvas canvas` completa os 100% para não sobrar
    // meia linha de letterbox. A proporção do contêiner (36/26) é a mesma da cena, então as duas
    // regras concordam em vez de brigar.
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: cena,
  });

  // `create()` roda no primeiro passo do laço, não na construção. Sem esta espera, a primeira
  // cobrança animaria objetos que ainda não existem.
  await new Promise<void>((resolve) => {
    if (cena.estaPronta()) {
      resolve();
      return;
    }
    jogo.events.once(Phaser.Core.Events.READY, () => resolve());
  });

  return {
    definirMatizes: (matizes) => cena.definirMatizes(matizes),
    animar: (chute, defesa, gol, cobra) => cena.jogar(chute, defesa, gol, cobra),
    repousar: (cobra) => cena.voltarAoRepouso(cobra),
    destruir: () => jogo.destroy(true),
  };
}
