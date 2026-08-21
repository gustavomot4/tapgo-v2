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
import type { Serie } from './rotas';

/** Cobranças por lado na fase regular. Espelha `REGULAR_KICKS` de M2, que não é exportado. */
const COBRANCAS_REGULARES = 5;

export const ZONAS: readonly Zone[] = ['L', 'C', 'R'];

/**
 * O que a tela escreve no lugar do nome enquanto o outro aparelho não anunciou (`D-90`/`T-31`).
 *
 * Escrito UMA vez, aqui, porque três telas o mostram — seleções, convite e cobrança — e um texto
 * repetido em três lugares é um texto que só muda em dois no dia em que ele mudar. Reticências
 * de verdade (`…`), e não três pontos: é o mesmo caractere que "Procurando o outro aparelho…"
 * usa na tela de convite.
 */
export const ESCOLHENDO = 'escolhendo…';

/**
 * Nome da seleção, sempre com texto.
 *
 * Código fora do catálogo devolve o próprio código, e não `undefined`: o código é informação
 * verdadeira e curta, enquanto a alternativa é a palavra "undefined" no meio do placar.
 *
 * `null` é o estado de ESPERA de `D-90`, e é diferente de "código estranho": ninguém escolheu
 * ainda do outro lado. Devolve `ESCOLHENDO` — a tela não inventa seleção, e também não deixa uma
 * área branca onde havia um nome.
 */
export function nomeSelecao(code: CountryCode | null): string {
  if (code === null) return ESCOLHENDO;
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
  times: Readonly<Record<Side, CountryCode | null>>,
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
export function desfecho(
  estado: MatchState,
  times: Readonly<Record<Side, CountryCode | null>>,
): string {
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

// ── `T-22`: o silêncio da espera vira número ────────────────────────────────────────────────
// Entre o peer sumir e M6 desistir dele há o prazo de `CONNECT_TIMEOUT_MS`, e até aqui a tela
// não dizia nada sobre ele: "Esperando o outro jogador…" servia igual para "ele está pensando"
// e para "ele caiu e o relógio está correndo". As duas frases abaixo separam os dois casos, e
// nenhuma delas fala de **conexão**: desde `D-80`/`D-81` o `'failed'` pode ser sintetizado por
// M5 com o transporte de pé, e um "reconectando…" mentiria exatamente nesse caso.

/**
 * Quantos segundos INTEIROS ainda faltam — nunca negativo, nunca `NaN`.
 *
 * `Math.ceil` e não `Math.floor`: no primeiro tique o prazo cheio ainda não foi gasto, e
 * mostrar "19 s" ao ligar um relógio de 20 s seria a tela roubando um segundo de quem espera.
 * Relógio parado (`agora` depois do prazo) e prazo não-finito caem no mesmo `0`, que é o pior
 * caso honesto: "acabou", jamais um número inventado.
 */
export function segundosRestantes(prazoMs: number, agoraMs: number): number {
  const falta = prazoMs - agoraMs;
  if (!Number.isFinite(falta) || falta <= 0) return 0;
  return Math.ceil(falta / 1000);
}

/** O que a faixa diz quando o peer parou de responder. Fala da PESSOA, não do transporte. */
export const AVISO_PEER_SUMIU = 'O outro jogador parou de responder.';

/**
 * O que a faixa diz enquanto o outro aparelho não anunciou a seleção dele (`D-90` / `T-31`).
 *
 * Fala da PESSOA, como `AVISO_PEER_SUMIU`, e diz o que está acontecendo em vez de só travar a
 * tela: a cobrança não abre nesse estado, e uma tela trancada sem frase é a tela parecendo
 * quebrada. Não promete prazo — quem conta os 20 s é M5, e se eles estourarem o que chega aqui
 * é a queda de `D-35`, com a frase dela.
 */
export const AVISO_SEM_SELECAO = 'O outro jogador ainda está escolhendo a seleção dele.';

/**
 * A linha do contador.
 *
 * Ela promete o que o código cumpre e nada além: o prazo é o mesmo `CONNECT_TIMEOUT_MS` que M6
 * arma no `onPeerLeave`, e o desfecho no fim dele é a disputa terminar sem resultado (`D-35`).
 * Em zero a frase para de contar em vez de piscar "0 s" — o veredito de M6 chega logo atrás, e
 * um número congelado na tela pareceria travamento justo no instante em que ele não é.
 */
export function textoDaEspera(segundos: number): string {
  return segundos <= 0
    ? 'Encerrando a disputa…'
    : `A disputa termina em ${segundos} s se ele não voltar.`;
}

// ── `T-24`: o prazo de cada cobrança no `online` (`Q-15`, saída (b) de `D-84`) ───────────────
// A regra do dono é "15 s por cobrança, e quem demorou perde". O que a torna implementável sem
// árbitro é o desfecho escolhido: no estouro **este** aparelho sorteia a própria zona e a manda
// como jogada normal. Nada de novo trafega, nada há a divergir — e por isso todo o prazo mora
// aqui, em M7, e não no fio. Os textos abaixo prometem exatamente isso: escolha sorteada, nunca
// "cobrança perdida", que seria placar decidido pela tela.

/**
 * Prazo de cada cobrança no modo `online`, em milissegundos (`D-84`).
 *
 * **Menor que `CONNECT_TIMEOUT_MS` de propósito**, e há teste sobre isso: o prazo da cobrança tem
 * de vencer ANTES do prazo que M6 dá ao peer sumido, senão a disputa acabaria por abandono
 * (`D-35`) justamente nos casos em que o sorteio a manteria viva.
 */
export const PRAZO_COBRANCA_MS = 15_000;

/** A partir de quantos segundos restantes a tela avisa em voz alta — UMA vez, não a cada tique. */
export const SEGUNDOS_DE_PRESSA = 5;

/**
 * A linha do relógio da cobrança.
 *
 * Diz o prazo **e** a consequência na mesma frase: um número solto na tela não informa que o
 * silêncio tem desfecho. Em zero para de contar em vez de congelar "0 s", como `textoDaEspera`.
 */
export function textoDoPrazo(segundos: number): string {
  return segundos <= 0
    ? 'Tempo esgotado — sorteando a escolha…'
    : `Escolha em ${segundos} s, ou ela será sorteada.`;
}

/** O aviso falado uma vez, para quem não está olhando o número (leitor de tela). */
export function avisoDePressa(segundos: number): string {
  // `Number.isFinite` antes do `trunc`: `Math.trunc(NaN)` é `NaN`, e `Math.max(0, NaN)` também —
  // a palavra "NaN" chegaria à faixa, que é justamente a região que o leitor de tela anuncia.
  const s = Number.isFinite(segundos) ? Math.max(0, Math.trunc(segundos)) : 0;
  return `Faltam ${s} segundos para escolher.`;
}

/**
 * O que a faixa diz depois de o relógio ter cobrado no lugar da pessoa.
 *
 * "Sorteada" e não "perdida": a cobrança acontece, com zona sorteada contra um goleiro que
 * escolheu — o placar continua saindo do motor, e nenhuma frase daqui o antecipa.
 */
export const AVISO_COBRANCA_SORTEADA =
  'O tempo acabou: sua escolha foi sorteada. Esperando o outro jogador…';

// ── `P-2`: a coluna de pontos da tabela do grupo ────────────────────────────────────────────
// Pontos aqui são **derivação de render**, não campo novo: M8 continua entregando `wins`, e
// nenhum byte dele muda. A conta é exata porque a disputa nunca empata (`D-09`) — não existe
// ponto de empate a distribuir, então `pontos = 3 x vitórias` sem resto e sem arredondamento.

/** Pontos por vitória. Não há linha de empate porque não há empate (`D-09`). */
export const PONTOS_POR_VITORIA = 3;

/**
 * Os pontos de uma linha da tabela.
 *
 * Inteiro, sempre: `wins` é inteiro e o fator é inteiro. Diferente da coluna de gols, esta não
 * tem caso de ausente — o vencedor de toda disputa volta por `report(winner)` (`D-13`/`D-58`),
 * inclusive nas do jogador, então vitória é dado medido em TODAS as quatro linhas.
 */
export function pontosDaLinha(linha: Standing): number {
  return linha.wins * PONTOS_POR_VITORIA;
}

/** O que o cabeçalho abreviado quer dizer, para quem passa o cursor e para o leitor de tela. */
export const TITULO_PONTOS = 'Pontos — 3 por vitória';

/**
 * A nota que impede a coluna de mentir sobre o desempate (o cuidado declarado em `P-2`).
 *
 * Uma coluna "Pts" carrega, de tabela de campeonato, a expectativa de que empate de pontos se
 * resolva por regra própria. Aqui não: pontos são vitórias vezes três, então empatar em pontos é
 * empatar em vitórias — exatamente o ponto em que `D-53` já entra com confronto direto, saldo,
 * gols e, esgotados os três, o sorteio do `Rng`. A nota diz isso em vez de deixar a coluna
 * sugerir uma segunda regra que não existe.
 */
export const NOTA_PONTOS =
  'Pts é 3 por vitória — a disputa nunca empata, então não há ponto de empate. Pontos iguais ' +
  'são vitórias iguais, e o desempate segue o de sempre: confronto direto, saldo, gols e, se ' +
  'tudo empatar, sorteio.';


// ── `T-32`: a série de revanches ────────────────────────────────────────────────────────────
// A série é DERIVAÇÃO de render, como os pontos acima: M2 e M5 não sabem que ela existe, e
// nenhum contrato deles muda. Quem a carrega é a `Partida`, que é de M7; o que estas funções
// fazem é somar a partida que acabou e escrever a frase.

/**
 * A partir de quantas partidas a série aparece na tela.
 *
 * Duas, e não uma: depois da primeira partida a "série" seria "1 × 0 em 1 partida", que é o
 * mesmo que o placar logo acima já diz, com uma linha a mais para ler. A frase só passa a
 * informar quando existe passado que a tela não mostra.
 */
export const MINIMO_DA_SERIE = 2;

/** Contagem sã: nunca `NaN`, nunca negativa, nunca fracionária (a lição de `avisoDePressa`). */
function contagem(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/**
 * A série depois desta disputa.
 *
 * `vencedor === null` devolve a série INTACTA: disputa sem vencedor não entra na conta, nem como
 * vitória nem como partida jogada — contá-la faria "em 3 partidas" incluir uma que não terminou.
 */
export function serieComVencedor(serie: Serie, vencedor: Side | null): Serie {
  const base: Serie = { A: contagem(serie.A), B: contagem(serie.B) };
  if (vencedor === null) return base;
  return { ...base, [vencedor]: base[vencedor] + 1 };
}

/** Quantas partidas a série já teve. Soma exata: sem empate (`D-09`), toda partida tem dono. */
export function partidasDaSerie(serie: Serie): number {
  return contagem(serie.A) + contagem(serie.B);
}

/**
 * A frase da série, ou `null` quando ainda não há série a contar.
 *
 * `null` é a saída declarada do caso "primeira partida" — quem chama não desenha a linha. Devolver
 * texto vazio deixaria um parágrafo de altura zero no meio da tela, que é o mesmo defeito que
 * "lista vazia sem mensagem": espaço sem informação.
 */
export function textoDaSerie(
  serie: Serie,
  times: Readonly<Record<Side, CountryCode | null>>,
): string | null {
  const total = partidasDaSerie(serie);
  if (total < MINIMO_DA_SERIE) return null;
  return (
    `Série: ${nomeSelecao(times.A)} ${String(contagem(serie.A))} × ` +
    `${String(contagem(serie.B))} ${nomeSelecao(times.B)} — em ${String(total)} partidas`
  );
}
