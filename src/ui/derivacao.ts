/**
 * M7 — de quem é a escolha desta vez, e o que ela significa na tela.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * Módulo **puro**: nenhum DOM, nenhuma `Session`, nenhum Phaser. É o que deixa a única regra
 * derivada desta camada ser testada sem navegador — e ela precisa de teste, porque é a
 * derivação de `Q-09`.
 *
 * ## Por que existe derivação (Q-09)
 * A porta congelada de M5 não expõe de quem é a escolha pendente: `Session.choose()` tem a mesma
 * assinatura nos três modos e `match.turn` só vira depois do `play()`. No modo `local` os dois
 * jogadores estão no MESMO aparelho, então a tela precisa saber se o próximo toque é o chute de
 * quem cobra ou a defesa do outro lado.
 *
 * A derivação é a que `Q-09` prescreve e que o teste de T-09 fixou: **notificação com o mesmo
 * `kicks.length` da anterior significa escolha pendente**. Duas notificações por cobrança em
 * `local` (a primeira sem cobrança nova), uma só em `cpu`.
 *
 * Resolver de vez é `pending(): Side | null` na `Session` — contrato congelado, logo `D-NN` do
 * dono. Enquanto `Q-09` estiver aberta, é aqui que a lacuna mora, declarada e testada.
 *
 * ## O que a derivação NÃO faz
 * Não guarda a zona escolhida. No modo `local` o goleiro está olhando a mesma tela do batedor:
 * se a zona do chute estivesse aqui, alguém acabaria a renderizando. Ela fica dentro de M5, que
 * é onde ela já estava.
 */

import type { Side } from '../core/index';
import type { MatchState, Mode } from '../session/index';

/**
 * Os dois modos que M5 aceita hoje. `online` é T-13 e `createSession` o recusa em voz alta.
 *
 * Derivado de `Mode` em vez de reescrito como literal por **dois** motivos. O primeiro é tipo:
 * o dia em que M5 ganhar um modo, esta linha acompanha sozinha. O segundo é o portão de camada,
 * que o CI cobra com `grep -rnoE "^\s*(import|export)[^;]*(engine|cpu|net)" src/ui/` — padrão
 * largo de propósito, e por isso a palavra `cpu` escrita numa linha de `export` reprova a
 * fronteira mesmo sem haver import nenhum do motor — foi o que o CI pegou em T-10.
 */
export type ModoJogavel = Exclude<Mode, 'online'>;

export type Papel = 'chutar' | 'defender';

export interface Vez {
  /** Quem escolhe agora. No modo `cpu` é sempre o lado do humano deste aparelho. */
  readonly lado: Side;
  readonly papel: Papel;
  /** `true` só no modo `local`, entre o chute e a defesa da MESMA cobrança. */
  readonly pendente: boolean;
}

export interface Derivacao {
  /** Chame a CADA notificação de M5, na ordem em que chegam. */
  aoNotificar(estado: MatchState): void;
  /** A vez corrente, ou `null` quando não há escolha a fazer (disputa encerrada). */
  vez(estado: MatchState): Vez | null;
}

export function outroLado(lado: Side): Side {
  return lado === 'A' ? 'B' : 'A';
}

/**
 * @param modo   modo da sessão — muda a derivação inteira, e por isso é obrigatório.
 * @param ladoLocal  o lado do humano deste aparelho. Só é lido no modo `cpu`; em `local` os dois
 *                   lados são deste aparelho e quem escolhe sai de `match.turn`.
 */
export function criarDerivacao(modo: ModoJogavel, ladoLocal: Side): Derivacao {
  // Espelha o `kicks.length` da última notificação processada. Começa em 0 porque é esse o
  // número de cobranças de uma disputa recém-criada — e a primeira notificação do modo `local`
  // chega justamente com 0, que é o que a marca como pendente.
  let ultimoKicks = 0;
  let pendente = false;

  return {
    aoNotificar(estado: MatchState): void {
      if (modo !== 'local') {
        // Em `cpu`, M5 resolve a cobrança inteira por toque: toda notificação traz cobrança
        // nova, e nunca há escolha pendente. Guardar o contador mesmo assim mantém os dois
        // ramos com o mesmo estado, o que evita que um `if` esquecido vire bug de um modo só.
        ultimoKicks = estado.kicks.length;
        pendente = false;
        return;
      }

      pendente = estado.kicks.length === ultimoKicks;
      ultimoKicks = estado.kicks.length;
    },

    vez(estado: MatchState): Vez | null {
      // `turn` é `null` na fase `finished`, e é o próprio M2 quem garante isso. Ler os dois
      // custa nada e deixa a tela imune a um estado que chegue torto de qualquer caminho.
      if (estado.phase === 'finished' || estado.turn === null) return null;

      if (modo === 'cpu') {
        return {
          lado: ladoLocal,
          papel: estado.turn === ladoLocal ? 'chutar' : 'defender',
          pendente: false,
        };
      }

      return pendente
        ? { lado: outroLado(estado.turn), papel: 'defender', pendente: true }
        : { lado: estado.turn, papel: 'chutar', pendente: false };
    },
  };
}
