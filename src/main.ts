/**
 * Ponto de entrada da página: liga M7 e sai da frente.
 *
 * Até T-10 este arquivo era a sonda de M9 que provava o portão de E-1 ("a página no ar carrega um
 * asset de teste sem 404"). A sonda cumpriu o papel dela e saiu de cena, como o próprio contrato
 * de E-1 previa. O 404 de asset continua coberto, e melhor: agora quem falha em produção com o
 * `base` errado são os assets REAIS do jogo — os três efeitos de áudio e o pacote da cena.
 *
 * Nenhuma regra de tela mora aqui. Este arquivo acha o contêiner e chama a porta de M7; tudo o
 * mais está em `src/ui/`.
 */

import { bootGame } from './ui/main';

const container = document.querySelector<HTMLElement>('#jogo');

if (container === null) {
  // Não há tela para mostrar o erro — a tela É o que está faltando. O console é o único destino
  // honesto, e ele fala com o dono, não com quem joga.
  console.error('TAP GO: #jogo não existe no index.html — a página não tem onde montar o jogo.');
} else {
  bootGame(container);
}

export {};
