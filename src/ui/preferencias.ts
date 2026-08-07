/**
 * M7 — as preferências do aparelho.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * **É o único estado que M7 persiste, e o contrato lista exatamente três:** nível da CPU, som e
 * última seleção. Nada de disputa, nada de histórico de zonas, nada que identifique a pessoa —
 * a restrição de privacidade do CONTEXT ("nenhum dado pessoal coletado") só é verificável se a
 * lista do que pode ser gravado for curta e estiver aqui.
 *
 * ## Por que nada aqui lança
 * `localStorage` falha de três jeitos em navegador real: ausente (`file://` em alguns
 * navegadores), bloqueado (Safari em navegação privada lança em `setItem`) e corrompido (JSON
 * pela metade, valor editado à mão, versão antiga do formato). Nenhum dos três é problema da
 * pessoa que só quer jogar, então nenhum vira mensagem de erro: cai no padrão e segue.
 *
 * O que **não** cai no padrão é o catálogo. Seleção salva que sumiu de M4 — e ela vai sumir em
 * `A-04`, quando a lista de fixação virar a lista real — é descartada por não existir, e não
 * remendada. Código que M4 não conhece faria `createSession` recusar a configuração inteira.
 */

import type { CountryCode, Side } from '../core/index';
import type { Level } from '../session/index';
import { findTeam, listTeams } from '../data/teams';

/** Chave única e versionada: formato novo não briga com o gravado pelo formato velho. */
const CHAVE = 'tapgo.v2.preferencias';

const NIVEIS: readonly Level[] = ['easy', 'medium', 'hard'];

export interface Preferencias {
  readonly nivel: Level;
  readonly som: boolean;
  /** `null` quando ainda não houve partida, ou quando o que estava salvo saiu do catálogo. */
  readonly selecao: Readonly<Record<Side, CountryCode>> | null;
}

/**
 * `medium` e som ligado: é o que alguém que abre o jogo pela primeira vez espera encontrar.
 * `selecao: null` é lacuna honesta — a tela de seleções decide o que mostrar sem preferência,
 * e não há "seleção padrão" a inventar.
 */
export const PADRAO: Preferencias = Object.freeze({
  nivel: 'medium' as Level,
  som: true,
  selecao: null,
});

function isNivel(valor: unknown): valor is Level {
  return (NIVEIS as readonly unknown[]).includes(valor);
}

/** Código só sobrevive se M4 o conhece HOJE. Ver o cabeçalho sobre `A-04`. */
function codigoValido(valor: unknown): valor is CountryCode {
  return typeof valor === 'string' && findTeam(valor) !== undefined;
}

function lerSelecao(bruto: unknown): Readonly<Record<Side, CountryCode>> | null {
  if (bruto === null || typeof bruto !== 'object') return null;
  const obj = bruto as Record<string, unknown>;
  // Os DOIS lados ou nenhum: meia seleção salva faria a tela abrir com um lado preenchido e o
  // outro vazio, que é pior do que abrir limpa.
  if (!codigoValido(obj['A']) || !codigoValido(obj['B'])) return null;
  return Object.freeze({ A: obj['A'], B: obj['B'] });
}

/** Nunca lança e nunca devolve campo indefinido. */
export function lerPreferencias(): Preferencias {
  let cru: string | null = null;
  try {
    cru = window.localStorage.getItem(CHAVE);
  } catch {
    return PADRAO; // armazenamento bloqueado — jogar não depende de gravar.
  }
  if (cru === null) return PADRAO;

  let dados: unknown;
  try {
    dados = JSON.parse(cru);
  } catch {
    return PADRAO; // JSON pela metade: descarta, não tenta consertar.
  }
  if (dados === null || typeof dados !== 'object') return PADRAO;

  const obj = dados as Record<string, unknown>;
  return Object.freeze({
    nivel: isNivel(obj['nivel']) ? obj['nivel'] : PADRAO.nivel,
    som: typeof obj['som'] === 'boolean' ? obj['som'] : PADRAO.som,
    selecao: lerSelecao(obj['selecao']),
  });
}

/**
 * Grava o que couber. Falha de gravação é silenciosa **de propósito**: a pessoa está no meio de
 * um jogo de um minuto, e "não foi possível salvar sua preferência" não é informação que ela
 * possa usar. A preferência volta ao padrão na próxima abertura, e é só.
 */
export function gravarPreferencias(p: Preferencias): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* cota estourada ou armazenamento bloqueado — ver o parágrafo acima. */
  }
}

/**
 * A seleção com que a tela de seleções abre.
 *
 * Preferência primeiro; sem ela, as duas primeiras do catálogo. Com catálogo de uma seleção só,
 * os dois lados apontam para a mesma — M5 aceita isso de propósito (não há regra de disputa
 * proibindo), e a tela avisa. Catálogo vazio devolve `null`, que é o estado VAZIO da tela.
 */
export function selecaoInicial(p: Preferencias): Record<Side, CountryCode> | null {
  if (p.selecao !== null) return { A: p.selecao.A, B: p.selecao.B };

  const catalogo = listTeams();
  const primeira = catalogo[0];
  if (primeira === undefined) return null;

  const segunda = catalogo[1] ?? primeira;
  return { A: primeira.code, B: segunda.code };
}
