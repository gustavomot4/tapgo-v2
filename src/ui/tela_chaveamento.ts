/**
 * M7 — o chaveamento inteiro: as 64 disputas da competição, como elas estão agora (`T-40`).
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)" e
 * "M8 — Torneio", §"Portão de `chaveamento(state)` (`D-111`)". Pedido do dono `P-3`.
 *
 * ## De onde vem o dado, e por que assim (`D-111`, saída **(c)** de `P-3`)
 * De `chaveamento(state)`, função de leitura na porta de M8 sobre o **retrato** que M7 já grava.
 * Não há aqui uma linha que derive par, classifique grupo ou decida vencedor: as 64 são
 * **derivadas por M8**, e a saída rejeitada de `P-3` era exatamente esta tela reconstruindo o
 * chaveamento por fora. O retrato segue **opaco** (`D-68`) — esta tela chama `toJSON()` e passa
 * o objeto adiante sem abrir nenhum campo dele, e o portão de camada varre `src/ui/` para provar
 * que ninguém reintroduziu a leitura pela porta dos fundos.
 *
 * ## O que a tela mostra, e o que ela NÃO mostra
 * Mostra o que M8 já decidiu: **48** disputas enquanto a fase de grupos não fecha, **56** depois
 * dela, **64** com o campeão. Um confronto de fase que ainda depende de resultado **não aparece
 * com "a definir"** — ele não aparece, e o resumo no topo diz quantas das 64 estão definidas.
 * Inventar par é o mesmo defeito que inventar placar, só que com nome de seleção.
 *
 * ## O placar ausente é `—`, nunca `0` (`D-67`/`D-112`)
 * Duas disputas mostram o traço, e elas não são a mesma coisa: **a sua**, que já aconteceu e cujo
 * placar nunca voltou (`report(winner)` carrega o vencedor e nada mais — porta congelada,
 * `D-13`/`D-58`), e a que **ninguém jogou ainda**. O traço é o mesmo; o que o leitor de tela ouve
 * é diferente, e a nota embaixo fala só da primeira. Ver `estadoDaDisputa` em `chave.ts`.
 *
 * ## Os 4 estados
 * - **carregando** — não há: o torneio está na memória, e `chaveamento` é chamada síncrona.
 * - **vazio** — não há torneio em andamento (entrada direta na rota). A tela oferece começar um.
 * - **erro** — o retrato não fecha consigo mesmo e `chaveamento` recusa lê-lo, ou a lista volta
 *   sem nenhuma disputa. M8 não produz isso; se produzir, a pessoa recebe uma frase em português
 *   e a saída de voltar, nunca uma tela travada com exceção na cara.
 * - **sucesso** — as seções por fase, da 1ª rodada de grupos à final.
 *
 * ## O fluxo crítico desta tela fecha em 1 toque
 * Ela é **leitura**: o único caminho principal é voltar para a disputa ("Voltar ao torneio"), e
 * ele já vem com foco. Nada aqui altera o torneio — nenhuma ação irreversível, nenhuma escrita.
 */

import type { CountryCode, Side } from '../core/index';
import type { Disputa } from '../tournament/index';
import { chaveamento } from '../tournament/index';
import { botao, el, focar } from './dom';
import { estadoDaDisputa, secoes } from './chave';
import type { EstadoDaDisputa } from './chave';
import {
  DISPUTAS_DO_TORNEIO,
  NOME_TORNEIO,
  NOTA_CHAVE_PARCIAL,
  NOTA_CHAVE_SEM_PLACAR,
  ROTULO_A_JOGAR,
  ROTULO_SEM_GOLS,
  ROTULO_VENCEU,
  golsDaDisputa,
  nomeFase,
  nomeGrupo,
  nomeSelecao,
  resumoDoChaveamento,
} from './rotulos';
import { marca } from './tela_selecoes';
import type { Contexto, Tela } from './rotas';

const LADOS: readonly Side[] = ['A', 'B'];

/** O que o leitor de tela ouve no lugar do traço, por estado da disputa. `null` = há número. */
function rotuloDoTraco(estado: EstadoDaDisputa): string | null {
  if (estado === 'a-jogar') return ROTULO_A_JOGAR;
  if (estado === 'sem-placar') return ROTULO_SEM_GOLS;
  return null;
}

/**
 * Um lado da disputa: marca, nome, e o número de gols (ou o traço).
 *
 * O vencedor **não é marcado só por cor** — leva o "✓" e a palavra "venceu" para quem usa leitor
 * de tela. É a mesma regra da etiqueta "você" na tabela do grupo: destaque que só existe em cor
 * não existe para parte das pessoas.
 */
function ladoDaDisputa(
  d: Disputa,
  lado: Side,
  humana: CountryCode,
  estado: EstadoDaDisputa,
): HTMLElement {
  const code = d.teams[lado];
  const venceu = d.winner === lado;
  const rotulo = rotuloDoTraco(estado);

  const filhos: HTMLElement[] = [
    marca(code),
    el('span', { classe: 'chave__nome', texto: nomeSelecao(code) }),
  ];

  if (code === humana) filhos.push(el('span', { classe: 'tabela__voce', texto: 'você' }));

  if (venceu) {
    filhos.push(
      el('span', { classe: 'chave__marcador', attrs: { 'aria-hidden': 'true' }, texto: '✓' }),
      el('span', { classe: 'so-leitor', texto: ROTULO_VENCEU }),
    );
  }

  filhos.push(
    el('span', {
      classe: 'chave__gols',
      texto: golsDaDisputa(d.goals, lado),
      // O traço não é lido: quem usa leitor de tela ouviria "menos". A frase entra por
      // `aria-label`, e só quando o número não existe.
      ...(rotulo === null ? {} : { attrs: { 'aria-label': rotulo } }),
    }),
  );

  return el(
    'div',
    { classe: 'chave__lado', ...(venceu ? { dados: { vencedor: 'sim' } } : {}) },
    filhos,
  );
}

/** Uma disputa: o grupo (só na fase de grupos) e os dois lados, um sobre o outro. */
function itemDaDisputa(d: Disputa, humana: CountryCode): HTMLElement {
  const estado = estadoDaDisputa(d);

  // O grupo só existe na fase de grupos; no mata-mata `group` é `-1`, e a linha some em vez de
  // virar "Grupo -1" (é o `undefined` renderizado da regra 4 da skill, com outro rosto).
  const cabeca = d.group < 0 ? [] : [el('p', { classe: 'chave__grupo', texto: nomeGrupo(d.group) })];

  return el('li', { classe: 'chave__disputa', dados: { estado } }, [
    ...cabeca,
    ...LADOS.map((lado) => ladoDaDisputa(d, lado, humana, estado)),
  ]);
}

export const telaChaveamento: Tela = (raiz: HTMLElement, ctx: Contexto) => {
  const emCurso = ctx.torneio();

  if (emCurso === null) {
    // ── Estado VAZIO ──────────────────────────────────────────────────────────────────────
    raiz.append(
      el('section', { classe: 'tela' }, [
        el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
        el('div', { classe: 'aviso' }, [
          el('p', { texto: 'Não há torneio em andamento.' }),
          el('p', { classe: 'sub', texto: 'Comece um novo para ver o chaveamento das 64.' }),
        ]),
        el('div', { classe: 'grupo empurra' }, [
          botao('Começar um torneio', 'botao botao--principal', () =>
            ctx.ir({ nome: 'torneio_novo' }),
          ),
          botao('Voltar ao início', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })),
        ]),
      ]),
    );
    return () => undefined;
  }

  /*
   * `chaveamento` recusa retrato que não fecha consigo mesmo — mesma conferência de
   * `restoreTournament`. Não deveria acontecer (o registro salvo é conferido na leitura), e
   * mesmo assim a tela responde em português: o torneio continua jogável, e só esta LEITURA
   * falhou.
   */
  let disputas: readonly Disputa[] | null = null;
  try {
    disputas = chaveamento(emCurso.torneio.toJSON());
  } catch {
    disputas = null;
  }

  if (disputas === null || disputas.length === 0) {
    // ── Estado de ERRO ────────────────────────────────────────────────────────────────────
    const voltar = botao('Voltar ao torneio', 'botao botao--principal', () =>
      ctx.ir({ nome: 'torneio' }),
    );
    raiz.append(
      el('section', { classe: 'tela' }, [
        el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', { texto: 'Não foi possível mostrar o chaveamento.' }),
          el('p', {
            classe: 'sub',
            texto: 'O seu torneio continua salvo — dá para jogar a próxima disputa.',
          }),
        ]),
        el('div', { classe: 'grupo empurra' }, [voltar]),
      ]),
    );
    focar(voltar);
    return () => undefined;
  }

  // ── Estado de SUCESSO ───────────────────────────────────────────────────────────────────
  // `tela--largo` (`D-86`): acima de 1024px as fases emparelham duas a duas — é conteúdo que
  // emparelha por natureza, e a lista inteira numa coluna só desperdiçaria metade do monitor.
  const tela = el('section', { classe: 'tela tela--largo' });
  raiz.append(tela);

  const voltar = botao('Voltar ao torneio', 'botao botao--principal', () =>
    ctx.ir({ nome: 'torneio' }),
  );

  tela.append(
    el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
    el('p', { classe: 'sub', texto: resumoDoChaveamento(disputas.length) }),
  );

  for (const secao of secoes(disputas)) {
    tela.append(
      el('div', { classe: 'grupo par' }, [
        el('p', { classe: 'legenda', texto: nomeFase(secao.stage, secao.round) }),
        el(
          'ul',
          { classe: 'chave' },
          secao.disputas.map((d) => itemDaDisputa(d, emCurso.humana)),
        ),
      ]),
    );
  }

  // As duas notas ficam DEPOIS da lista e antes da saída: elas explicam o que a pessoa acabou de
  // ler. A do placar ausente é a de `Q-13`/`D-67` na linguagem desta tela.
  tela.append(el('p', { classe: 'lacuna', texto: NOTA_CHAVE_SEM_PLACAR }));
  if (disputas.length < DISPUTAS_DO_TORNEIO) {
    tela.append(el('p', { classe: 'lacuna', texto: NOTA_CHAVE_PARCIAL }));
  }

  tela.append(el('div', { classe: 'grupo empurra' }, [voltar]));

  focar(voltar);
  return () => undefined;
};
