/**
 * Leitura do **par de candidatos ICE** de cada tentativa da medição de E-4 (`T-16`).
 *
 * **O problema que este módulo resolve.** Até `T-15` cada tentativa valia 1 bit — `ok`/`ms` — e
 * o 5/5 de Claro×Claro da 1ª ida a campo é ambíguo nos dois sentidos: se fechou por `srflx↔srflx`
 * com IPs públicos DIFERENTES houve travessia real de NAT; se os dois aparelhos saíram pelo mesmo
 * endereço público (hairpin no mesmo pool), o 5/5 **não fala de CGNAT** e não vale para o corte de
 * 70%. O dado que separa os dois casos existe no navegador e estava sendo jogado fora.
 *
 * **Por que é um módulo separado, e puro.** Mesmo motivo de `medicao_sala.ts` em `T-15`:
 * `medicao.ts` é entrada de página (chama `montar()` na última linha, mexe em `document`, importa
 * M6), então importá-lo de um teste executaria a página inteira. Aqui não há DOM, não há `src/net`
 * e não há estado de módulo — a extração e a classificação são exercitadas sobre relatórios de
 * `getStats()` montados à mão, sem abrir um canal sequer.
 *
 * **`src/net/index.ts` não muda um byte** (restrição de `T-15`, repetida em `T-16`). `Channel` tem
 * quatro métodos e nenhum devolve a `RTCPeerConnection` — expor uma quinta porta é exatamente o que
 * `D-39` e `D-40` recusaram. A via usada aqui é `criarObservador`, que embrulha o **construtor
 * global** do navegador: a Trystero constrói com `new (rtcPolyfill ?? RTCPeerConnection)(...)`,
 * lendo o global no momento da chamada, então quem embrulha antes vê toda instância criada. M6
 * segue sem saber que está sendo medido, que é a única forma de o instrumento não virar parte do
 * módulo que ele mede.
 */

/** Os quatro tipos que o ICE dá a um candidato. `null` = o relatório não trouxe o campo. */
export type TipoCandidato = 'host' | 'srflx' | 'prflx' | 'relay';

/**
 * Faixa do endereço, porque "IP público" é conclusão e não leitura.
 *
 * `cgnat` é a faixa compartilhada 100.64.0.0/10 (RFC 6598) — vê-la num candidato é a evidência
 * direta de CGNAT que `A-08` persegue. `mdns` existe porque o navegador troca o endereço local por
 * um nome `.local` para não vazar a rede do usuário, e a Trystero reescreve esse caso para
 * 127.0.0.1 antes de assinar — nos dois casos não há endereço para comparar, e dizer isso é
 * diferente de dizer que os endereços batem.
 */
export type FaixaIp = 'publico' | 'cgnat' | 'privado' | 'mdns' | 'desconhecido';

/** Um lado do par. Todo campo é anulável de propósito: ausente e zero são coisas diferentes. */
export interface LadoDoPar {
  tipo: TipoCandidato | null;
  ip: string | null;
  protocolo: string | null;
  /** `relayProtocol` — só o lado `relay` o tem, e ele diz por qual transporte o relay saiu. */
  viaRelay: string | null;
}

export interface ParSelecionado {
  local: LadoDoPar;
  remoto: LadoDoPar;
}

/**
 * O que a tentativa PROVA, que é a pergunta de `A-08` — não o que ela parece.
 *
 * Sucesso não é uma coisa só: `relay` conecta quase sempre e **não é P2P direto**, `host↔host` só
 * diz que os dois estavam na mesma rede local, e `srflx↔srflx` só fala de travessia de NAT quando
 * os dois endereços públicos são diferentes.
 */
export type ClassePar =
  | 'relay'
  | 'refl-ips-diferentes'
  | 'refl-mesmo-ip'
  | 'refl-sem-ip'
  | 'host'
  | 'misto'
  | 'ausente';

/** Ordem fixa de exibição: da evidência mais forte para a mais fraca. */
export const CLASSES: readonly ClassePar[] = [
  'refl-ips-diferentes',
  'refl-mesmo-ip',
  'refl-sem-ip',
  'relay',
  'host',
  'misto',
  'ausente',
];

/**
 * O rótulo já traz a conclusão porque o portão de `T-16` é o dono **não ter de interpretar nada**.
 * Um resumo que diz `srflx↔srflx` e deixa a leitura por conta de quem cola é meio instrumento.
 */
export const ROTULO_CLASSE: Record<ClassePar, string> = {
  'refl-ips-diferentes': 'travessia real de NAT (srflx↔srflx, IPs públicos diferentes)',
  'refl-mesmo-ip': 'hairpin (srflx↔srflx, MESMO IP público — não fala de CGNAT)',
  'refl-sem-ip': 'srflx↔srflx sem endereço legível (não dá para comparar)',
  relay: 'via relay — NÃO é P2P direto',
  host: 'host↔host (mesma rede local — não fala de NAT)',
  misto: 'par misto (ver a linha da última tentativa)',
  ausente: 'par não lido',
};

const ROTULO_FAIXA: Record<FaixaIp, string> = {
  publico: 'público',
  cgnat: 'CGNAT 100.64/10',
  privado: 'privado',
  mdns: 'mDNS',
  desconhecido: '?',
};

/** `srflx` e `prflx` são os dois reflexivos: em ambos o endereço visto veio de fora da NAT. */
const REFLEXIVOS: readonly TipoCandidato[] = ['srflx', 'prflx'];

const registro = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;

const texto = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

const octetos = (ip: string): number[] | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (m === null) return null;
  const n = m.slice(1).map((s) => Number(s));
  return n.every((x) => x >= 0 && x <= 255) ? n : null;
};

/**
 * Classifica o endereço pela faixa. **Não** é validação: endereço que não casa com nada conhecido
 * sai como `desconhecido`, nunca como `publico` por descarte — chamar de público o que não se
 * reconhece é a forma mais barata de inventar dado.
 */
export function faixaDoIp(ip: string | null): FaixaIp {
  if (ip === null) return 'desconhecido';
  if (ip.endsWith('.local')) return 'mdns';

  const o = octetos(ip);
  if (o !== null) {
    const [a, b] = o as [number, number, number, number];
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return 'privado';
    }
    if (a === 169 && b === 254) return 'privado';
    if (a === 100 && b >= 64 && b <= 127) return 'cgnat';
    return 'publico';
  }

  if (ip.includes(':')) {
    const l = ip.toLowerCase();
    if (l === '::1' || l.startsWith('fe80') || l.startsWith('fc') || l.startsWith('fd')) {
      return 'privado';
    }
    return 'publico';
  }
  return 'desconhecido';
}

/**
 * Endereço encurtado para o texto que o dono COLA.
 *
 * O repositório é público (`D-21`) e o resumo nasce para virar linha de registro: o endereço
 * inteiro do aparelho do dono não precisa entrar no git para a pergunta ser respondida. Quem
 * responde a pergunta é a comparação — feita aqui dentro, sobre o endereço inteiro — e não o
 * endereço. Ficam dois octetos, que dizem o bloco da operadora sem apontar o assinante; a tela
 * mostra o endereço inteiro, porque ela não sai do aparelho.
 */
export function mascararIp(ip: string | null): string {
  if (ip === null) return '—';
  if (ip.endsWith('.local')) return '(mDNS)';

  const o = octetos(ip);
  if (o !== null) return `${String(o[0])}.${String(o[1])}.x.x`;

  if (ip.includes(':')) {
    const g = ip.split(':');
    return `${g[0] ?? ''}:${g[1] ?? ''}:…`;
  }
  return '(?)';
}

/**
 * Extrai o par selecionado de um relatório de `getStats()`.
 *
 * Devolve `null` quando não há par — navegador sem os campos, tentativa que falhou, ou leitura
 * feita depois de a conexão fechar. `null` vira a classe `ausente` e é contado como tal; nunca é
 * trocado por um par vazio que passaria por leitura de verdade.
 *
 * A ordem de busca segue o que os navegadores realmente publicam: `transport.selectedCandidatePairId`
 * é o caminho padronizado; `selected` e `nominated` são as saídas mais velhas, e ficam como
 * alternativa porque a medição roda no celular do dono, não num navegador escolhido por mim.
 */
export function extrairPar(stats: RelatorioDeStats | null | undefined): ParSelecionado | null {
  if (stats === null || stats === undefined || typeof stats.forEach !== 'function') return null;

  const indice = new Map<string, Record<string, unknown>>();
  const todos: Record<string, unknown>[] = [];
  stats.forEach((valor, chave) => {
    const s = registro(valor);
    if (s === null) return;
    indice.set(chave, s);
    todos.push(s);
  });

  const pares = todos.filter((s) => s['type'] === 'candidate-pair');
  const porId = (id: string | null): Record<string, unknown> | null =>
    id === null ? null : (indice.get(id) ?? null);

  let par: Record<string, unknown> | null = null;
  for (const t of todos) {
    if (t['type'] !== 'transport') continue;
    const p = porId(texto(t['selectedCandidatePairId']));
    if (p !== null) {
      par = p;
      break;
    }
  }
  par ??=
    pares.find((p) => p['selected'] === true) ??
    pares.find((p) => p['nominated'] === true && p['state'] === 'succeeded') ??
    pares.find((p) => p['state'] === 'succeeded') ??
    null;

  if (par === null) return null;

  const lado = (chave: string): LadoDoPar => {
    const c = porId(texto(par?.[chave]));
    const t = c?.['candidateType'];
    return {
      tipo: t === 'host' || t === 'srflx' || t === 'prflx' || t === 'relay' ? t : null,
      ip: c === null || c === undefined ? null : (texto(c['address']) ?? texto(c['ip'])),
      protocolo: c === null || c === undefined ? null : texto(c['protocol']),
      viaRelay: c === null || c === undefined ? null : texto(c['relayProtocol']),
    };
  };

  return { local: lado('localCandidateId'), remoto: lado('remoteCandidateId') };
}

/**
 * De par a veredito.
 *
 * `relay` vem primeiro de propósito: um lado em relay já basta para o tráfego não ser direto, e
 * contá-lo junto do resto é o erro que faria a taxa "com TURN" parecer prova de P2P.
 *
 * A comparação de endereços é feita sobre o valor **inteiro** — o mascaramento é só do texto que
 * sai. Comparar máscaras diria "mesmo IP" para dois assinantes do mesmo bloco da operadora, que é
 * precisamente o falso hairpin que este módulo existe para não produzir.
 */
export function classificarPar(p: ParSelecionado | null): ClassePar {
  if (p === null) return 'ausente';
  const { local, remoto } = p;

  if (local.tipo === 'relay' || remoto.tipo === 'relay') return 'relay';
  if (local.tipo === null || remoto.tipo === null) return 'misto';
  if (local.tipo === 'host' && remoto.tipo === 'host') return 'host';

  if (REFLEXIVOS.includes(local.tipo) && REFLEXIVOS.includes(remoto.tipo)) {
    if (local.ip === null || remoto.ip === null) return 'refl-sem-ip';
    return local.ip === remoto.ip ? 'refl-mesmo-ip' : 'refl-ips-diferentes';
  }
  return 'misto';
}

/**
 * O relatório de `getStats()`, pelo mínimo que ele garante: `forEach`.
 *
 * **Não é `ReadonlyMap`, e o motivo é do `lib.dom`:** ali `RTCStatsReport` declara só `forEach`,
 * embora todo navegador entregue um objeto com `get` e `values`. Tipar pelo que a plataforma
 * promete — e não pelo que ela hoje entrega — faz o índice ser montado aqui dentro, o que de
 * quebra deixa um `Map` comum servir de duplo no teste sem nenhum `as`.
 */
export interface RelatorioDeStats {
  forEach(cb: (valor: unknown, chave: string) => void): void;
}

/** O que a medição precisa de uma `RTCPeerConnection`, e nada além disso. */
export interface ComStats {
  getStats(): Promise<RelatorioDeStats>;
}

/** Qualquer construtor. O genérico é o construtor INTEIRO, e não a instância — ver abaixo. */
export type Construtor = new (...args: never[]) => object;

export interface Observador<C extends Construtor> {
  /**
   * O construtor embrulhado — vai para o global no lugar do original.
   *
   * O tipo é `C`, o mesmo do original, e isso não é conveniência: se fosse um construtor genérico,
   * atribuí-lo de volta ao global exigiria um `as` no ponto de instalação, e o `as` calaria
   * justamente o erro que importa — o dia em que o embrulho deixar de servir como a coisa
   * embrulhada.
   */
  Observada: C;
  /** As instâncias criadas desde o último `limpar()`, na ordem de criação. */
  pcs: readonly InstanceType<C>[];
  limpar(): void;
}

/**
 * Embrulha um construtor para guardar toda instância que ele criar.
 *
 * **É a única via até `getStats()` que não toca em M6.** `Channel` expõe quatro métodos e nenhum
 * devolve a conexão; acrescentar o quinto é a porta congelada de `D-13`, que `D-39` e `D-40` já
 * custaram uma auditoria para não abrir. Aqui a medição embrulha o **global do navegador**, que
 * não é porta de módulo nenhum: a Trystero faz `new (rtcPolyfill ?? RTCPeerConnection)(...)` lendo
 * o global no momento da chamada, então quem embrulha antes da primeira tentativa vê tudo.
 *
 * **`Proxy` e não `class extends`, de propósito:** a armadilha do `extends` é a herança parcial —
 * `instanceof` continua valendo, mas o construtor embrulhado passa a ser um objeto novo, e
 * qualquer código que compare identidade de construtor ou leia um estático raro passa a ver outra
 * coisa. O `Proxy` intercepta só `construct` e deixa o resto do objeto ser o original, o que
 * mantém a instância indistinguível de uma criada sem instrumento — que é a condição para a
 * medição continuar medindo a rede, e não o instrumento.
 *
 * **Só o instrumento paga por isto.** `medicao.ts` é uma entrada de página separada (`D-33`),
 * inalcançável a partir de `index.html`: o jogo nunca carrega este arquivo e nunca vê o global
 * embrulhado.
 */
export function criarObservador<C extends Construtor>(Base: C): Observador<C> {
  const pcs: InstanceType<C>[] = [];
  const Observada = new Proxy(Base, {
    construct(alvo, args, novoAlvo): object {
      const inst = Reflect.construct(alvo, args, novoAlvo) as InstanceType<C>;
      pcs.push(inst);
      return inst;
    },
  });
  return {
    Observada,
    pcs,
    limpar: (): void => {
      pcs.length = 0;
    },
  };
}

/**
 * Lê o par da primeira conexão que tiver um.
 *
 * **Nunca lança e nunca engole calado:** `getStats()` pode falhar (conexão já fechada, navegador
 * sem o campo), e uma falha de leitura do instrumento não pode virar falha de conexão na planilha
 * — seria o viés de `QA-08` por uma terceira porta. O que ela devolve nesse caso é `null`, que a
 * classificação conta como `ausente`, e o motivo vai para o console.
 */
export async function lerPar(pcs: readonly ComStats[]): Promise<ParSelecionado | null> {
  for (const pc of pcs) {
    try {
      const par = extrairPar(await pc.getStats());
      if (par !== null) return par;
    } catch (e: unknown) {
      console.warn(`[T-16] getStats falhou nesta conexão: ${String(e)}`);
    }
  }
  return null;
}

/** Contagem por classe zerada. Existe para "zerar contadores" não esquecer uma classe nova. */
export function contagemZerada(): Record<ClassePar, number> {
  const c = {} as Record<ClassePar, number>;
  for (const k of CLASSES) c[k] = 0;
  return c;
}

/**
 * Uma linha legível do par. `inteiro = false` mascara o endereço — é a forma que vai para o texto
 * colável; a tela chama com `true`, porque ali o dado não sai do aparelho.
 */
export function descreverPar(p: ParSelecionado | null, inteiro: boolean): string {
  if (p === null) return 'par não lido';

  const um = (l: LadoDoPar): string => {
    const end = l.ip === null ? '—' : inteiro ? l.ip : mascararIp(l.ip);
    const via = l.viaRelay === null ? '' : ` via ${l.viaRelay}`;
    return `${l.tipo ?? '?'}(${end}, ${ROTULO_FAIXA[faixaDoIp(l.ip)]}${via})`;
  };

  const proto = p.local.protocolo ?? p.remoto.protocolo;
  return `${um(p.local)} ↔ ${um(p.remoto)}${proto === null ? '' : ` · ${proto}`}`;
}
