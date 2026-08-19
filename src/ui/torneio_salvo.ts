/**
 * M7 — o torneio salvo no aparelho.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * **As duas linhas do torneio são dois estados** (`D-57`): o chaveamento **vivo** é de M8 e mora
 * na memória; a **cópia salva** é o retrato que `toJSON()` produz, e é de M7. M8 não conhece
 * `localStorage` — quem grava, lê e joga fora é este arquivo, e mais nenhum.
 *
 * ## O que pode ser gravado, e por que a lista é curta
 * Duas chaves no aparelho inteiro: as preferências (`preferencias.ts`) e o registro do torneio.
 * `CHAVES_DE_M7` existe para que "lista fechada de chaves" seja **teste**, e não promessa — o
 * portão de `T-14` cobra exatamente isso. O que é gravado é só **código de país e inteiro**: nem
 * nível nem fase viajam como texto, e nada ali identifica a pessoa.
 *
 * ## Por que o registro tem uma camada em volta do retrato (`D-68`)
 * O retrato de M8 é **opaco para quem lê** — o plano é explícito, e M7 não interpreta campo
 * nenhum dele: grava o objeto e o devolve inteiro a `restoreTournament`. Só que a tela precisa
 * de dois dados que são **de M7**, e não de M8: qual seleção a pessoa escolheu como sua, e em
 * que nível ela começou o torneio. A primeira decide de quem é a tabela de grupo mostrada e de
 * que lado o jogador está na próxima disputa — e `current()` some quando ele é eliminado, então
 * derivá-la de lá não cobre o torneio inteiro. O segundo é o que mantém `D-60` de pé quando a
 * preferência do aparelho muda no meio da competição.
 * Por isso o registro é `{ v, humana, nivel, estado }`: M7 guarda o que M7 escolheu, e o retrato
 * de M8 atravessa sem ser lido.
 *
 * O preço é ter a mesma verdade em dois lugares, e ele é pago na leitura: um registro em que a
 * `humana` não fecha com o torneio restaurado é descartado como qualquer outro lixo. Ver
 * `conferir`.
 *
 * ## Registro que não desserializa é descartado EM SILÊNCIO
 * O dado vem do navegador do jogador: pode ter sido editado à mão, ter ficado de uma versão
 * anterior do formato, ou ter chegado pela metade. Nenhum desses casos é problema de quem só
 * quer jogar, então nenhum vira mensagem: a chave é apagada e o jogo abre no menu. Tela quebrada
 * com JSON na cara seria a pior das saídas possíveis, e é a que o portão proíbe por escrito.
 */

import type { CountryCode } from '../core/index';
import type { Level } from '../session/index';
import { restoreTournament } from '../tournament/index';
import type { Tournament, TournamentState } from '../tournament/index';
import { NIVEIS } from './preferencias';

/** Chave única e versionada — mesmo formato de `preferencias.ts`, pelo mesmo motivo. */
export const CHAVE_TORNEIO = 'tapgo.v2.torneio';

/**
 * **Tudo** o que M7 pode escrever no armazenamento do navegador.
 *
 * Lista fechada e exportada de propósito: é sobre ela que o teste do portão passa, varrendo o
 * que foi gravado de verdade. Chave nova aqui é decisão de privacidade, não detalhe de tela.
 */
export const CHAVES_DE_M7: readonly string[] = ['tapgo.v2.preferencias', CHAVE_TORNEIO];

/** Versão do registro de M7 — independente da versão do retrato, que é de M8. */
const REGISTRO_V = 1;

/** O torneio vivo com os dois dados que são de M7: a seleção da pessoa e o nível do torneio. */
export interface TorneioEmCurso {
  readonly torneio: Tournament;
  readonly humana: CountryCode;
  /**
   * O nível com que o torneio começou, e que vale até a final (`D-60`).
   *
   * Fica aqui porque **a preferência do aparelho muda e o torneio não**: quem trocar o nível na
   * tela de início no meio de uma competição continuaria enfrentando as simuladas no nível
   * antigo (ele está dentro de M8) e as próprias no novo — dificuldade diferente para o mesmo
   * torneio, que é exatamente o que `D-60` recusa.
   */
  readonly nivel: Level;
}

/** O armazenamento, ou `null` quando ele não existe / está bloqueado. Nunca lança. */
function armazenamento(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // Safari em navegação privada, `file://` em alguns navegadores.
  }
}

/**
 * Grava o registro. Falha é silenciosa: a pessoa está no meio de um torneio, e "não foi possível
 * salvar" não é informação que ela possa usar — o torneio da memória continua inteiro.
 */
export function gravarTorneio(em: TorneioEmCurso): void {
  const arm = armazenamento();
  if (arm === null) return;
  try {
    arm.setItem(
      CHAVE_TORNEIO,
      JSON.stringify({
        v: REGISTRO_V,
        humana: em.humana,
        // Índice, nunca o texto `'hard'`: o portão de `T-14` cobra "só código de país e
        // inteiro" no que vai ao armazenamento. A ordem é a de `NIVEIS`, e ela é fixa.
        nivel: NIVEIS.indexOf(em.nivel),
        estado: em.torneio.toJSON(),
      }),
    );
  } catch {
    /* cota estourada ou armazenamento bloqueado. */
  }
}

/** Joga o registro fora. Chamado ao abandonar o torneio e ao descartar registro ilegível. */
export function limparTorneio(): void {
  const arm = armazenamento();
  if (arm === null) return;
  try {
    arm.removeItem(CHAVE_TORNEIO);
  } catch {
    /* idem. */
  }
}

/**
 * A `humana` gravada fecha com o torneio que voltou?
 *
 * Duas perguntas, e as duas são de M8 respondendo por si: `group()` recusa código que não está
 * no torneio, e **`current()` sempre devolve um par que contém a seleção do jogador** — é portão
 * de M8, e aqui ele vira a conferência de que os dois lados do registro falam da mesma pessoa.
 * Só não pega a troca de um código das 32 por outro das 32 num registro editado à mão; nesse
 * caso o que a pessoa consegue é ver a tabela do grupo errado no próprio aparelho, e as disputas
 * continuam vindo de M8.
 */
function conferir(torneio: Tournament, humana: CountryCode): boolean {
  try {
    torneio.group(humana);
  } catch {
    return false;
  }
  const proxima = torneio.current();
  if (proxima === null) return true; // jogador eliminado, ou torneio encerrado: nada a cruzar.
  return proxima.teams.A === humana || proxima.teams.B === humana;
}

/**
 * O torneio de onde a pessoa parou, ou `null`.
 *
 * `null` cobre todos os casos, e nenhum deles aparece na tela: não há nada gravado · o
 * armazenamento está bloqueado · o JSON está pela metade · o registro é de um formato que este
 * código não conhece · o retrato não fecha consigo mesmo · a seleção gravada não fecha com o
 * torneio. Nos casos de lixo a chave é apagada, senão o mesmo lixo seria relido e redescartado
 * em toda abertura.
 */
export function restaurarTorneio(): TorneioEmCurso | null {
  const arm = armazenamento();
  if (arm === null) return null;

  let cru: string | null = null;
  try {
    cru = arm.getItem(CHAVE_TORNEIO);
  } catch {
    return null;
  }
  if (cru === null) return null;

  try {
    const dados = JSON.parse(cru) as {
      v?: unknown;
      humana?: unknown;
      nivel?: unknown;
      estado?: unknown;
    };
    if (dados === null || typeof dados !== 'object') throw new TypeError('registro não é objeto');
    if (dados.v !== REGISTRO_V) throw new TypeError('versão de registro desconhecida');
    if (typeof dados.humana !== 'string') throw new TypeError('seleção do jogador ausente');

    const nivel = typeof dados.nivel === 'number' ? NIVEIS[dados.nivel] : undefined;
    if (nivel === undefined) throw new TypeError('nível do torneio inválido');

    // `restoreTournament` valida o retrato inteiro (`assertState`) e lança em qualquer falta.
    // Aqui não há segunda validação dos campos dele: duas listas de campo divergiriam, e a de
    // M8 é a que manda.
    const torneio = restoreTournament(dados.estado as TournamentState);
    if (!conferir(torneio, dados.humana)) throw new TypeError('seleção não fecha com o torneio');

    return { torneio, humana: dados.humana, nivel };
  } catch {
    limparTorneio();
    return null;
  }
}
