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

import {
  CLASSES,
  CLASSES_DIRETAS,
  ROTULO_CLASSE,
  classificarPar,
  conexaoMorta,
  contagemZerada,
  criarObservador,
  descreverPar,
  lerParInsistindo,
} from './medicao_par';
import type { ClassePar, LeituraDoPar } from './medicao_par';
import { idDaTentativa, rotuloDaTentativa } from './medicao_sala';
import { CONNECT_TIMEOUT_MS, hostRoom, joinRoom } from './net/index';
import type { Channel, IceConfig, LinkStatus } from './net/index';

type Papel = 'host' | 'guest';
type Modo = 'semTurn' | 'comTurn';

interface Contador {
  tentativas: number;
  sucessos: number;
  falhas: number;
  temposMs: number[];
  /**
   * `T-16`: os sucessos abertos por tipo de par. Some com `sucessos`, e some de propósito — é a
   * decomposição do mesmo número, não um segundo número. Só sucesso entra: tentativa que falhou
   * não tem par selecionado, e forçá-la a uma classe seria inventar leitura.
   */
  porClasse: Record<ClassePar, number>;
}

const zerado = (): Contador => ({
  tentativas: 0,
  sucessos: 0,
  falhas: 0,
  temposMs: [],
  porClasse: contagemZerada(),
});

const contadores: Record<Modo, Contador> = { semTurn: zerado(), comTurn: zerado() };

/** A leitura da última tentativa, para a tela. `null` = ainda não houve tentativa. */
let ultimaLeitura: LeituraDoPar | null = null;
let ultimoParIndice = -1;

const ultimoPar = (): LeituraDoPar['par'] => ultimaLeitura?.par ?? null;

/**
 * Apaga o par exibido. Chamado nos dois eventos que reiniciam a rotação (sala nova e "Zerar"),
 * pelo mesmo motivo de `indice = 0`: o rótulo diz `#N`, e depois do reinício aquele `#N` passa a
 * apontar para outra tentativa. Guardar o par de antes seria oferecer leitura de um número que a
 * medição já não tem.
 */
function esquecerPar(): void {
  ultimaLeitura = null;
  ultimoParIndice = -1;
}

/** Espera de verdade — injetada em `lerParInsistindo` para o teste não precisar dormir. */
const dormir = (ms: number): Promise<void> =>
  new Promise((r) => {
    setTimeout(r, ms);
  });

/**
 * `T-16` — o embrulho do construtor de `RTCPeerConnection`, instalado antes de qualquer canal
 * abrir.
 *
 * É daqui que sai o par de candidatos de cada tentativa, e é por aqui que ele sai **sem M6 mudar
 * um byte**: `Channel` não devolve a conexão, e abrir essa porta é o que `D-39` e `D-40`
 * recusaram. O global não é porta de módulo nenhum — a Trystero o lê no momento em que constrói,
 * então embrulhá-lo aqui alcança toda instância sem que M6 saiba que está sendo medido.
 *
 * `undefined` em navegador sem WebRTC: a página segue de pé e as tentativas falham com a mensagem
 * de M6, que é o comportamento que já existia.
 */
let observador = typeof RTCPeerConnection === 'undefined' ? null : criarObservador(RTCPeerConnection);

try {
  if (observador !== null) globalThis.RTCPeerConnection = observador.Observada;
} catch (e: unknown) {
  // Escrever no global pode ser recusado (política do navegador, extensão que o congelou). Isso
  // custa a LEITURA do par, e não a medição: sem observador, `lerPar` recebe lista vazia e o par
  // entra como `ausente` — que é o que de fato aconteceu. Derrubar a página inteira por causa do
  // instrumento seria trocar a taxa de conexão, que é o portão de E-4, pela decoração dela.
  console.warn(`[T-16] não deu para observar RTCPeerConnection: ${String(e)}`);
  observador = null;
}

/** Sala-base da medição: sorteada por M6 no aparelho que abre, colada no que entra. */
let base = '';
let papel: Papel = 'host';
let rodando = false;

/**
 * `QA-10`/`D-96` — o motivo pelo qual M6 recusou a base, ou `null` enquanto ela não foi recusada.
 *
 * Enquanto for `null` a página mede; depois de preenchido, **este aparelho não mede mais nada**:
 * "Tentativa" fica desabilitado e a mensagem escrita em `#estado` é a última da tela. É a saída
 * (c) de `QA-10`, e o que ela compra não está neste aparelho — está no outro. Com `?m=` truncado,
 * a base do convidado é inválida e a do anfitrião não é: `joinRoom` só lança de um lado, e o outro
 * queima os 20 s de `CONNECT_TIMEOUT_MS` a cada toque, registrando falha de rede que nunca houve.
 * Como o procedimento é tocar nos DOIS ao mesmo tempo, desabilitar aqui é o que impede o toque lá.
 */
let baseRecusada: string | null = null;

/**
 * Tentativas descartadas por configuração: as que o canal **nunca chegou a abrir** (`D-96`, (b)).
 *
 * Fica fora de `Contador` de propósito — não é por modo. O que a torna inválida é o formato da
 * base, que não muda quando o TURN entra ou sai; somá-la a um dos dois contadores seria contar
 * erro de operador como medição de uma configuração de rede.
 *
 * **Nunca entra em `tentativas` nem em `falhas`.** É esta separação que `QA-10` pediu: sem ela, o
 * convidado com base truncada devolvia `0/9 = 0,0%` — o número mais crível e mais falso que este
 * projeto pagou. Com ela, devolve `0/0` e diz **por que**: `0/0` porque descartei é outra coisa
 * que `0/0` porque ninguém tocou, e a tela precisa distinguir as duas.
 */
let descartadas = 0;

/**
 * Índice da rotação: **qual sala** a próxima tentativa usa, e nada mais (`QA-12`).
 *
 * Era `contadores[modo].tentativas` — o mesmo número servia de estatística e de endereço. Duas
 * coisas que precisam zerar em momentos diferentes não cabem numa variável só, e o preço apareceu
 * em campo: sortear sala nova sem recarregar mantinha o anfitrião no índice 4 enquanto o convidado
 * abria o link novo no índice 0. Salas diferentes, 20 s, e o resultado entrando na planilha como
 * falha de rede que nunca houve — o mesmo viés de `QA-08`, por outra porta.
 *
 * **Zera em dois eventos, e só nesses dois:** sala nova sorteada, e "Zerar contadores" (que é a
 * recuperação que a própria tela manda fazer quando os dois aparelhos divergem).
 *
 * **É um índice só, não um por modo, e isso é consequência de separá-lo da estatística** — quem é
 * por modo é a contagem. Sai de graça um defeito a menos: com um índice por modo, a tentativa 3
 * sem TURN e a 3 com TURN caíam na MESMA sala, e reentrar em sala usada é exatamente o viés para
 * cima que `D-41` recusou (peer velho vira `'connected'` sem conexão nova).
 *
 * **Limite que continua de pé:** a rotação só tem 26 salas (`b.length`), e agora o índice é somado
 * entre os dois modos. Passou de 26 tentativas no total, reentra em sala já usada.
 */
let indice = 0;

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
 * Recusa a base, com o motivo que veio de M6 (`D-96`).
 *
 * Escreve em `#estado` e **conta o descarte**, nas duas portas por onde uma base inválida pode
 * aparecer: a checagem de entrada e o `catch` de `tentativa()`. A mensagem daqui é a que tem de
 * sobreviver ao turno — quem a apagava era `rodarUma()`, e é lá que está o conserto.
 */
function recusarBase(e: unknown): void {
  baseRecusada = String(e);
  descartadas += 1;
  $('estado').textContent = `erro de configuração: ${baseRecusada}`;
}

/**
 * A base é recusada ANTES da primeira tentativa, e não depois dela (`D-96`, saída (c)).
 *
 * **O gatilho é a exceção que `joinRoom` já lança** — nenhum formato de ID mora aqui. Conhecer o
 * `ROOM_ID_RE` de M6 custaria abrir a porta congelada de `D-13` (o preço que reprovou `D-39` e
 * `D-40`) ou duplicar a constante, e constante duplicada é constante que diverge: no dia em que
 * M6 apertar o formato, a cópia daqui aceitaria o que o módulo recusa.
 *
 * **O preço declarado:** com base válida isto abre e fecha um canal na entrada da página. É o
 * mesmo preço que o anfitrião já paga desde sempre no botão "Sortear sala" (`hostRoom` e o
 * `close()` na linha seguinte), sobre exatamente a mesma sala — `idDaTentativa(base, 0)` é a
 * própria base. Vale porque o que ele evita são 180 s de espera humana **no outro aparelho**.
 *
 * Roda só no convidado: a base do anfitrião não vem de link colado, vem de `hostRoom`, que a
 * sorteou. O `catch` de `tentativa()` continua de pé como rede de segurança dos dois lados.
 */
function conferirBase(): void {
  if (base === '') return;
  try {
    joinRoom(idDaTentativa(base, indice)).close();
  } catch (e) {
    recusarBase(e);
  }
}

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
function tentativa(
  id: string,
  ice: IceConfig | undefined,
): Promise<{ ok: boolean; ms: number; leitura: LeituraDoPar; abriu: boolean }> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let canal: Channel;
    let pronto = false;

    // Tira da lista o que já fechou. **Não esvazia:** a conexão que fecha esta tentativa costuma
    // ter nascido numa anterior, porque a Trystero reaproveita um pool de 20 entre salas. Esvaziar
    // por tentativa foi `QA-13` — 11 leituras perdidas em 12 na 1ª ida a campo.
    observador?.podar(conexaoMorta);

    const terminar = (ok: boolean): void => {
      if (pronto) return;
      pronto = true;
      // O tempo é fechado ANTES da leitura dos candidatos: `getStats()` é assíncrono, e deixá-lo
      // dentro da conta entraria na mediana como se fosse tempo de conexão.
      const ms = Math.round(performance.now() - t0);

      void (async () => {
        // E a leitura vem antes do `close()`, que solta a sala e mata a conexão: lida depois, ela
        // devolveria relatório vazio e o par viraria `ausente` — dado perdido com cara de dado
        // ausente, que é o defeito que `T-16` existe para não repetir.
        const leitura = ok
          ? await lerParInsistindo(observador?.pcs ?? [], dormir)
          : { par: null, motivo: 'tentativa falhou: não há par para ler', observadas: 0, vivas: 0 };
        canal.close();
        resolve({ ok, ms, leitura, abriu: true });
      })();
    };

    try {
      canal = joinRoom(id, ice);
    } catch (e) {
      // ID malformado ou contexto inseguro: é falha de configuração, não de rede — e desde
      // `D-96` ela **não é mais uma falha**. Quem separa as duas é `abriu`, e é um booleano, e
      // não a string do motivo: motivo é texto de M6, e casar texto de outro módulo quebra na
      // primeira vez que alguém melhorar a mensagem de lá.
      recusarBase(e);
      resolve({
        ok: false,
        ms: 0,
        leitura: { par: null, motivo: 'canal nunca abriu', observadas: 0, vivas: 0 },
        abriu: false,
      });
      return;
    }

    canal.onStatus((s: LinkStatus) => {
      if (s === 'connected') terminar(true);
      if (s === 'failed') terminar(false);
    });
  });
}

async function rodarUma(): Promise<void> {
  if (rodando || base === '' || baseRecusada !== null) return;
  rodando = true;
  pintar();

  const modo = modoAtual();
  const c = contadores[modo];
  const id = idDaTentativa(base, indice);
  $('estado').textContent = `tentativa #${indice} (${modo === 'semTurn' ? 'sem TURN' : 'com TURN'}) — aguardando até ${CONNECT_TIMEOUT_MS / 1000} s…`;

  const { ok, ms, leitura, abriu } = await tentativa(id, iceAtual());

  if (!abriu) {
    // `D-96`: o canal nunca abriu. Nada aqui anda — nem o denominador, nem o índice, nem o par
    // exibido —, porque nada aconteceu: nenhuma sala foi usada e nenhuma rede foi exercitada.
    // E `#estado` **não** é reescrito: a mensagem que `recusarBase` acabou de pôr na tela é a
    // que o operador tem de ler. Era exatamente esta linha, `falhou após 0 ms`, que apagava o
    // motivo no mesmo turno e tornava falsa a premissa que o comentário do `catch` alegava.
    rodando = false;
    pintar();
    return;
  }

  ultimaLeitura = leitura;
  ultimoParIndice = indice;

  // O índice anda sempre, inclusive quando a tentativa falha: os dois aparelhos precisam andar
  // juntos, e o outro lado não sabe se esta aqui deu certo.
  indice += 1;
  c.tentativas += 1;
  if (ok) {
    c.sucessos += 1;
    c.temposMs.push(ms);
    // `T-16`: o sucesso é aberto pelo que ele PROVA. Sucesso via `relay` não é sucesso de P2P
    // direto, e `srflx↔srflx` com o mesmo IP público não fala de CGNAT — somados num número só,
    // os três dizem "100%" e nenhum deles responde `A-08`.
    c.porClasse[classificarPar(leitura.par)] += 1;
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

/** O resumo colável mostra o IP inteiro? Desligado por padrão — ver `mascararIp`. */
const ipInteiro = (): boolean => $<HTMLInputElement>('ipInteiro').checked;

/**
 * Os sucessos de um contador abertos por tipo de par (`T-16`).
 *
 * Só as classes que aconteceram entram, e a última linha diz o veredito em números — é ela que
 * cumpre "o dono não interpreta nada": `srflx↔srflx` com IPs diferentes é travessia de NAT de
 * verdade, `relay` não é P2P direto, e sem essa separação os três viram um "100%" que não
 * responde `A-08`.
 */
function abertura(rot: string, c: Contador): string[] {
  if (c.sucessos === 0) return [];
  // `QA-14`: o veredito conta as DUAS formas de chegar a P2P direto — atravessando a NAT, e não
  // havendo NAT para atravessar (IPv6). Contar só a primeira dizia "0 de 1" para a tentativa que
  // fechou pelo melhor caminho possível.
  const diretos = CLASSES_DIRETAS.reduce((s, k) => s + c.porClasse[k], 0);
  return [
    `${rot} — os ${c.sucessos} sucessos, por tipo de par:`,
    ...CLASSES.filter((k) => c.porClasse[k] > 0).map(
      (k) => `    ${String(c.porClasse[k])} · ${ROTULO_CLASSE[k]}`,
    ),
    `    => P2P direto em ${diretos} de ${c.sucessos} ` +
      `(sem NAT/IPv6: ${c.porClasse['host-direto']} · travessia de NAT: ${c.porClasse['refl-ips-diferentes']}); ` +
      `via relay em ${c.porClasse.relay}.`,
  ];
}

/** Texto pronto para colar no DECISIONS. Sem isto, o número morre na tela do celular. */
function resumo(): string {
  const l = (rot: string, c: Contador): string =>
    `${rot}: ${c.sucessos}/${c.tentativas} = ${pct(c)} · mediana ${mediana(c.temposMs)}`;
  return [
    `Medição E-4 — ${new Date().toISOString()}`,
    `timeout de M6: ${CONNECT_TIMEOUT_MS} ms · papel deste aparelho: ${papel} · índice: ${indice}`,
    l('SEM TURN            ', contadores.semTurn),
    l('CONFIG QUE VAI AO AR', contadores.comTurn),
    // `D-96`, (b): a linha aparece SEMPRE, inclusive zerada. É ela que faz `0/0` deixar de ser
    // ambíguo no texto que vira registro — `0/0` com descarte é base recusada, `0/0` sem descarte
    // é aparelho em que ninguém tocou, e ausente não é zero.
    `DESCARTADAS por configuração (fora de toda taxa): ${descartadas}`,
    ...(baseRecusada === null
      ? []
      : [`BASE RECUSADA por M6 — este aparelho não mediu nada: ${baseRecusada}`]),
    '',
    ...abertura('SEM TURN', contadores.semTurn),
    ...abertura('CONFIG QUE VAI AO AR', contadores.comTurn),
    ultimoParIndice < 0
      ? 'Última tentativa: nenhuma ainda.'
      : `Última tentativa (#${ultimoParIndice}): ${descreverPar(ultimoPar(), ipInteiro())}` +
        (ultimaLeitura === null || ultimaLeitura.motivo === '' ? '' : ` — ${ultimaLeitura.motivo}`),
    ipInteiro()
      ? 'IP INTEIRO ligado — confira antes de colar em repositório público.'
      : 'IP encurtado a 2 octetos aqui; a comparação de endereços acima usou o IP inteiro.',
    '',
    'Corte de E-4: >= 70% na configuração que vai ao ar.',
    'A taxa SEM TURN alimenta o gatilho de revisão de D-01 (reabre se < 70%).',
    'Sucesso via relay NÃO conta como P2P direto; srflx<->srflx com o MESMO IP público é hairpin',
    'e não fala de CGNAT — as duas leituras estão abertas acima, por contador.',
    'host<->host com endereços públicos de prefixos diferentes é IPv6 fim-a-fim, SEM NAT: conecta',
    'sem atravessar nada. Se o corte de 70% aceita isso como sucesso, é Q-12 e o dono decide.',
    'Rede de CADA aparelho: [preencher: operadora + 4G/5G/Wi-Fi, um por aparelho]',
    'Mesma operadora nos dois? [sim/não] — se sim, o número não fala do caso Claro x Vivo.',
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

  // Guarda de `QA-09`: índice e prefixo do ID da PRÓXIMA tentativa, para os dois aparelhos serem
  // comparados a olho antes do toque. O contador é por modo, então a linha também diz o modo —
  // dois aparelhos podem bater no índice e estar em contadores diferentes, e aí a sala coincide
  // mas a configuração medida não.
  $('sinc').textContent =
    base === ''
      ? 'sala ainda não sorteada'
      : baseRecusada !== null
        ? 'base recusada — não há próxima tentativa neste aparelho'
        : `${rodando ? 'agora' : 'próxima'}: ${rotuloDaTentativa(base, indice)} · ` +
          `${modoAtual() === 'semTurn' ? 'sem TURN' : 'com TURN'}`;

  // `D-96`, (b): o descarte é número de tela, não só de texto colável. Fica junto do placar
  // porque é o que explica um placar em `0/0` — e o guarda de `QA-09` acima é cego a esta
  // truncatura (6 caracteres da rotação coincidem em 20 de 30 índices).
  $('descartes').textContent =
    `descartadas por configuração: ${descartadas}` +
    (baseRecusada === null ? '' : ' · base recusada: nenhuma tentativa é possível neste aparelho');

  // `T-16`: o par da última tentativa, com o endereço INTEIRO — esta linha não sai do aparelho, e
  // é ela que os dois celulares comparam para saber o que a tentativa provou. O veredito vem
  // escrito ao lado porque `srflx`, `prflx` e `relay` são jargão de ICE, não resposta a `A-08`.
  $('par').textContent =
    ultimoParIndice < 0
      ? 'nenhuma tentativa ainda'
      : `#${ultimoParIndice}: ${descreverPar(ultimoPar(), true)}`;
  // O motivo anda junto do veredito por causa de `QA-13`: "par não lido" sozinho não diz se
  // faltou conexão observada, conexão viva ou par no relatório — e sem isso o defeito só aparece
  // depois de uma ida a campo inteira.
  $('classe').textContent =
    ultimoParIndice < 0
      ? ''
      : ROTULO_CLASSE[classificarPar(ultimoPar())] +
        (ultimaLeitura === null || ultimaLeitura.motivo === '' ? '' : ` · ${ultimaLeitura.motivo}`);

  const abre = (rot: string, c: Contador): string =>
    c.sucessos === 0
      ? ''
      : `<p><strong>${rot}</strong><br />` +
        CLASSES.filter((k) => c.porClasse[k] > 0)
          .map((k) => `${String(c.porClasse[k])} · ${ROTULO_CLASSE[k]}`)
          .join('<br />') +
        '</p>';
  $('classes').innerHTML =
    abre('sem TURN', contadores.semTurn) + abre('vai ao ar', contadores.comTurn);

  $<HTMLButtonElement>('tentar').disabled = rodando || base === '' || baseRecusada !== null;
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
      <div id="sinc" class="mono"></div>
      <p class="aviso">
        Os DOIS aparelhos têm de mostrar a mesma linha acima antes do toque. Diferente = salas
        diferentes: os 20 s vão expirar e entrar como falha de rede que nunca houve. Se
        desencontrar, zere os contadores nos dois.
      </p>
      <button id="tentar">Tentativa</button>
      <p class="aviso">
        Aperte nos dois aparelhos ao mesmo tempo. Uma tentativa por vez, dos dois lados.
      </p>
      <table><tbody id="placar"></tbody></table>
      <div id="descartes" class="aviso"></div>
      <div id="par" class="mono"></div>
      <div id="classe"></div>
      <div id="classes"></div>
      <p class="aviso">
        Sucesso via <strong>relay</strong> não é P2P direto. E srflx↔srflx com o MESMO IP público
        é hairpin: os dois aparelhos saem pelo mesmo endereço, e a tentativa não diz nada sobre
        atravessar o CGNAT.
      </p>
      <button class="sec" id="zerar">Zerar contadores</button>
    </fieldset>

    <fieldset>
      <legend>4 · resultado para colar</legend>
      <textarea id="resumo" readonly></textarea>
      <label><input type="checkbox" id="ipInteiro" /> IP inteiro no texto colável</label>
      <p class="aviso">
        Desligado, o texto leva só 2 octetos — o repositório é público. A comparação que decide
        hairpin roda sobre o IP inteiro de qualquer jeito; a tela acima também o mostra inteiro.
      </p>
      <button class="sec" id="copiar">Copiar</button>
    </fieldset>
  `;

  if (papel === 'guest') {
    $('salaBox').innerHTML =
      `<p>Este aparelho <strong>entra</strong> na sala:</p><p class="mono">${base}</p>`;
    // `D-96`, saída (c): a base colada é conferida AQUI, antes de o operador poder tocar em
    // "Tentativa" — é isso que faz o outro aparelho não queimar 20 s por toque, já que o
    // procedimento manda tocar nos dois ao mesmo tempo.
    conferirBase();
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
      // `QA-12`: sala nova recomeça a rotação. O convidado vai abrir o link novo numa página
      // limpa, logo no índice 0 — sem esta linha o anfitrião continuaria no índice antigo e os
      // dois nunca se encontrariam. Foi assim que o defeito apareceu em campo.
      indice = 0;
      esquecerPar();
      const alvo = `${window.location.origin}${window.location.pathname}?m=${base}`;
      $('link').innerHTML =
        `<p>Abra este endereço no OUTRO aparelho:</p><p class="mono">${alvo}</p>`;
      pintar();
    });
  }

  $('tentar').addEventListener('click', () => void rodarUma());
  $('zerar').addEventListener('click', () => {
    for (const m of ['semTurn', 'comTurn'] as Modo[]) contadores[m] = zerado();
    // Zerar é a recuperação que a própria tela manda fazer quando os dois aparelhos divergem
    // (`QA-09`). Se o índice não voltasse a 0 junto, a recuperação não recuperaria nada.
    indice = 0;
    esquecerPar();
    pintar();
  });
  $('copiar').addEventListener('click', () => {
    void navigator.clipboard?.writeText(resumo());
  });
  $('usarTurn').addEventListener('change', pintar);
  $('ipInteiro').addEventListener('change', pintar);

  pintar();
}

montar();
