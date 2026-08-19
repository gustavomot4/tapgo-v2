/**
 * M8 · classificação e desempate da fase de grupos.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M8 — Torneio".
 * Regra:    `a_context/regras_partida.md` → "Torneio (`D-53`)".
 *
 * **Não é a porta do módulo.** A porta é `src/tournament/index.ts`; este arquivo é exportado
 * para que o portão "um teste por critério de desempate, **na ordem**" seja cobrado pela via
 * mais baixa possível — a própria função que ordena —, e não por inspeção de um torneio
 * inteiro, onde um critério errado se esconde atrás de outro. É o mesmo motivo que fez
 * `zoneDistributionPpm` sair de M3 (`D-61`).
 *
 * Importa só tipos de M1. Sem I/O, sem relógio, sem gerador nativo.
 */

import type { CountryCode, Rng } from '../core/index';

/** Linha da tabela de um grupo — a forma que a porta de M8 promete (`D-13`). */
export interface Standing {
  code: CountryCode;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Placar **ausente**, e ausente não é zero (nem `0 x 0`).
 *
 * A disputa do jogador volta por `report(winner)`, que — porta congelada por `D-13`/`D-58` —
 * carrega o vencedor e nada mais. Gravar `0 x 0` ali inventaria dado e mentiria no saldo do
 * grupo; gravar `1 x 0` inventaria mais ainda. Então o placar fica declarado como ausente e
 * **não entra** em `goalsFor`/`goalsAgainst`. O custo disso está registrado em `Q-13`: num
 * grupo com o jogador, o saldo compara quem tem 3 placares conhecidos com quem tem 2.
 */
export const GOLS_DESCONHECIDOS = -1;

/** Uma disputa já resolvida, como a tabela precisa dela. */
export interface Jogo {
  readonly a: CountryCode;
  readonly b: CountryCode;
  readonly vencedor: CountryCode;
  /** `GOLS_DESCONHECIDOS` quando o placar não veio — ver a constante. */
  readonly golsA: number;
  readonly golsB: number;
}

/** Leitura por índice. `noUncheckedIndexedAccess` exige o guarda, e o guarda é real. */
function em<T>(lista: readonly T[], i: number): T {
  const valor = lista[i];
  if (valor === undefined) {
    throw new RangeError(`tabela: índice ${String(i)} fora da faixa (${String(lista.length)})`);
  }
  return valor;
}

function assertJogo(j: Jogo): void {
  if (j.vencedor !== j.a && j.vencedor !== j.b) {
    throw new RangeError(`tabela: vencedor ${String(j.vencedor)} não é nenhum dos dois lados`);
  }
  for (const g of [j.golsA, j.golsB]) {
    if (!Number.isInteger(g) || g < GOLS_DESCONHECIDOS) {
      throw new RangeError(`tabela: gols devem ser inteiros >= ${String(GOLS_DESCONHECIDOS)}`);
    }
  }
  // Placar meio conhecido não existe: ou os dois lados vieram, ou nenhum veio. Um lado só
  // produziria saldo torto sem nenhum aviso.
  if ((j.golsA === GOLS_DESCONHECIDOS) !== (j.golsB === GOLS_DESCONHECIDOS)) {
    throw new RangeError('tabela: placar pela metade — os dois lados vêm juntos ou nenhum vem');
  }
}

/**
 * Tabela crua do grupo, **na ordem em que os códigos entraram** — sem classificar.
 *
 * Classifica-se por vitórias (`D-53`): a disputa nunca empata (`D-09`), então não há ponto de
 * empate a distribuir e a coluna de pontos não existe.
 */
export function tabela(codes: readonly CountryCode[], jogos: readonly Jogo[]): Standing[] {
  const linhas = new Map<CountryCode, Standing>();
  for (const code of codes) {
    if (linhas.has(code)) throw new RangeError(`tabela: código repetido no grupo (${code})`);
    linhas.set(code, { code, wins: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const j of jogos) {
    assertJogo(j);
    const la = linhas.get(j.a);
    const lb = linhas.get(j.b);
    if (la === undefined || lb === undefined) continue; // jogo de outro grupo

    if (j.vencedor === j.a) la.wins += 1;
    else lb.wins += 1;

    if (j.golsA !== GOLS_DESCONHECIDOS) {
      la.goalsFor += j.golsA;
      la.goalsAgainst += j.golsB;
      lb.goalsFor += j.golsB;
      lb.goalsAgainst += j.golsA;
    }
  }

  return codes.map((code) => {
    const linha = linhas.get(code);
    if (linha === undefined) throw new RangeError(`tabela: linha sumiu (${code})`);
    return linha;
  });
}

/** Embaralha em Fisher-Yates, consumindo exatamente `lista.length - 1` sorteios. */
function embaralhar(lista: readonly CountryCode[], rng: Rng): CountryCode[] {
  const saida = [...lista];
  for (let i = saida.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    const a = em(saida, i);
    saida[i] = em(saida, j);
    saida[j] = a;
  }
  return saida;
}

/** Chave de um critério: maior é melhor. Recebe o empate em que está sendo aplicado. */
type Criterio = (code: CountryCode, empatados: readonly CountryCode[]) => number;

/**
 * Ordena o grupo aplicando os critérios **em cascata**: cada um só é consultado dentro do
 * empate que o anterior deixou.
 *
 * A ordem é a de `D-53`: vitórias → confronto direto → saldo → gols → sorteio. O sorteio é o
 * último e **só é alcançado** quando os três anteriores empatam — é literal: `partir` só chega
 * ao ramo do `rng` depois de esgotar a lista de critérios, e nenhum sorteio é consumido antes.
 */
export function ordenarGrupo(
  codes: readonly CountryCode[],
  jogos: readonly Jogo[],
  rng: Rng | null,
): CountryCode[] {
  const linhas = new Map<CountryCode, Standing>();
  for (const linha of tabela(codes, jogos)) linhas.set(linha.code, linha);

  const linha = (code: CountryCode): Standing => {
    const l = linhas.get(code);
    if (l === undefined) throw new RangeError(`ordenarGrupo: ${code} não está no grupo`);
    return l;
  };

  const vitorias: Criterio = (code) => linha(code).wins;

  /** Confronto direto: vitórias contadas **só** entre os empatados. */
  const confrontoDireto: Criterio = (code, empatados) => {
    const dentro = new Set(empatados);
    let n = 0;
    for (const j of jogos) {
      if (!dentro.has(j.a) || !dentro.has(j.b)) continue;
      if (j.vencedor === code) n += 1;
    }
    return n;
  };

  const saldo: Criterio = (code) => linha(code).goalsFor - linha(code).goalsAgainst;
  const gols: Criterio = (code) => linha(code).goalsFor;

  const CRITERIOS: readonly Criterio[] = [vitorias, confrontoDireto, saldo, gols];

  function partir(empatados: readonly CountryCode[], restantes: readonly Criterio[]): CountryCode[] {
    if (empatados.length <= 1) return [...empatados];

    const criterio = restantes[0];
    if (criterio === undefined) {
      // Os três critérios de desempate empataram: aqui, e só aqui, entra o sorteio (`D-53`).
      // `rng === null` é a leitura PROVISÓRIA, de quem só quer ver a tabela antes de a fase
      // fechar: ela não pode consumir sorteio, senão mover o gerador viraria efeito colateral
      // de olhar a tela, e a linha do tempo do torneio mudaria com isso.
      return rng === null ? [...empatados] : embaralhar(empatados, rng);
    }

    const chave = new Map<CountryCode, number>();
    for (const code of empatados) chave.set(code, criterio(code, empatados));
    const valor = (code: CountryCode): number => chave.get(code) ?? 0;

    // `sort` é estável desde ES2019: chaves iguais preservam a ordem de entrada, que é o que
    // mantém o resultado reprodutível enquanto nenhum sorteio foi consumido.
    const ordenado = [...empatados].sort((x, y) => valor(y) - valor(x));

    const saida: CountryCode[] = [];
    let i = 0;
    while (i < ordenado.length) {
      let j = i + 1;
      while (j < ordenado.length && valor(em(ordenado, j)) === valor(em(ordenado, i))) j += 1;
      saida.push(...partir(ordenado.slice(i, j), restantes.slice(1)));
      i = j;
    }
    return saida;
  }

  return partir(codes, CRITERIOS);
}

/** A tabela do grupo já classificada, na ordem que `ordem` fixa. */
export function tabelaOrdenada(
  ordem: readonly CountryCode[],
  jogos: readonly Jogo[],
): Standing[] {
  return tabela(ordem, jogos);
}
