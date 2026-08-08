/**
 * Instrumento de medição do portão de E-4 — **não faz parte do jogo**.
 *
 * O PLANO diz, com todas as letras, que o número da taxa de conexão não sai do sandbox do
 * agente: "é medição do dono, dois aparelhos, rede de operadora, não Wi-Fi de casa"
 * [b_plan.md → M6 → "Onde a stack vai doer"]. Esta página é o aparelho de medida que faltava
 * para essa frase ser executável, e nada além disso.
 *
 * **Ela mede duas coisas, porque E-4 exige duas** (`b_plan.md` → tabela de milestones):
 *   1. a taxa **sem TURN** — a que alimenta o gatilho de revisão de `D-01`;
 *   2. a taxa **na configuração que vai ao ar** — a que é cobrada contra o corte de 70%.
 * Por isso os dois contadores são separados e nunca se somam.
 *
 * **Nenhuma credencial mora aqui.** O TURN é digitado no aparelho, em runtime, e some no reload:
 * é o que mantém "nenhum segredo versionado" verdadeiro enquanto a medição com relay acontece.
 *
 * Mora em `src/`, e **não** em `src/ui/`, de propósito: o portão de camada de M7 exige zero
 * import de `src/net` dentro de `src/ui/`, e este arquivo importa M6 direto. Instrumento não é
 * tela de jogo.
 */

import { idDaTentativa } from './medicao_sala';
import { CONNECT_TIMEOUT_MS, hostRoom, joinRoom } from './net/index';
import type { Channel, IceConfig, LinkStatus } from './net/index';

type Papel = 'host' | 'guest';
type Modo = 'semTurn' | 'comTurn';

interface Contador {
  tentativas: number;
  sucessos: number;
  falhas: number;
  temposMs: number[];
}

const contadores: Record<Modo, Contador> = {
  semTurn: { tentativas: 0, sucessos: 0, falhas: 0, temposMs: [] },
  comTurn: { tentativas: 0, sucessos: 0, falhas: 0, temposMs: [] },
};

/** Sala-base da medição: sorteada por M6 no aparelho que abre, colada no que entra. */
let base = '';
let papel: Papel = 'host';
let rodando = false;

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`elemento ausente: ${id}`);
  return el as T;
};

function iceAtual(): IceConfig | undefined {
  if (!$<HTMLInputElement>('usarTurn').checked) return undefined;
  const urls = $<HTMLInputElement>('turnUrls').value.trim();
  const username = $<HTMLInputElement>('turnUser').value.trim();
  const credential = $<HTMLInputElement>('turnCred').value.trim();
  if (urls === '') return undefined;
  return { turn: { urls, username, credential } };
}

const modoAtual = (): Modo => (iceAtual() === undefined ? 'semTurn' : 'comTurn');

/**
 * Uma tentativa: abre o canal, espera `'connected'` ou `'failed'`, fecha e registra.
 *
 * O veredito é o do próprio M6 — inclusive o timeout de 20 s. Reimplementar o relógio aqui
 * mediria o instrumento, não o módulo.
 *
 * **Os dois lados entram por `joinRoom`, e o papel não escolhe porta (`D-38`).** Antes, o
 * anfitrião abria a sala por `hostRoom`, que sorteia sala NOVA a cada chamada: o `id` rotacionado
 * era calculado e jogado fora, os dois aparelhos ficavam em salas diferentes e a medição dava 0%
 * (`QA-08`). Como `hostRoom` e `joinRoom` desembocam no mesmo `createChannel`, e a rotação
 * devolve um ID que passa em `ROOM_ID_RE`, entrar pelos dois lados custa nada e não pede um byte
 * de M6 — `D-39` (assinatura nova em `hostRoom`) e `D-40` (exportar `createChannel`) foram
 * rejeitadas justamente por cobrarem a porta congelada de `D-13` pelo mesmo resultado.
 *
 * O `papel` continua existindo: ele decide quem SORTEIA a base e o que a tela mostra. Só não
 * decide mais por qual função o canal abre.
 */
function tentativa(id: string, ice: IceConfig | undefined): Promise<{ ok: boolean; ms: number }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let canal: Channel;
    let pronto = false;

    const terminar = (ok: boolean): void => {
      if (pronto) return;
      pronto = true;
      const ms = Math.round(performance.now() - t0);
      canal.close();
      resolve({ ok, ms });
    };

    try {
      canal = joinRoom(id, ice);
    } catch (e) {
      // ID malformado ou contexto inseguro: é falha de configuração, não de rede. Some da
      // medição como falha, mas com o motivo na tela — número sujo é pior que número ausente.
      $('estado').textContent = `erro de configuração: ${String(e)}`;
      resolve({ ok: false, ms: 0 });
      return;
    }

    canal.onStatus((s: LinkStatus) => {
      if (s === 'connected') terminar(true);
      if (s === 'failed') terminar(false);
    });
  });
}

async function rodarUma(): Promise<void> {
  if (rodando || base === '') return;
  rodando = true;
  pintar();

  const modo = modoAtual();
  const c = contadores[modo];
  const id = idDaTentativa(base, c.tentativas);
  $('estado').textContent = `tentativa ${c.tentativas + 1} (${modo === 'semTurn' ? 'sem TURN' : 'com TURN'}) — aguardando até ${CONNECT_TIMEOUT_MS / 1000} s…`;

  const { ok, ms } = await tentativa(id, iceAtual());

  c.tentativas += 1;
  if (ok) {
    c.sucessos += 1;
    c.temposMs.push(ms);
  } else {
    c.falhas += 1;
  }
  $('estado').textContent = ok ? `conectou em ${ms} ms` : `falhou após ${ms} ms`;
  rodando = false;
  pintar();
}

const pct = (c: Contador): string =>
  c.tentativas === 0 ? '—' : `${((100 * c.sucessos) / c.tentativas).toFixed(1)}%`;

function mediana(v: number[]): string {
  if (v.length === 0) return '—';
  const s = [...v].sort((a, b) => a - b);
  const meio = Math.floor(s.length / 2);
  const m = s.length % 2 === 1 ? s[meio] : ((s[meio - 1] ?? 0) + (s[meio] ?? 0)) / 2;
  return `${Math.round(m ?? 0)} ms`;
}

/** Texto pronto para colar no DECISIONS. Sem isto, o número morre na tela do celular. */
function resumo(): string {
  const l = (rot: string, c: Contador): string =>
    `${rot}: ${c.sucessos}/${c.tentativas} = ${pct(c)} · mediana ${mediana(c.temposMs)}`;
  return [
    `Medição E-4 — ${new Date().toISOString()}`,
    `timeout de M6: ${CONNECT_TIMEOUT_MS} ms · papel deste aparelho: ${papel}`,
    l('SEM TURN            ', contadores.semTurn),
    l('CONFIG QUE VAI AO AR', contadores.comTurn),
    '',
    'Corte de E-4: >= 70% na configuração que vai ao ar.',
    'A taxa SEM TURN alimenta o gatilho de revisão de D-01 (reabre se < 70%).',
    'Rede usada: [preencher: operadora, 4G/5G, os dois aparelhos]',
  ].join('\n');
}

function pintar(): void {
  const linha = (rot: string, c: Contador): string =>
    `<tr><td>${rot}</td><td class="num">${c.tentativas}</td><td class="num">${c.sucessos}</td>` +
    `<td class="num">${pct(c)}</td><td class="num">${mediana(c.temposMs)}</td></tr>`;

  $('placar').innerHTML =
    '<tr><th>medição</th><th class="num">tent.</th><th class="num">ok</th>' +
    '<th class="num">taxa</th><th class="num">mediana</th></tr>' +
    linha('sem TURN', contadores.semTurn) +
    linha('vai ao ar', contadores.comTurn);

  $<HTMLButtonElement>('tentar').disabled = rodando || base === '';
  $<HTMLTextAreaElement>('resumo').value = resumo();
}

function montar(): void {
  const url = new URL(window.location.href);
  const daUrl = url.searchParams.get('m');
  if (daUrl !== null && daUrl !== '') {
    base = daUrl;
    papel = 'guest';
  }

  $('app').innerHTML = `
    <fieldset>
      <legend>1 · sala</legend>
      <div id="salaBox"></div>
    </fieldset>

    <fieldset>
      <legend>2 · relay TURN (opcional)</legend>
      <label><input type="checkbox" id="usarTurn" /> usar TURN nesta tentativa</label>
      <label for="turnUrls">urls</label>
      <input type="text" id="turnUrls" placeholder="turn:host:3478" autocomplete="off" />
      <label for="turnUser">username</label>
      <input type="text" id="turnUser" autocomplete="off" />
      <label for="turnCred">credential</label>
      <input type="text" id="turnCred" autocomplete="off" />
      <p class="aviso">
        Digitado aqui, some no reload. Nada de credencial no repositório.
      </p>
    </fieldset>

    <fieldset>
      <legend>3 · medir</legend>
      <div id="estado">pronto</div>
      <button id="tentar">Tentativa</button>
      <p class="aviso">
        Aperte nos dois aparelhos ao mesmo tempo. Uma tentativa por vez, dos dois lados.
      </p>
      <table><tbody id="placar"></tbody></table>
      <button class="sec" id="zerar">Zerar contadores</button>
    </fieldset>

    <fieldset>
      <legend>4 · resultado para colar</legend>
      <textarea id="resumo" readonly></textarea>
      <button class="sec" id="copiar">Copiar</button>
    </fieldset>
  `;

  if (papel === 'guest') {
    $('salaBox').innerHTML =
      `<p>Este aparelho <strong>entra</strong> na sala:</p><p class="mono">${base}</p>`;
  } else {
    $('salaBox').innerHTML = `
      <p>Este aparelho <strong>abre</strong> a sala.</p>
      <button id="abrir">Sortear sala</button>
      <div id="link"></div>`;
    $('abrir').addEventListener('click', () => {
      // `hostRoom` é quem sabe sortear ID opaco (M6). O canal desta chamada não serve para nada
      // além disso e é fechado na hora; as tentativas abrem canais próprios.
      const r = hostRoom();
      r.channel.close();
      base = r.roomId;
      const alvo = `${window.location.origin}${window.location.pathname}?m=${base}`;
      $('link').innerHTML =
        `<p>Abra este endereço no OUTRO aparelho:</p><p class="mono">${alvo}</p>`;
      pintar();
    });
  }

  $('tentar').addEventListener('click', () => void rodarUma());
  $('zerar').addEventListener('click', () => {
    for (const m of ['semTurn', 'comTurn'] as Modo[]) {
      contadores[m] = { tentativas: 0, sucessos: 0, falhas: 0, temposMs: [] };
    }
    pintar();
  });
  $('copiar').addEventListener('click', () => {
    void navigator.clipboard?.writeText(resumo());
  });
  $('usarTurn').addEventListener('change', pintar);

  pintar();
}

montar();
