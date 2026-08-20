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
import type { Stage, Standing } from '../tournament/index';
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
 * O código existe no catálogo de M4? (`D-77`)
 *
 * Existe para que `convite.ts` continue **puro** — ele recebe este predicado por parâmetro em vez
 * de importar o catálogo. Uma linha, e ela mora aqui porque este é o módulo que já traduz código
 * de seleção para o que a pessoa lê.
 */
export function ehDoCatalogo(code: string): boolean {
  return findTeam(code) !== undefined;
}

/**
 * A marca visual da seleção: a bandeira quando existe arquivo, o código ISO quando não.
 *
 * Desde `T-19` as 32 têm arquivo (`D-62`), então na prática o resultado é sempre bandeira. O ramo
 * do código continua escrito porque `flag` segue `string | null` no tipo (`D-22`) e a porta ainda
 * promete o caso "sem arquivo" — não porque hoje alguma seleção caia nele.
 *
 * **`texto` carrega dois formatos, e `ehBandeira` é o campo que diz qual:** caminho local do SVG
 * quando `true`, código ISO quando `false`. Ler `texto` sem ler `ehBandeira` era `QA-19` — a tela
 * escrevia o caminho do arquivo como TEXTO dentro do disco de 34px, nos 32 cartões de cada lado.
 * Quem consome isto decide pelo `ehBandeira`, nunca farejando o valor.
 *
 * O matiz sai do próprio código, por soma de caracteres — arbitrário e estável, para que duas
 * seleções não abram com a mesma cor. Não representa cor nacional nenhuma, e o ramo da bandeira
 * não o usa: cor inventada por cima de bandeira real é o que a restrição de identidade proíbe.
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
 * Em `cpu` e em `online` o lado do humano é fixo e a frase pode dizer "você". Em `local` os dois
 * lados são deste mesmo aparelho: dizer "você" obrigaria a escolher um dos dois jogadores, então
 * a frase fala do aparelho, que é o objeto que muda de mão.
 *
 * O teste do ramo é `modo === 'local'`, e não `modo !== 'cpu'` como era até `T-21`: com o online
 * entrando em `ModoJogavel`, a forma antiga mandaria passar o aparelho para um adversário que
 * está em outro aparelho — a mesma armadilha da derivação, escrita com outras palavras.
 */
export function instrucaoDoSorteio(modo: ModoJogavel, papel: Papel): string {
  if (modo === 'local') return 'Quem cobra fica com o aparelho.';
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

/* ─────────────────────────── O torneio (`T-14`) ─────────────────────────── */

/**
 * O nome da competição (`D-55`).
 *
 * Escrito UMA vez, aqui: é o termo que o portão de licença de M7 varre, e um nome repetido em
 * três telas é um nome que só some de duas no dia em que ele mudar. Não é nome de competição
 * real, e nenhum termo da lista-morta de [[licenciamento]] entra nele.
 */
export const NOME_TORNEIO = 'TAP GO Cup';

/** A fase, em português de quem joga — `stage` é o que a nomeia (`D-58`), nunca o `round`. */
export function nomeFase(stage: Stage, round: number): string {
  if (stage === 'groups') return `Fase de grupos · ${String(round)}ª rodada`;
  if (stage === 'r16') return 'Oitavas de final';
  if (stage === 'quarter') return 'Quartas de final';
  if (stage === 'semi') return 'Semifinal';
  if (stage === 'third') return 'Disputa do 3º lugar';
  return 'Final';
}

/** O traço de dado ausente. **Não é zero**, e é essa a diferença que `D-67` protege. */
export const GOLS_AUSENTES = '—';

/**
 * A coluna de gols de uma linha da tabela — e a decisão de `Q-13` está aqui (`D-67`).
 *
 * `report(winner)` não traz o placar (porta congelada, `D-13`/`D-58`), então a disputa do jogador
 * entra na tabela **sem gols**. Escrever `0` no lugar está fora de questão: zero é um número, e
 * número que ninguém mediu é dado inventado — o que a regra 5 do kit proíbe. Mas as duas linhas
 * da tabela não são iguais, e é aí que a decisão morde:
 *
 * - **a linha do jogador** só tem as disputas DELE — as três do grupo. Nenhuma tem placar, hoje
 *   e sempre: `goalsFor`/`goalsAgainst` ali são um zero estrutural, nunca uma medição. Ela mostra
 *   `—`, e não `0 × 0`, que era a tela dizendo um número que não existe.
 * - **as outras três** têm duas disputas medidas e uma sem placar (a que jogaram contra o
 *   jogador). O que elas mostram é verdade, só que **parcial** — e é a nota abaixo da tabela que
 *   diz isso, em vez de a tela fingir que a soma está fechada.
 *
 * @param doJogador é a linha da seleção da pessoa? Vem de quem monta a tabela, que já sabe.
 */
export function golsDaLinha(linha: Standing, doJogador: boolean): string {
  if (doJogador) return GOLS_AUSENTES;
  return `${String(linha.goalsFor)} × ${String(linha.goalsAgainst)}`;
}

/** A nota que torna a coluna de gols honesta. Ver `golsDaLinha` e `Q-13`. */
export const NOTA_SEM_GOLS =
  'A sua seleção não tem coluna de gols: o placar das disputas que você joga não volta para a ' +
  'tabela. Nas outras três, a coluna deixa de fora a disputa contra você.';

/** O que o leitor de tela ouve no lugar do traço — "menos" não diria nada a ninguém. */
export const ROTULO_SEM_GOLS = 'sem gols registrados';

/**
 * O que aconteceu com a seleção do jogador, dito sem inventar a fase da eliminação.
 *
 * A porta de M8 entrega o campeão e a tabela do grupo; **em que fase o jogador caiu ela não
 * entrega**, e derivar isso aqui seria a tela recontando o chaveamento por fora. Lacuna
 * declarada: a frase diz o que é verdade — campeão ou não — e nada além.
 */
export function desfechoDoJogador(campeao: CountryCode, humano: CountryCode): string {
  return campeao === humano
    ? `${nomeSelecao(humano)} é campeã. O título é seu.`
    : `${nomeSelecao(humano)} não ficou com o título desta vez.`;
}
