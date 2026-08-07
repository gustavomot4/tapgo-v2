/**
 * M7 — tela da cobrança. É onde a disputa acontece.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * ## O que esta tela NÃO sabe
 * Regra de disputa nenhuma. Não soma placar, não decide gol, não decide fim: tudo isso chega
 * pronto no `MatchState` que M5 entrega. A única coisa derivada aqui é de quem é a vez de
 * escolher no modo `local` — a derivação de `Q-09`, que mora em `derivacao.ts` e é testada.
 *
 * ## Modo `local`: a zona escolhida não aparece na tela
 * Os dois jogadores olham o mesmo aparelho. Se a tela destacasse a zona do chute enquanto o
 * goleiro escolhe, o modo `local` seria injogável — e o defeito seria de UI, não de motor. Por
 * isso o primeiro toque só produz "passe o aparelho": a zona fica dentro de M5, onde já estava,
 * e esta tela nunca a recebe de volta.
 *
 * ## Os 4 estados
 * - **carregando** — a cena Phaser chegando por `import()`. O campo aparece sem animação e os
 *   botões já funcionam: esperar o cenário para deixar jogar seria trocar jogabilidade por enfeite.
 * - **vazio** — não existe: uma disputa sempre tem cobrança a fazer até `phase === 'finished'`,
 *   e aí a tela troca. Lacuna declarada, não esquecida.
 * - **erro** — `createSession` recusou a configuração, ou `choose` recusou o toque. Mensagem em
 *   português, com o que fazer, e uma saída.
 * - **sucesso** — a disputa correndo.
 */

import type { Side, Zone } from '../core/index';
import type { MatchState, Session, SessionConfig } from '../session/index';
import { createSession } from '../session/index';
import type { Cena } from './cena';
import { criarDerivacao } from './derivacao';
import { botao, el, focar, limpar } from './dom';
import { marca } from './tela_selecoes';
import {
  ZONAS,
  descricaoFase,
  instrucao,
  nomeSelecao,
  nomeZona,
  placar,
  resultadoUltimaCobranca,
  rotuloZona,
} from './rotulos';
import type { Contexto, Partida, Tela } from './rotas';

/** Atalhos de teclado sobre o mesmo `<button>` do toque — nenhum caminho de entrada paralelo. */
const TECLAS: Readonly<Record<string, Zone>> = {
  ArrowLeft: 'L',
  ArrowDown: 'C',
  ArrowUp: 'C',
  ArrowRight: 'R',
  '1': 'L',
  '2': 'C',
  '3': 'R',
};

function configDaPartida(p: Partida): SessionConfig {
  // `exactOptionalPropertyTypes` está ligado, e `createSession` recusa `level` fora do modo
  // `cpu`. Montar o objeto em dois ramos é o que impede `level: undefined` de ser passado —
  // que, para o TypeScript deste projeto, não é o mesmo que não passar `level`.
  if (p.modo === 'cpu' && p.nivel !== null) {
    return { mode: 'cpu', seed: p.semente, level: p.nivel, teams: p.times, localSide: p.ladoLocal };
  }
  return { mode: 'local', seed: p.semente, teams: p.times, localSide: p.ladoLocal };
}

export const telaCobranca =
  (partida: Partida): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    const tela = el('section', { classe: 'tela' });
    raiz.append(tela);

    // ── Estado de ERRO na criação ─────────────────────────────────────────────────────────
    let sessao: Session;
    try {
      sessao = createSession(configDaPartida(partida));
    } catch {
      tela.append(
        el('h1', { classe: 'titulo', texto: 'Não foi possível começar' }),
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', { texto: 'A disputa não pôde ser criada com essas escolhas.' }),
          el('p', { classe: 'sub', texto: 'Volte e escolha as seleções de novo.' }),
        ]),
        botao('Voltar ao início', 'botao empurra', () => ctx.ir({ nome: 'inicio' })),
      );
      return () => undefined;
    }

    const derivacao = criarDerivacao(partida.modo, partida.ladoLocal);
    let estado: MatchState = sessao.state();
    let apresentados = 0;
    let travado = false;
    let cena: Cena | null = null;
    let vivo = true;
    // Com o diálogo de saída aberto, os atalhos de teclado precisam calar: `ArrowLeft` chegaria
    // ao `document` por cima do modal e cobraria um pênalti atrás dele.
    let dialogoAberto = false;

    // ── Esqueleto ─────────────────────────────────────────────────────────────────────────
    const numeros = el('span', { classe: 'placar__numeros', texto: placar(estado) });
    const ladoA = el('span', { classe: 'placar__lado' }, [
      marca(partida.times.A),
      el('span', { texto: nomeSelecao(partida.times.A) }),
    ]);
    const ladoB = el('span', { classe: 'placar__lado placar__lado--direita' }, [
      marca(partida.times.B),
      el('span', { texto: nomeSelecao(partida.times.B) }),
    ]);
    const cabecalho = el('div', { classe: 'placar', attrs: { role: 'status' } }, [
      ladoA,
      numeros,
      ladoB,
    ]);

    const canvasPai = el('div', { classe: 'campo__canvas' });
    const semCanvas = el('p', {
      classe: 'campo__sem-canvas',
      texto: 'Preparando o campo — já dá para jogar.',
    });
    const zonas = el('div', { classe: 'zonas' });
    const campo = el('div', { classe: 'campo' }, [canvasPai, semCanvas, zonas]);

    const fase = el('p', { classe: 'sub' });
    const faixa = el('p', { classe: 'faixa', attrs: { role: 'status', 'aria-live': 'polite' } });
    const erro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });
    erro.hidden = true;

    const botoesZona = new Map<Zone, HTMLButtonElement>();
    for (const zona of ZONAS) {
      const b = botao(nomeZona(zona).toUpperCase(), 'zona', () => escolher(zona));
      botoesZona.set(zona, b);
      zonas.append(b);
    }

    const sair = botao('Sair da disputa', 'botao botao--discreto', pedirParaSair);

    tela.append(cabecalho, fase, campo, faixa, erro, el('div', { classe: 'empurra' }, [sair]));

    // ── Desenho ───────────────────────────────────────────────────────────────────────────

    function travarZonas(valor: boolean): void {
      for (const b of botoesZona.values()) b.disabled = valor;
    }

    function desenhar(): void {
      numeros.textContent = placar(estado);
      fase.textContent = descricaoFase(estado);

      const vez = derivacao.vez(estado);
      if (vez === null) {
        travarZonas(true);
        return;
      }

      // Quem está com o aparelho na mão, em destaque no placar.
      const emFoco: Side = partida.modo === 'cpu' ? partida.ladoLocal : vez.lado;
      ladoA.dataset['vez'] = emFoco === 'A' ? 'sim' : 'nao';
      ladoB.dataset['vez'] = emFoco === 'B' ? 'sim' : 'nao';

      for (const [zona, b] of botoesZona) {
        b.setAttribute('aria-label', rotuloZona(zona, vez.papel));
      }
      travarZonas(travado);

      if (vez.pendente) {
        // Modo `local`, entre chute e defesa. Nenhuma pista da zona escolhida — ver o cabeçalho.
        faixa.dataset['tom'] = 'atencao';
        faixa.textContent = `Passe o aparelho: ${nomeSelecao(partida.times[vez.lado])} defende.`;
        return;
      }

      const resultado = resultadoUltimaCobranca(estado);
      faixa.dataset['tom'] = 'neutro';
      faixa.textContent =
        apresentados > 0 && resultado !== null
          ? `${resultado} ${instrucao(vez.papel)}.`
          : instrucao(vez.papel) + '.';
    }

    function mostrarErroDeToque(): void {
      limpar(erro);
      erro.hidden = false;
      erro.append(
        el('p', { texto: 'Não foi possível registrar o toque.' }),
        el('p', { classe: 'sub', texto: 'Toque em uma das três áreas de novo.' }),
      );
    }

    // ── Cobrança ──────────────────────────────────────────────────────────────────────────

    /**
     * Anima e sonoriza a cobrança que acabou de ser resolvida.
     *
     * Roda DEPOIS de `choose()` ter voltado, e por isso não interfere na propagação de erro que
     * M5 promete para assinante que explode.
     */
    async function apresentar(): Promise<void> {
      const kick = estado.kicks[estado.kicks.length - 1];
      if (kick === undefined) return;

      ctx.som.tocar('chute');
      if (cena !== null) await cena.animar(kick.shot, kick.dive, kick.goal);
      if (!vivo) return;

      ctx.som.tocar(kick.goal ? 'gol' : 'defesa');
      apresentados = estado.kicks.length;
      cena?.repousar();
    }

    function escolher(zona: Zone): void {
      if (travado || !vivo) return;
      travado = true;
      travarZonas(true);
      erro.hidden = true;

      const antes = estado.kicks.length;
      try {
        sessao.choose(zona);
      } catch {
        // ── Estado de ERRO no toque ───────────────────────────────────────────────────────
        travado = false;
        mostrarErroDeToque();
        desenhar();
        return;
      }

      const houveCobranca = estado.kicks.length > antes;
      const seguir = (): void => {
        if (!vivo) return;
        travado = false;

        if (estado.phase === 'finished') {
          ctx.ir({ nome: 'fim', partida, estado });
          return;
        }
        desenhar();
      };

      if (!houveCobranca) {
        // Modo `local`, chute guardado dentro de M5: nada a animar, só a troca de mãos.
        seguir();
        return;
      }

      void apresentar().then(seguir, seguir);
    }

    // ── Sair: ação irreversível, logo confirmação explícita ───────────────────────────────

    function pedirParaSair(): void {
      const anterior = document.activeElement;

      const caixa = el('div', { classe: 'dialogo__caixa' });
      const dialogo = el(
        'div',
        { classe: 'dialogo', attrs: { role: 'dialog', 'aria-modal': 'true' } },
        [caixa],
      );

      const fechar = (): void => {
        dialogoAberto = false;
        dialogo.remove();
        document.removeEventListener('keydown', naTecla);
        if (anterior instanceof HTMLElement) focar(anterior);
      };

      const naTecla = (ev: KeyboardEvent): void => {
        if (ev.key === 'Escape') fechar();
      };

      const cancelar = botao('Continuar jogando', 'botao botao--principal', fechar);
      caixa.append(
        el('h2', { texto: 'Sair da disputa?' }),
        el('p', {
          texto: 'Isso encerra a disputa em andamento. O placar não é guardado e não dá para voltar.',
        }),
        cancelar,
        botao('Sair mesmo assim', 'botao botao--perigo', () => {
          fechar();
          ctx.ir({ nome: 'inicio' });
        }),
      );

      dialogoAberto = true;
      document.addEventListener('keydown', naTecla);
      raiz.append(dialogo);
      focar(cancelar);
    }

    // ── Ligações ──────────────────────────────────────────────────────────────────────────

    const cancelarAssinatura = sessao.subscribe((s: MatchState) => {
      estado = s;
      derivacao.aoNotificar(s);
    });

    const naTeclaGlobal = (ev: KeyboardEvent): void => {
      if (dialogoAberto) return;
      const alvo = ev.target;
      // Não sequestra a tecla de quem está num controle: `ArrowLeft` num rádio muda a escolha.
      if (alvo instanceof HTMLInputElement) return;
      const zona = TECLAS[ev.key];
      if (zona === undefined) return;
      ev.preventDefault();
      focar(botoesZona.get(zona) ?? null);
      escolher(zona);
    };
    document.addEventListener('keydown', naTeclaGlobal);

    // ── Estado CARREGANDO: a cena chega depois, e a disputa não espera por ela ────────────
    void import('./cena')
      .then(async ({ montarCena }) => {
        if (!vivo) return;
        cena = await montarCena(canvasPai);
        if (!vivo) {
          cena.destruir();
          cena = null;
          return;
        }
        semCanvas.hidden = true;
      })
      .catch(() => {
        if (!vivo) return;
        // Cenário é enfeite; disputa é o jogo. Nada técnico na tela, e nenhum modo local
        // degradando junto com um pacote que não chegou.
        semCanvas.textContent = 'Campo simplificado — o jogo continua igual.';
      });

    desenhar();
    focar(botoesZona.get('C') ?? null);

    return () => {
      vivo = false;
      document.removeEventListener('keydown', naTeclaGlobal);
      cancelarAssinatura();
      sessao.dispose();
      cena?.destruir();
      cena = null;
    };
  };
