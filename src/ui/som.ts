/**
 * M7 — os três efeitos de áudio.
 *
 * Os arquivos são **autorais e gerados por script** (`src/scripts/gen-audio.mjs`): nenhum sample
 * de terceiro, nenhuma amostra baixada, saída determinística conferível por hash. Cada um tem
 * linha na tabela de procedência de [[licenciamento]], que é o portão de licença de M7.
 *
 * Fica fora do Phaser de propósito. O som toca em telas que não têm canvas (confirmação, fim de
 * disputa), e amarrá-lo ao gerenciador de áudio de Phaser faria a preferência "som" só existir
 * dentro da cena — que é justamente onde ela não é ajustada.
 */

import chuteUrl from '../assets/audio/chute.wav';
import golUrl from '../assets/audio/gol.wav';
import defesaUrl from '../assets/audio/defesa.wav';

export type Efeito = 'chute' | 'gol' | 'defesa';

const FONTES: Readonly<Record<Efeito, string>> = {
  chute: chuteUrl,
  gol: golUrl,
  defesa: defesaUrl,
};

export interface Som {
  tocar(efeito: Efeito): void;
  definirLigado(ligado: boolean): void;
  ligado(): boolean;
  destruir(): void;
}

/**
 * Um `Audio` por efeito, reaproveitado.
 *
 * Criar o elemento no momento do toque atrasaria o som do chute justamente na primeira cobrança,
 * que é quando a pessoa está julgando se o jogo responde. `volume` abaixo de 1: o efeito é curto
 * e agudo, e no alto-falante de celular ele estoura no volume cheio.
 */
export function criarSom(ligadoInicial: boolean): Som {
  let ligado = ligadoInicial;

  const elementos = new Map<Efeito, HTMLAudioElement>();
  for (const [efeito, url] of Object.entries(FONTES) as [Efeito, string][]) {
    const el = new Audio(url);
    el.preload = 'auto';
    el.volume = 0.65;
    elementos.set(efeito, el);
  }

  return {
    tocar(efeito: Efeito): void {
      if (!ligado) return;
      const el = elementos.get(efeito);
      if (el === undefined) return;

      // Rebobinar permite dois gols seguidos soarem duas vezes; sem isto o segundo é engolido.
      el.currentTime = 0;

      // A política de reprodução automática rejeita esta promessa enquanto não houver gesto do
      // usuário. Isso não é erro do jogo e não vira mensagem: engolir aqui é o comportamento
      // correto, e o primeiro toque na tela já destrava os seguintes.
      void el.play().catch(() => undefined);
    },

    definirLigado(valor: boolean): void {
      ligado = valor;
      if (!valor) {
        for (const el of elementos.values()) el.pause();
      }
    },

    ligado(): boolean {
      return ligado;
    },

    destruir(): void {
      for (const el of elementos.values()) {
        el.pause();
        el.src = '';
      }
      elementos.clear();
    },
  };
}
