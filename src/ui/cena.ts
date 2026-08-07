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
 * ## Assets
 * Zero. Tudo aqui é `Graphics` — retângulo, círculo e linha. É o que mantém `assets/` com apenas
 * os três efeitos de áudio, todos com linha de procedência em [[licenciamento]].
 */

import Phaser from 'phaser';
import type { Zone } from '../core/index';

const LARGURA = 360;
const ALTURA = 260;

/** Onde a bola termina em cada zona, no espaço lógico da cena. */
const ALVO: Readonly<Record<Zone, number>> = { L: 96, C: 180, R: 264 };

const BOLA_REPOUSO = { x: 180, y: 232 };
const GOLEIRO_REPOUSO = { x: 180, y: 150 };
const LINHA_BOLA = 128;

export interface Cena {
  /** Anima a cobrança inteira e resolve quando ela termina. Nunca rejeita. */
  animar(chute: Zone, defesa: Zone, gol: boolean): Promise<void>;
  /** Volta bola e goleiro ao lugar, para a próxima cobrança. */
  repousar(): void;
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
  private bola!: Phaser.GameObjects.Arc;
  private goleiro!: Phaser.GameObjects.Rectangle;
  private clarao!: Phaser.GameObjects.Rectangle;
  private pronta = false;

  // Sem `override`: `Phaser.Scene` não declara `create` no tipo base — o laço do Phaser a chama
  // por nome, se existir. É o motivo de `noImplicitOverride` não a alcançar.
  public create(): void {
    this.desenharCampo();

    this.goleiro = this.add
      .rectangle(GOLEIRO_REPOUSO.x, GOLEIRO_REPOUSO.y, 30, 46, 0xffd166)
      .setStrokeStyle(2, 0x8a6d1f)
      .setDepth(2);

    this.bola = this.add.circle(BOLA_REPOUSO.x, BOLA_REPOUSO.y, 9, 0xf5f7fa).setDepth(3);

    // Clarão de resultado: um retângulo transparente que pisca. Mais barato que partículas e
    // suficiente para dizer "aconteceu alguma coisa" sem texto dentro do canvas.
    this.clarao = this.add
      .rectangle(LARGURA / 2, ALTURA / 2, LARGURA, ALTURA, 0xffffff, 0)
      .setDepth(4);

    this.pronta = true;
  }

  /** Gol, gramado e rede. Só primitivos — nenhum arquivo de imagem entra em `assets/` por isto. */
  private desenharCampo(): void {
    const g = this.add.graphics();

    g.fillStyle(0x14323a, 1).fillRect(0, 0, LARGURA, ALTURA);
    g.fillStyle(0x1d5c3a, 1).fillRect(0, 176, LARGURA, ALTURA - 176);
    g.lineStyle(2, 0x2f7d51, 1).beginPath().moveTo(0, 176).lineTo(LARGURA, 176).strokePath();

    // Rede: malha fina dentro da boca do gol.
    g.lineStyle(1, 0x9fb3c8, 0.22);
    for (let x = 36; x <= 324; x += 14) g.beginPath().moveTo(x, 46).lineTo(x, 176).strokePath();
    for (let y = 46; y <= 176; y += 14) g.beginPath().moveTo(36, y).lineTo(324, y).strokePath();

    // Traves e travessão, por último, para ficarem por cima da malha.
    g.fillStyle(0xf1f5f9, 1);
    g.fillRect(30, 40, 8, 140);
    g.fillRect(322, 40, 8, 140);
    g.fillRect(30, 40, 300, 8);

    // Marca do pênalti.
    g.fillStyle(0xffffff, 0.5).fillCircle(BOLA_REPOUSO.x, BOLA_REPOUSO.y + 16, 3);

    g.setDepth(1);
  }

  public estaPronta(): boolean {
    return this.pronta;
  }

  public voltarAoRepouso(): void {
    if (!this.pronta) return;
    this.tweens.killAll();
    this.bola.setPosition(BOLA_REPOUSO.x, BOLA_REPOUSO.y).setAlpha(1).setScale(1);
    this.goleiro.setPosition(GOLEIRO_REPOUSO.x, GOLEIRO_REPOUSO.y).setAngle(0);
    this.clarao.setAlpha(0);
  }

  public jogar(chute: Zone, defesa: Zone, gol: boolean): Promise<void> {
    if (!this.pronta) return Promise.resolve();

    const rapido = movimentoReduzido();
    const ms = (n: number): number => (rapido ? 1 : n);

    return new Promise<void>((resolve) => {
      this.voltarAoRepouso();

      const xChute = ALVO[chute];
      const xDefesa = ALVO[defesa];
      const ladoDoMergulho = xDefesa === GOLEIRO_REPOUSO.x ? 0 : xDefesa < GOLEIRO_REPOUSO.x ? -70 : 70;

      this.tweens.add({
        targets: this.goleiro,
        x: xDefesa,
        angle: ladoDoMergulho,
        duration: ms(300),
        ease: 'Quad.easeOut',
      });

      this.tweens.add({
        targets: this.bola,
        x: xChute,
        y: gol ? LINHA_BOLA - 14 : LINHA_BOLA,
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
            y: 200,
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
    animar: (chute, defesa, gol) => cena.jogar(chute, defesa, gol),
    repousar: () => cena.voltarAoRepouso(),
    destruir: () => jogo.destroy(true),
  };
}
