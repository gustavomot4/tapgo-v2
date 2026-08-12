/**
 * M7 — todo texto que a pessoa lê, e a formatação que o produz.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * Módulo **puro**, e concentrado de propósito: "formatação é responsabilidade da UI" só é
 * verificável se houver um lugar onde ela mora. Duas regras valem para cada função aqui:
 *
 * 1. **Nada de `undefined` ou `NaN` sai daqui.** Todo campo opcional tem saída declarada. É a
 *    regra que mais barato se quebra: `findTeam` devolve `undefined` para código fora do
 *    catálogo, e um `?.name` distraído vira "undefined × 0" no placar.
 * 2. **Nenhum termo da lista-morta de [[licenciamento]].** Identidade de seleção é nome de país
 *    (ISO-3166) + bandeira, e mais nada. Não há escudo, uniforme, nome de jogador nem nome de
 *    competição em lugar nenhum deste arquivo — e o `grep` do portão de M7 é sobre `src/`.
 */

import type { CountryCode, Side, Zone } from '../core/index';
import type { MatchState } from '../session/index';
import type { Level } from '../session/index';
import { findTeam } from '../data/teams';
import type { ModoJogavel, Papel } from './derivacao';

/** Cobranças por lado na fase regular. Espelha `REGULAR_KICKS` de M2, que não é exportado. */
const COBRANCAS_REGULARES = 5;

export const ZONAS: readonly Zone[] = ['L', 'C', 'R'];

/**
 * Nome da seleção, sempre com texto.
 *
 * Código fora do catálogo devolve o próprio código, e não `undefined`: o código é informação
 * verdadeira e curta, enquanto a alternativa é a palavra "undefined" no meio do placar.
 */
export function nomeSelecao(code: CountryCode): string {
  return findTeam(code)?.name ?? code;
}

/**
 * A marca visual da seleção enquanto `A-04` não entrega as bandeiras.
 *
 * Hoje `flag` é `null` para todo o catálogo (`D-22`), então a tela mostra o **código ISO** num
 * disco colorido. Não é bandeira e não finge ser: é o identificador que as representações
 * obrigatórias já exigem, e some no dia em que `flag` deixar de ser `null`.
 *
 * O matiz sai do próprio código, por soma de caracteres — arbitrário e estável, para que duas
 * seleções não abram com a mesma cor. Não representa cor nacional nenhuma.
 */
export function marcaSelecao(code: CountryCode): { texto: string; matiz: number; ehBandeira: boolean } {
  const time = findTeam(code);
  const bandeira = time?.flag ?? null;

  let soma = 0;
  for (let i = 0; i < code.length; i += 1) soma += code.charCodeAt(i) * (i + 3);

  return {
    texto: bandeira ?? code,
    matiz: (soma * 37) % 360,
    ehBandeira: bandeira !== null,
  };
}

/** Placar em inteiro, sempre. Se um dia aparecer casa decimal aqui, o defeito é de M2. */
export function placar(estado: MatchState): string {
  return `${estado.goals.A} × ${estado.goals.B}`;
}

/** Onde a disputa está, em português de quem joga — não em nome de fase do motor. */
export function descricaoFase(estado: MatchState): string {
  if (estado.phase === 'finished') return 'Disputa encerrada';

  const lado = estado.turn;
  if (lado === null) return 'Disputa encerrada';

  if (estado.phase === 'suddenDeath') {
    // Na morte súbita não há "de N": a disputa acaba quando uma rodada desempata.
    const rodada = Math.max(estado.taken.A, estado.taken.B) - COBRANCAS_REGULARES + 1;
    return `Cobranças alternadas · ${rodada}ª`;
  }

  return `Cobrança ${estado.taken[lado] + 1} de ${COBRANCAS_REGULARES}`;
}

/** O que fazer agora, dito para a pessoa que está com o aparelho na mão. */
export function instrucao(papel: Papel): string {
  return papel === 'chutar' ? 'Escolha onde chutar' : 'Escolha onde defender';
}

export function nomeZona(zona: Zone): string {
  if (zona === 'L') return 'esquerda';
  if (zona === 'C') return 'meio';
  return 'direita';
}

/** Rótulo acessível do botão de zona: o leitor de tela ouve o papel, não só o lado. */
export function rotuloZona(zona: Zone, papel: Papel): string {
  const acao = papel === 'chutar' ? 'Chutar' : 'Defender';
  return `${acao} na ${nomeZona(zona)}`;
}

export function nomeNivel(nivel: Level): string {
  if (nivel === 'easy') return 'Fácil';
  if (nivel === 'medium') return 'Médio';
  return 'Difícil';
}

export function nomeLado(lado: Side): string {
  return lado === 'A' ? '1º' : '2º';
}

/**
 * O resultado do sorteio de quem cobra primeiro (`D-48`), enquanto ele ainda é notícia.
 *
 * A resposta sai de `estado.turn`, e **só** de lá: quem sorteia é M5, na criação da sessão, e
 * esta camada lê. Nenhum lado literal mora nesta função — era exatamente isso que `QA-15` cobrava
 * de M7, que até aqui repetia a constante do motor e passava a mentir no dia do sorteio.
 *
 * Devolve `null` a partir da 1ª cobrança resolvida: passado esse ponto o placar conta a história
 * sozinho, e em 360x640 a altura vale mais que o aviso.
 */
export function sorteioDoPrimeiro(
  estado: MatchState,
  times: Readonly<Record<Side, CountryCode>>,
): { readonly lado: Side; readonly texto: string } | null {
  if (estado.kicks.length > 0 || estado.phase === 'finished' || estado.turn === null) return null;
  return { lado: estado.turn, texto: `${nomeSelecao(times[estado.turn])} cobra primeiro` };
}

/**
 * O que o sorteio significa para quem está com o aparelho na mão.
 *
 * Em `cpu` o lado do humano é fixo e a frase pode dizer "você". Em `local` os dois lados são deste
 * mesmo aparelho: dizer "você" obrigaria a escolher um dos dois jogadores, então a frase fala do
 * aparelho, que é o objeto que muda de mão.
 */
export function instrucaoDoSorteio(modo: ModoJogavel, papel: Papel): string {
  if (modo !== 'cpu') return 'Quem cobra fica com o aparelho.';
  return papel === 'chutar' ? 'Você começa cobrando.' : 'Você começa defendendo.';
}

/** O resultado da última cobrança, para o aviso que aparece entre uma e outra. */
export function resultadoUltimaCobranca(estado: MatchState): string | null {
  const ultima = estado.kicks[estado.kicks.length - 1];
  if (ultima === undefined) return null;
  return ultima.goal ? 'Gol!' : 'Defendeu!';
}

/**
 * O desfecho, já com o nome das seleções.
 *
 * `winner` é `null` enquanto a disputa corre — e também seria `null` num empate que o motor não
 * produz. Os dois casos têm frase, porque tela sem frase é área branca.
 */
export function desfecho(estado: MatchState, times: Readonly<Record<Side, CountryCode>>): string {
  if (estado.winner === null) {
    return estado.phase === 'finished' ? 'A disputa terminou empatada.' : 'Disputa em andamento.';
  }
  return `${nomeSelecao(times[estado.winner])} venceu por ${placar(estado)}.`;
}
