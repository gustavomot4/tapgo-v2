/**
 * M7 — o link do convite: montar e ler. Módulo **puro**, sem DOM e sem sessão.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * Existe separado da tela porque é a única parte de `T-21` que uma suíte sem navegador consegue
 * cobrar: `vitest` roda em Node, `document` não existe, e o resto da tela de convite é do dono
 * no aparelho real. Aqui ficam as duas funções que erram em silêncio se ninguém as testar —
 * montar o endereço e reconhecê-lo de volta.
 *
 * ## Por que o ID viaja na busca (`?sala=`), e não no fragmento
 * É o mesmo formato que `medicao.html` usou em campo (`?m=`), e é o que já provou atravessar a
 * cola de mensageiro sem perder pedaço. O fragmento também funcionaria, mas trocar de formato
 * entre o instrumento que mediu e o jogo que entrega não ganha nada e ainda perde a comparação.
 *
 * **Nada de pessoal vai no endereço:** o ID é sorteado por `crypto.getRandomValues` (`D-30`) e
 * não deriva de aparelho, nome ou preferência. É opaco por construção, e o link é justamente o
 * que a pessoa vai colar num aplicativo de terceiro.
 */

/** O nome do parâmetro. Um só lugar, porque quem monta e quem lê têm de concordar. */
export const PARAM_SALA = 'sala';

/**
 * A forma do ID de sala, espelhada de M6 (26 caracteres do alfabeto Crockford base32).
 *
 * **É cópia declarada, não segunda fonte de verdade.** M5 é quem recusa o ID malformado — e
 * recusa lançando —, e esta camada não pode importar M6 para ler a constante de lá (portão de
 * camada). Ela existe para que um link truncado no mensageiro vire frase em português ANTES de
 * a sessão nascer, em vez de exceção na criação. Divergiu de M6? Quem manda é M6: o ID passa
 * daqui, `createSession` lança, e a tela cai no seu estado de erro — que é o pior caso, não um
 * caminho quebrado.
 */
export const FORMATO_SALA = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

/**
 * O endereço para colar no outro aparelho.
 *
 * Devolve o MESMO documento com o parâmetro trocado: `origin` + `pathname` são preservados
 * porque o jogo é servido de uma subpasta (`/tapgo-v2/`, ver `vite.config.ts`), e um link
 * montado a partir da raiz daria 404 exatamente no aparelho do convidado.
 *
 * Qualquer outro parâmetro que já estivesse no endereço é descartado de propósito: o convite é
 * um endereço limpo, e carregar junto o que estava na barra é como o link de um jogador acaba
 * levando o estado do outro.
 */
export function linkDaSala(endereco: string, sala: string): string {
  const url = new URL(endereco);
  url.hash = '';
  url.search = '';
  url.searchParams.set(PARAM_SALA, sala);
  return url.toString();
}

/**
 * O ID de sala que veio no endereço, ou `null` quando não há convite nenhum.
 *
 * `null` em três casos, e todos são normais: endereço sem o parâmetro (quem abriu o jogo pelo
 * atalho), parâmetro vazio, e ID fora do formato (link truncado). Nunca lança — esta função roda
 * na abertura do jogo, e uma exceção aqui deixaria a página em branco para quem só queria jogar
 * contra o computador.
 */
export function salaDoEndereco(endereco: string): string | null {
  let bruto: string | null;
  try {
    bruto = new URL(endereco).searchParams.get(PARAM_SALA);
  } catch {
    return null;
  }

  if (bruto === null) return null;
  const sala = bruto.trim().toUpperCase();
  return FORMATO_SALA.test(sala) ? sala : null;
}

/**
 * O ID quebrado em blocos de quatro, para quem vai ditar o código em voz alta.
 *
 * 26 caracteres corridos num celular de 360px são uma parede: a pessoa perde o lugar na terceira
 * tentativa. O valor real nunca passa por aqui — isto é só apresentação, e quem entra na sala é
 * sempre o ID do link.
 */
export function salaLegivel(sala: string): string {
  return (sala.match(/.{1,4}/g) ?? [sala]).join(' ');
}
