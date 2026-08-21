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

import type { CountryCode, Side } from '../core/index';
import { newSeed } from '../core/index';
import { el, limpar } from './dom';
import { salaDoEndereco, timesDoEndereco } from './convite';
import { ehDoCatalogo } from './rotulos';
import { lerPreferencias, gravarPreferencias, selecaoInicial } from './preferencias';
import type { Preferencias } from './preferencias';
import { criarSom } from './som';
import { SERIE_ZERO } from './rotas';
import type { Contexto, Rota, Tela } from './rotas';
import { telaInicio } from './tela_inicio';
import { telaSelecoes } from './tela_selecoes';
import { telaCobranca } from './tela_cobranca';
import { telaConvite } from './tela_convite';
import { telaFim } from './tela_fim';
import { telaTorneio } from './tela_torneio';
import { telaTorneioNovo } from './tela_torneio_novo';
import { telaCampeao } from './tela_campeao';
import { gravarTorneio, limparTorneio, restaurarTorneio } from './torneio_salvo';
import type { TorneioEmCurso } from './torneio_salvo';
import './estilo.css';

function escolherTela(rota: Rota): Tela {
  if (rota.nome === 'inicio') return telaInicio;
  if (rota.nome === 'selecoes') return telaSelecoes(rota.modo, rota.nivel);
  if (rota.nome === 'convite') return telaConvite(rota.partida);
  if (rota.nome === 'cobranca') return telaCobranca(rota.partida, rota.sessao ?? null);
  if (rota.nome === 'torneio_novo') return telaTorneioNovo;
  if (rota.nome === 'torneio') return telaTorneio;
  if (rota.nome === 'campeao') return telaCampeao;
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

  /*
   * O torneio salvo é lido UMA vez, na abertura, e vira o torneio vivo (`D-57`). Retrato
   * ilegível devolve `null` sem dizer nada — quem descarta é `torneio_salvo.ts`, e o jogo abre
   * no menu como se nunca tivesse havido torneio. É o portão de `T-14`, e é o caminho normal
   * de quem nunca jogou um.
   */
  let torneio: TorneioEmCurso | null = restaurarTorneio();

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

    torneio: () => torneio,

    definirTorneio(t: TorneioEmCurso | null): void {
      torneio = t;
      if (t === null) limparTorneio();
      else gravarTorneio(t);
    },

    salvarTorneio(): void {
      if (torneio !== null) gravarTorneio(torneio);
    },

    aquecerCena(): void {
      if (aqueceu) return;
      aqueceu = true;
      // Erro ignorado de propósito: quem realmente precisa da cena é a tela de cobrança, e é lá
      // que a falha vira "campo simplificado". Aqui é só adiantamento.
      void import('./cena').catch(() => undefined);
    },
  };

  ctx.ir(abertura(prefs, torneio !== null));
}

/**
 * Em que tela o jogo abre (`T-21`).
 *
 * Três caminhos, nesta ordem de precedência:
 *
 * 1. **Convite no endereço** (`?sala=`) — quem chegou por link quer entrar NAQUELA sala, e nada
 *    mais. Vence até o torneio salvo: o link é o que a pessoa acabou de tocar, e o torneio
 *    continua guardado, esperando, sem perder nada.
 * 2. **Torneio salvo** (`D-57`) — fechar e reabrir continua de onde parou.
 * 3. O menu.
 *
 * A disputa em andamento NUNCA é retomada — ela nunca é gravada, por contrato de privacidade —,
 * então o que volta do torneio é a próxima disputa do jogador.
 *
 * O convidado não passa pela tela de seleções: o fluxo dele fecha em 1 toque, e as seleções vêm
 * **do link** (`D-77`) — é o que faz os dois aparelhos mostrarem o mesmo confronto, defeito que
 * `A-22` pegou em campo. Link antigo, sem o parâmetro, cai na preferência do aparelho, que é o
 * comportamento que `T-21` entregou. Sem catálogo não há seleção possível, e aí a abertura é o
 * menu, que já tem o estado vazio escrito.
 */
function abertura(prefs: Preferencias, temTorneio: boolean): Rota {
  const endereco = window.location.href;
  const sala = salaDoEndereco(endereco);
  // `D-77`: as seleções do anfitrião vêm no link. A preferência do aparelho é o ramo de trás —
  // link antigo, sem `t=`, continua entrando na sala. Sem os dois, não há confronto a montar.
  const doLink = sala === null ? null : timesDoEndereco(endereco, ehDoCatalogo);
  const escolha = doLink ?? (sala === null ? null : selecaoInicial(prefs));

  if (sala !== null && escolha !== null) {
    const times: Readonly<Record<Side, CountryCode>> = { A: escolha.A, B: escolha.B };
    return {
      nome: 'convite',
      partida: {
        modo: 'online',
        torneio: false,
        nivel: null,
        times,
        // O convidado é sempre o lado B: quem convida é o A, e é ele quem cobra primeiro
        // enquanto o sorteio do `online` não for semeado pelo `roomId` (ver M5, em `first`).
        ladoLocal: 'B',
        // Semente do aparelho, e ela não é lida no `online`: quem sorteia lá é ninguém. Passar
        // uma semente de verdade mesmo assim mantém a configuração igual à dos outros modos.
        semente: newSeed(),
        sala,
        // O `online` não tem série de revanches (`T-32`): lá o botão é "Convidar de novo",
        // e sala nova é confronto novo. Zero literal, não pendência.
        serie: SERIE_ZERO,
      },
    };
  }

  return temTorneio ? { nome: 'torneio' } : { nome: 'inicio' };
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
