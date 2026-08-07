/**
 * M7 — a porta de entrada da tela.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 * Porta declarada: `export function bootGame(container: HTMLElement): void`.
 *
 * ## O portão de camada, em uma frase
 * Nenhum arquivo de `src/ui/` importa `src/engine`, `src/cpu` ou `src/net` — os tipos do motor
 * (`MatchState`), do canal (`LinkStatus`) e da CPU (`Level`) chegam **reexportados por M5**. É
 * literalmente o que o `grep` do portão de M7 procura, e é o que "motor isolado do render"
 * (`D-01`) significa quando deixa de ser prosa.
 *
 * ## Onde Phaser entra, e onde não entra
 * Só em `cena.ts`, e só por `import()` dinâmico — fora do bundle inicial. Menu, seleções, placar
 * e as três zonas de toque são DOM, porque o portão da skill `frontend-uiux` pede teclado, foco
 * visível e rótulo lido por leitor de tela, e `<canvas>` não entrega nenhum dos três.
 */

import { el, limpar } from './dom';
import { lerPreferencias, gravarPreferencias } from './preferencias';
import type { Preferencias } from './preferencias';
import { criarSom } from './som';
import type { Contexto, Rota, Tela } from './rotas';
import { telaInicio } from './tela_inicio';
import { telaSelecoes } from './tela_selecoes';
import { telaCobranca } from './tela_cobranca';
import { telaFim } from './tela_fim';
import './estilo.css';

function escolherTela(rota: Rota): Tela {
  if (rota.nome === 'inicio') return telaInicio;
  if (rota.nome === 'selecoes') return telaSelecoes(rota.modo, rota.nivel);
  if (rota.nome === 'cobranca') return telaCobranca(rota.partida);
  return telaFim(rota.partida, rota.estado);
}

/**
 * Liga o jogo dentro de `container`.
 *
 * Não lança: uma exceção aqui deixaria a página em branco, que é a pior tela possível. Falha de
 * partida vira aviso em português com o que fazer.
 */
export function bootGame(container: HTMLElement): void {
  const raiz = el('div', { classe: 'tapgo' });
  container.replaceChildren(raiz);

  let prefs: Preferencias = lerPreferencias();
  const som = criarSom(prefs.som);

  let desmontar: () => void = () => undefined;
  let aqueceu = false;

  const ctx: Contexto = {
    som,

    prefs: () => prefs,

    salvarPrefs(p: Preferencias): void {
      prefs = p;
      gravarPreferencias(p);
    },

    ir(rota: Rota): void {
      // Desmontar ANTES de limpar: é o `dispose()` da sessão e o `destroy()` do Phaser. Na ordem
      // inversa, o canvas sairia da árvore com o laço de render ainda rodando sobre ele.
      desmontar();
      desmontar = () => undefined;
      limpar(raiz);

      try {
        desmontar = escolherTela(rota)(raiz, ctx);
      } catch {
        mostrarFalha(raiz, ctx);
      }
    },

    aquecerCena(): void {
      if (aqueceu) return;
      aqueceu = true;
      // Erro ignorado de propósito: quem realmente precisa da cena é a tela de cobrança, e é lá
      // que a falha vira "campo simplificado". Aqui é só adiantamento.
      void import('./cena').catch(() => undefined);
    },
  };

  ctx.ir({ nome: 'inicio' });
}

/** Última rede: tela quebrada vira frase em português com uma saída, nunca página em branco. */
function mostrarFalha(raiz: HTMLElement, ctx: Contexto): void {
  limpar(raiz);
  const voltar = el('button', {
    classe: 'botao',
    texto: 'Voltar ao início',
    attrs: { type: 'button' },
  });
  voltar.addEventListener('click', () => ctx.ir({ nome: 'inicio' }));

  raiz.append(
    el('section', { classe: 'tela' }, [
      el('h1', { classe: 'titulo', texto: 'Algo deu errado' }),
      el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
        el('p', { texto: 'Não foi possível abrir esta tela.' }),
        el('p', { classe: 'sub', texto: 'Volte ao início e comece uma disputa nova.' }),
      ]),
      voltar,
    ]),
  );
}
