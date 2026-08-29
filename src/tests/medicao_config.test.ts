/**
 * Portão de `T-38` — `QA-10`/`D-96`: erro de configuração sai do denominador da medição, e sai
 * **antes** da primeira tentativa.
 *
 * O portão do card é de **dois números**, e é isso que este arquivo mede: o do convidado (que tem
 * a base truncada) e o do anfitrião (que não tem, e é o aparelho cujo resumo virou linha de
 * registro na 1ª ida a campo). Saída que movesse só o primeiro não valeria a linha de `D-NN` —
 * está medido em [[qa10_denominador_da_medicao]].
 *
 * **Por que este arquivo importa `src/medicao.ts`, coisa que `medicao.test.ts` recusa.** Lá a
 * recusa é certa: aquele portão cobre a derivação da sala, que é função pura e mora em
 * `medicao_sala.ts`. Aqui o que está sob teste é o **estado da página** — quantas tentativas ela
 * conta, se o botão fica desabilitado, o que sobra escrito em `#estado`. Isso não existe fora da
 * página, e leitura de disco não produz número nenhum: produz a forma do código, não o resultado
 * dele. Então a página é executada de verdade, sobre um DOM mínimo escrito aqui.
 *
 * **E ela é executada sem tocar a rede.** O cenário inteiro roda com base INVÁLIDA, e base
 * inválida é exatamente o caso em que `joinRoom` lança antes de construir canal: nenhuma sala é
 * aberta, nenhum `import()` de sinalização parte, nada espera 20 s. É a mesma razão que faz o
 * projeto não usar `vi.mock` em M6 (`net.test.ts`) — o dublê não precisa existir quando o caminho
 * medido nunca chega ao transporte.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONNECT_TIMEOUT_MS, newRoomId } from '../net/index';

const MEDICAO_TS = fileURLToPath(new URL('../medicao.ts', import.meta.url));
const fonte = (): string => readFileSync(MEDICAO_TS, 'utf8');

/** Quantos toques o cenário do card manda dar em cada aparelho. */
const TOQUES = 9;

/**
 * A base do convidado no cenário-título: link colado com o `?m=` **truncado no fim**.
 *
 * Um caractere a menos, e é só isso. Não há regex nenhuma aqui e nem poderia haver: quem decide
 * que este ID é inválido é M6, e o gatilho da página é a exceção que ele lança.
 */
const truncada = (): string => newRoomId().slice(0, -1);

interface Elemento {
  textContent: string;
  innerHTML: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  addEventListener: (tipo: string, f: () => void) => void;
  disparar: (tipo: string) => void;
}

interface Pagina {
  el: (id: string) => Elemento;
}

/**
 * O DOM mínimo de que `medicao.ts` precisa: `getElementById` que nunca devolve `null`, e um
 * elemento que guarda texto, valor e o `disabled` que é metade do portão.
 */
function abrirDom(): Pagina {
  const elementos = new Map<string, Elemento>();

  const criar = (): Elemento => {
    const ouvintes = new Map<string, () => void>();
    return {
      textContent: '',
      innerHTML: '',
      value: '',
      checked: false,
      disabled: false,
      addEventListener: (tipo, f) => {
        ouvintes.set(tipo, f);
      },
      disparar: (tipo) => {
        ouvintes.get(tipo)?.();
      },
    };
  };

  const el = (id: string): Elemento => {
    const achado = elementos.get(id);
    if (achado !== undefined) return achado;
    const novo = criar();
    elementos.set(id, novo);
    return novo;
  };

  return { el };
}

type Global = Record<string, unknown>;

async function abrirPagina(url: string): Promise<Pagina> {
  const pagina = abrirDom();
  const g = globalThis as unknown as Global;

  g['document'] = { getElementById: (id: string): Elemento => pagina.el(id) };
  g['window'] = { location: { href: url } };

  // `medicao.ts` é entrada de página: `montar()` roda no import. O registro de módulos precisa
  // ser zerado a cada caso, senão o segundo teste herdaria o estado do primeiro.
  vi.resetModules();
  await import('../medicao');

  return pagina;
}

/** Abre a página como o CONVIDADO: `?m=` na URL, que é o que faz `papel = 'guest'`. */
const abrirComoConvidado = (base: string): Promise<Pagina> =>
  abrirPagina(`https://exemplo.test/medicao.html?m=${base}`);

/** E como o ANFITRIÃO: sem `?m=`, que é o aparelho que sorteia a base em vez de recebê-la. */
const abrirComoAnfitriao = (): Promise<Pagina> =>
  abrirPagina('https://exemplo.test/medicao.html');

afterEach(() => {
  const g = globalThis as unknown as Global;
  delete g['document'];
  delete g['window'];
});

/** Deixa o `void rodarUma()` do ouvinte de clique terminar antes de a medição ser lida. */
const assentar = (): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, 0);
  });

/**
 * O procedimento de campo, exatamente como a própria página o escreve: *"Aperte nos dois
 * aparelhos ao mesmo tempo. Uma tentativa por vez, dos dois lados."*
 *
 * É por isso que o número do anfitrião é decidido aqui: ele não tem base inválida nenhuma, e
 * `joinRoom` nunca lança no aparelho dele. O que o impede de queimar 20 s por toque é o convidado
 * **não ter em que tocar** — rodada em que um dos lados não pode tocar é rodada que não acontece.
 */
async function toquesDoAnfitriao(pagina: Pagina, rodadas: number): Promise<number> {
  const tentar = pagina.el('tentar');
  let n = 0;

  for (let i = 0; i < rodadas; i += 1) {
    if (tentar.disabled) break;
    n += 1;
    tentar.disparar('click');
    await assentar();
  }

  return n;
}

/** O que o convidado contou, lido do texto colável — que é o que vira linha de registro. */
function medicaoDoConvidado(pagina: Pagina): {
  sucessos: number;
  tentativas: number;
  descartadas: number | null;
} {
  const texto = pagina.el('resumo').value;
  const taxa = /SEM TURN\s+: (\d+)\/(\d+)/.exec(texto);
  const desc = /DESCARTADAS por configuração \(fora de toda taxa\): (\d+)/.exec(texto);

  return {
    sucessos: Number(taxa?.[1] ?? -1),
    tentativas: Number(taxa?.[2] ?? -1),
    // `null` = a linha não existe no resumo. É o estado de antes de `D-96`, e ele precisa ser
    // distinguível de `0`: linha ausente é outra coisa que contador zerado.
    descartadas: desc === undefined || desc === null ? null : Number(desc[1]),
  };
}

describe('D-96 · o portão de DOIS números: `?m=` truncado, 9 toques em cada aparelho', () => {
  it('o convidado conta ZERO tentativas — e diz que descartou, em vez de dizer 0/9', async () => {
    const pagina = await abrirComoConvidado(truncada());

    // O operador tenta os 9 toques do cenário. Nenhum deles vira tentativa.
    for (let i = 0; i < TOQUES; i += 1) {
      pagina.el('tentar').disparar('click');
      await assentar();
    }

    const m = medicaoDoConvidado(pagina);

    // Antes de `D-96`: 0/9 = 0,0% — o número mais crível e mais falso que este projeto pagou.
    expect(m.tentativas).toBe(0);
    expect(m.sucessos).toBe(0);
    // E `0/0` não fica ambíguo: é 0/0 **porque descartei**, não porque ninguém tocou.
    expect(m.descartadas).toBe(1);
  });

  it('o anfitrião não tem 0/9: ele tem ZERO toques possíveis, e não queima 180 s', async () => {
    const pagina = await abrirComoConvidado(truncada());

    const toques = await toquesDoAnfitriao(pagina, TOQUES);

    // Antes de `D-96` o convidado tocava 9 vezes, o anfitrião acompanhava, e os 9 toques dele
    // terminavam em `'failed'` por tempo — 9 × 20 s de espera humana virando falha de rede.
    expect(toques).toBe(0);
    expect(toques * (CONNECT_TIMEOUT_MS / 1000)).toBe(0);
  });

  it('a recusa acontece ANTES da 1ª tentativa: o botão já nasce desabilitado', async () => {
    // É a diferença entre a saída (c) e a saída (a) de `QA-10`, e é ela que move o número do
    // anfitrião: recusar DEPOIS do primeiro toque já teria custado 20 s do outro lado.
    const pagina = await abrirComoConvidado(truncada());

    expect(pagina.el('tentar').disabled).toBe(true);
  });

  /**
   * O contra-caso, que impede "desabilitar sempre" de passar no portão acima.
   *
   * **Ele não usa base válida, e o limite é declarado:** base válida faz `joinRoom` construir
   * canal de verdade, com `import()` de sinalização e websocket para infraestrutura pública — que
   * é justamente o que nenhum teste deste repositório faz, e o que faria a suíte depender de
   * rede. O que dá para separar sem rede é a página que **não** recusou nada: no anfitrião, sem
   * `?m=`, nada é conferido, nada é descartado, e o botão está desabilitado por outro motivo
   * (`base === ''`), que some assim que a sala é sorteada.
   */
  it('página que não recusou base não descarta nada — a recusa vem da base, não da carga', async () => {
    const pagina = await abrirComoAnfitriao();

    expect(medicaoDoConvidado(pagina).descartadas).toBe(0);
    expect(pagina.el('estado').textContent).not.toContain('configuração');
    expect(pagina.el('descartes').textContent).not.toContain('base recusada');
  });

  it('o botão lê a recusa, e não uma constante — a origem, já que a base válida é de campo', () => {
    const src = fonte();
    const corpoPintar = src.slice(src.indexOf('function pintar('), src.indexOf('function montar('));

    expect(corpoPintar).toContain(
      "$<HTMLButtonElement>('tentar').disabled = rodando || base === '' || baseRecusada !== null",
    );
  });
});

describe('D-96 · 3º item do portão: a mensagem sobrevive ao turno', () => {
  it('com base inválida, a última escrita em #estado diz configuração', async () => {
    const pagina = await abrirComoConvidado(truncada());

    for (let i = 0; i < TOQUES; i += 1) {
      pagina.el('tentar').disparar('click');
      await assentar();
    }

    // O comentário do `catch` alegava que "o motivo fica na tela". `rodarUma()` o apagava no
    // mesmo turno com `falhou após 0 ms`, e a premissa que defendia a regra de hoje era falsa
    // desde que a linha existia. Agora é teste.
    expect(pagina.el('estado').textContent).toContain('configuração');
    expect(pagina.el('estado').textContent).not.toContain('falhou após');
  });

  it('a tela diz o descarte, não só o texto colável', async () => {
    const pagina = await abrirComoConvidado(truncada());

    expect(pagina.el('descartes').textContent).toContain('descartadas por configuração: 1');
  });
});

/**
 * Não-regressão sobre a amostra REAL de `e_qa/` (`A-08`, as quatro idas a campo).
 *
 * Ela não é discriminador — nenhuma das quatro saídas de `QA-10` a move, e é por isso que o
 * portão original do card aprovava também não fazer nada. Fica aqui pelo que ela protege: a regra
 * nova só remove tentativa em que o canal **nunca abriu**, e na amostra não há uma sequer.
 */
describe('D-96 · não-regressão: a amostra de e_qa/ continua 43/43', () => {
  /** Cada ida a campo, como está registrada. `descartes` = erros de configuração: nenhum. */
  const AMOSTRA = [
    { rodada: 'Wi-Fi × Wi-Fi (controle)', tentativas: 4, sucessos: 4, descartes: 0 },
    { rodada: 'Claro 5G × Wi-Fi (mista)', tentativas: 4, sucessos: 4, descartes: 0 },
    { rodada: 'Claro 5G × Claro 5G', tentativas: 5, sucessos: 5, descartes: 0 },
    { rodada: '1ª ida com T-16', tentativas: 12, sucessos: 12, descartes: 0 },
    { rodada: '3ª ida (IPv6)', tentativas: 1, sucessos: 1, descartes: 0 },
    { rodada: '4ª ida IPv4/com NAT (fechou E-4)', tentativas: 17, sucessos: 17, descartes: 0 },
  ];

  const soma = (k: 'tentativas' | 'sucessos' | 'descartes'): number =>
    AMOSTRA.reduce((s, r) => s + r[k], 0);

  /**
   * Limite inferior exato de 95% para `s` sucessos em `n` tentativas (`D-42`). Com `s === n` ele é
   * `0,05 ^ (1/n)` — é este número, e não a taxa, que responde "43/43 basta para o corte de 70%?".
   */
  const limiteInferior = (s: number, n: number): number => (s === n ? 0.05 ** (1 / n) : NaN);

  it('a amostra não contém um único erro de configuração — logo a regra nova não a toca', () => {
    expect(soma('descartes')).toBe(0);
  });

  it('43/43 = 100,0% antes e depois, e o limite inferior segue 93,3%', () => {
    const n = soma('tentativas');
    const s = soma('sucessos');
    // "Depois" é o mesmo denominador menos os descartes — e os descartes são zero.
    const nDepois = n - soma('descartes');

    expect(n).toBe(43);
    expect(s).toBe(43);
    expect(nDepois).toBe(43);
    expect(((100 * s) / n).toFixed(1)).toBe('100.0');
    expect(((100 * s) / nDepois).toFixed(1)).toBe('100.0');
    expect((100 * limiteInferior(s, n)).toFixed(1)).toBe('93.3');
    expect((100 * limiteInferior(s, nDepois)).toFixed(1)).toBe('93.3');
  });
});
