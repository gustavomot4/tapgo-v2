/**
 * M9 — sonda do esqueleto de publicação (E-1).
 *
 * Não é jogo e não vira jogo. Existe para que o portão de E-1 — "a página no ar carrega um
 * asset de teste **sem 404**" — seja verificável a olho nu, no celular do dono, sem abrir o
 * DevTools. Sai de cena quando M7 entrar (T-10).
 *
 * Portão de privacidade de M9: nenhuma chamada de rede além do próprio asset do build.
 */

const sonda = document.querySelector<HTMLImageElement>('#sonda');
const veredito = document.querySelector<HTMLElement>('#veredito');
const alvoUrl = document.querySelector<HTMLElement>('#url');
const alvoBase = document.querySelector<HTMLElement>('#base');

function decidir(carregou: boolean): void {
  if (!veredito) return;
  veredito.dataset['status'] = carregou ? 'ok' : 'erro';
  veredito.textContent = carregou
    ? 'asset carregado — sem 404'
    : 'asset NÃO carregou (404): o `base` de vite.config.ts não bate com a URL do Pages';
}

if (sonda) {
  if (alvoUrl) alvoUrl.textContent = sonda.currentSrc || sonda.src;
  if (alvoBase) alvoBase.textContent = import.meta.env.BASE_URL;

  // O módulo é deferido, mas a imagem pode terminar ANTES dele: sem este ramo o veredito
  // ficaria preso em "verificando" justamente no caso que passa.
  if (sonda.complete) {
    decidir(sonda.naturalWidth > 0);
  } else {
    sonda.addEventListener('load', () => decidir(true), { once: true });
    sonda.addEventListener('error', () => decidir(false), { once: true });
  }
}

export {};
