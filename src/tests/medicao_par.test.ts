/**
 * Portão de `T-16` — o par de candidatos de cada tentativa da medição de E-4.
 *
 * Este arquivo **não** mede taxa de conexão nem abre canal: isso é `A-08`, do dono, com dois
 * aparelhos e rede de operadora. O que ele cobre é a leitura que torna a mesma tentativa legível —
 * se a conexão fechou por travessia real de NAT, por hairpin no mesmo endereço público, ou por
 * relay, que não é P2P direto. Sem essa separação o 5/5 de Claro×Claro continua ambíguo e o corte
 * de 70% é cobrado contra um número que não sabe o que mediu.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  CLASSES,
  ROTULO_CLASSE,
  classificarPar,
  contagemZerada,
  criarObservador,
  descreverPar,
  extrairPar,
  faixaDoIp,
  lerPar,
  mascararIp,
} from '../medicao_par';
import type { ClassePar, LadoDoPar, TipoCandidato } from '../medicao_par';

const arquivo = (nome: string): string =>
  readFileSync(fileURLToPath(new URL(nome, import.meta.url)), 'utf8');

const fonteMedicao = (): string => arquivo('../medicao.ts');

/** Endereços de documentação (RFC 5737): públicos para o classificador, de ninguém no mundo real. */
const IP_A = '192.0.2.10';
const IP_B = '198.51.100.7';

const lado = (p: Partial<LadoDoPar>): LadoDoPar => ({
  tipo: null,
  ip: null,
  protocolo: null,
  viaRelay: null,
  ...p,
});

/** Um relatório no formato que o navegador entrega: `Map` de id → objeto de stat. */
const relatorio = (
  entradas: Record<string, unknown>[],
): Map<string, Record<string, unknown>> => {
  const m = new Map<string, Record<string, unknown>>();
  for (const e of entradas) m.set(String(e['id']), e);
  return m;
};

const parChrome = (
  localTipo: TipoCandidato,
  localIp: string,
  remotoTipo: TipoCandidato,
  remotoIp: string,
): Map<string, Record<string, unknown>> =>
  relatorio([
    { id: 'T01', type: 'transport', selectedCandidatePairId: 'CP1' },
    {
      id: 'CP1',
      type: 'candidate-pair',
      transportId: 'T01',
      localCandidateId: 'IL1',
      remoteCandidateId: 'IR1',
      state: 'succeeded',
      nominated: true,
    },
    { id: 'IL1', type: 'local-candidate', candidateType: localTipo, address: localIp, protocol: 'udp' },
    { id: 'IR1', type: 'remote-candidate', candidateType: remotoTipo, address: remotoIp, protocol: 'udp' },
  ]);

describe('T-16 · extrair o par selecionado do getStats', () => {
  it('segue o selectedCandidatePairId do transport — o caminho padronizado', () => {
    const par = extrairPar(parChrome('srflx', IP_A, 'srflx', IP_B));

    expect(par).not.toBeNull();
    expect(par?.local).toEqual(lado({ tipo: 'srflx', ip: IP_A, protocolo: 'udp' }));
    expect(par?.remoto).toEqual(lado({ tipo: 'srflx', ip: IP_B, protocolo: 'udp' }));
  });

  it('ignora o par que NÃO é o selecionado, mesmo estando no relatório', () => {
    // ICE deixa vários pares no relatório; ler o primeiro que aparece é a forma silenciosa de
    // reportar uma rota que não foi usada.
    const r = parChrome('srflx', IP_A, 'srflx', IP_B);
    r.set('CP0', {
      id: 'CP0',
      type: 'candidate-pair',
      localCandidateId: 'IL0',
      remoteCandidateId: 'IR0',
      state: 'failed',
    });
    r.set('IL0', { id: 'IL0', type: 'local-candidate', candidateType: 'relay', address: '203.0.113.9' });
    r.set('IR0', { id: 'IR0', type: 'remote-candidate', candidateType: 'relay', address: '203.0.113.9' });

    expect(extrairPar(r)?.local.tipo).toBe('srflx');
  });

  it('sem transport, cai para nominated + succeeded', () => {
    const r = parChrome('srflx', IP_A, 'relay', IP_B);
    r.delete('T01');

    expect(extrairPar(r)?.remoto.tipo).toBe('relay');
  });

  it('sem transport e sem nominated, cai para selected === true', () => {
    const r = parChrome('host', IP_A, 'host', IP_B);
    r.delete('T01');
    const cp = r.get('CP1');
    if (cp === undefined) throw new Error('fixture sem candidate-pair');
    delete cp['nominated'];
    cp['selected'] = true;

    expect(extrairPar(r)?.local.tipo).toBe('host');
  });

  it('aceita `ip` no lugar de `address` — navegador mais velho', () => {
    const r = parChrome('srflx', IP_A, 'srflx', IP_B);
    const c = r.get('IL1');
    if (c === undefined) throw new Error('fixture sem local-candidate');
    delete c['address'];
    c['ip'] = '203.0.113.5';

    expect(extrairPar(r)?.local.ip).toBe('203.0.113.5');
  });

  it('traz o relayProtocol quando o lado é relay', () => {
    const r = parChrome('relay', IP_A, 'srflx', IP_B);
    const c = r.get('IL1');
    if (c === undefined) throw new Error('fixture sem local-candidate');
    c['relayProtocol'] = 'udp';

    expect(extrairPar(r)?.local.viaRelay).toBe('udp');
  });

  it('relatório vazio, nulo ou indefinido devolve null — nunca um par vazio', () => {
    // É a diferença entre "não li" e "li e não havia nada". Um par de campos nulos passaria pela
    // classificação como se fosse leitura de verdade.
    expect(extrairPar(relatorio([]))).toBeNull();
    expect(extrairPar(null)).toBeNull();
    expect(extrairPar(undefined)).toBeNull();
  });

  it('par selecionado apontando para candidato ausente devolve campos nulos, não inventa', () => {
    const r = parChrome('srflx', IP_A, 'srflx', IP_B);
    r.delete('IR1');

    const par = extrairPar(r);

    expect(par).not.toBeNull();
    expect(par?.remoto).toEqual(lado({}));
    expect(par?.local.tipo).toBe('srflx');
  });

  it('candidateType desconhecido vira null, não um dos quatro tipos', () => {
    const r = parChrome('srflx', IP_A, 'srflx', IP_B);
    const c = r.get('IR1');
    if (c === undefined) throw new Error('fixture sem remote-candidate');
    c['candidateType'] = 'inventado';

    expect(extrairPar(r)?.remoto.tipo).toBeNull();
  });
});

describe('T-16 · classificar o par é responder o que a tentativa provou', () => {
  const par = (l: Partial<LadoDoPar>, r: Partial<LadoDoPar>): ClassePar =>
    classificarPar({ local: lado(l), remoto: lado(r) });

  it('srflx↔srflx com IPs públicos DIFERENTES é travessia real de NAT', () => {
    expect(par({ tipo: 'srflx', ip: IP_A }, { tipo: 'srflx', ip: IP_B })).toBe('refl-ips-diferentes');
  });

  it('srflx↔srflx com o MESMO IP público é hairpin, e é a leitura que faltava', () => {
    // O caso exato que torna o 5/5 de Claro×Claro ambíguo: conectou, mas os dois aparelhos saem
    // pelo mesmo endereço, então a tentativa não atravessou NAT nenhuma.
    expect(par({ tipo: 'srflx', ip: IP_A }, { tipo: 'srflx', ip: IP_A })).toBe('refl-mesmo-ip');
  });

  it('srflx↔srflx sem endereço legível não vira nem uma coisa nem outra', () => {
    expect(par({ tipo: 'srflx', ip: null }, { tipo: 'srflx', ip: IP_B })).toBe('refl-sem-ip');
    expect(par({ tipo: 'srflx', ip: IP_A }, { tipo: 'srflx', ip: null })).toBe('refl-sem-ip');
  });

  it('prflx conta como reflexivo — o endereço também veio de fora da NAT', () => {
    expect(par({ tipo: 'prflx', ip: IP_A }, { tipo: 'srflx', ip: IP_B })).toBe('refl-ips-diferentes');
    expect(par({ tipo: 'prflx', ip: IP_A }, { tipo: 'prflx', ip: IP_A })).toBe('refl-mesmo-ip');
  });

  it('UM lado em relay já basta para o par ser relay', () => {
    // O tráfego passa pelo relay de qualquer forma. Contar isto junto com P2P direto é o erro que
    // faria a taxa "com TURN" parecer prova de conexão direta.
    expect(par({ tipo: 'relay', ip: IP_A }, { tipo: 'srflx', ip: IP_B })).toBe('relay');
    expect(par({ tipo: 'srflx', ip: IP_A }, { tipo: 'relay', ip: IP_B })).toBe('relay');
    expect(par({ tipo: 'relay', ip: IP_A }, { tipo: 'relay', ip: IP_A })).toBe('relay');
  });

  it('host↔host é mesma rede local, e não fala de NAT', () => {
    expect(par({ tipo: 'host', ip: '192.168.0.5' }, { tipo: 'host', ip: '192.168.0.9' })).toBe('host');
  });

  it('combinação sem leitura clara cai em misto, nunca no caso favorável', () => {
    expect(par({ tipo: 'host', ip: IP_A }, { tipo: 'srflx', ip: IP_B })).toBe('misto');
    expect(par({ tipo: null, ip: IP_A }, { tipo: 'srflx', ip: IP_B })).toBe('misto');
  });

  it('par ausente é `ausente`, e ausente não é zero', () => {
    expect(classificarPar(null)).toBe('ausente');
  });

  it('a comparação é do IP inteiro, não do mascarado', () => {
    // Dois assinantes do mesmo bloco da operadora têm a MESMA máscara. Comparar máscara diria
    // "hairpin" para uma travessia real — o falso negativo mais caro possível para `A-08`.
    const a = '192.0.2.10';
    const b = '192.0.2.200';

    expect(mascararIp(a)).toBe(mascararIp(b));
    expect(par({ tipo: 'srflx', ip: a }, { tipo: 'srflx', ip: b })).toBe('refl-ips-diferentes');
  });

  it('toda combinação de tipo e IP cai em exatamente uma classe conhecida', () => {
    // É o invariante que sustenta a contagem: `porClasse` soma 1 por sucesso, então a soma das
    // classes só bate com `sucessos` se a classificação for total e determinística.
    const tipos: (TipoCandidato | null)[] = ['host', 'srflx', 'prflx', 'relay', null];
    const ips: (string | null)[] = [IP_A, IP_B, null];

    for (const tl of tipos) {
      for (const tr of tipos) {
        for (const il of ips) {
          for (const ir of ips) {
            const c = par({ tipo: tl, ip: il }, { tipo: tr, ip: ir });

            expect(CLASSES).toContain(c);
            expect(par({ tipo: tl, ip: il }, { tipo: tr, ip: ir })).toBe(c);
          }
        }
      }
    }
  });

  it('toda classe tem rótulo, e o rótulo entrega a conclusão em português', () => {
    // O portão de `T-16` é o dono não interpretar nada. Classe sem rótulo é jargão de ICE na cara
    // de quem cola o resumo.
    for (const c of CLASSES) {
      expect(ROTULO_CLASSE[c]).toBeTruthy();
      expect(ROTULO_CLASSE[c]).not.toBe(c);
    }
    expect(new Set(CLASSES).size).toBe(CLASSES.length);
    expect(Object.keys(ROTULO_CLASSE).sort()).toEqual([...CLASSES].sort());
  });

  it('a contagem nasce zerada em TODAS as classes', () => {
    const z = contagemZerada();

    expect(Object.keys(z).sort()).toEqual([...CLASSES].sort());
    for (const c of CLASSES) expect(z[c]).toBe(0);
  });
});

describe('T-16 · faixa do endereço', () => {
  it('reconhece a faixa de CGNAT, que é a evidência que A-08 persegue', () => {
    expect(faixaDoIp('100.64.0.0')).toBe('cgnat');
    expect(faixaDoIp('100.127.255.255')).toBe('cgnat');
    // As bordas de fora, porque /10 não é /8 nem /16 e errar isso inventaria CGNAT onde não há.
    expect(faixaDoIp('100.63.255.255')).toBe('publico');
    expect(faixaDoIp('100.128.0.0')).toBe('publico');
  });

  it('reconhece as faixas privadas nas bordas certas', () => {
    expect(faixaDoIp('10.0.0.1')).toBe('privado');
    expect(faixaDoIp('192.168.1.1')).toBe('privado');
    expect(faixaDoIp('172.16.0.1')).toBe('privado');
    expect(faixaDoIp('172.31.255.255')).toBe('privado');
    expect(faixaDoIp('172.15.0.1')).toBe('publico');
    expect(faixaDoIp('172.32.0.1')).toBe('publico');
    expect(faixaDoIp('169.254.1.1')).toBe('privado');
    // A Trystero reescreve candidato `.local` para 127.0.0.1 antes de assinar.
    expect(faixaDoIp('127.0.0.1')).toBe('privado');
  });

  it('nome mDNS não é endereço', () => {
    expect(faixaDoIp('4f2a1b3c-0000-0000-0000-000000000000.local')).toBe('mdns');
  });

  it('IPv6: link-local e ULA são privados, o resto é público', () => {
    expect(faixaDoIp('fe80::1')).toBe('privado');
    expect(faixaDoIp('fd12:3456::1')).toBe('privado');
    expect(faixaDoIp('::1')).toBe('privado');
    expect(faixaDoIp('2001:db8::1')).toBe('publico');
  });

  it('o que não é reconhecido sai como desconhecido, nunca como público por descarte', () => {
    // Chamar de público o que não se reconhece é a forma mais barata de inventar dado.
    expect(faixaDoIp(null)).toBe('desconhecido');
    expect(faixaDoIp('300.1.2.3')).toBe('desconhecido');
    expect(faixaDoIp('nada disso')).toBe('desconhecido');
  });
});

describe('T-16 · o texto colável não publica o endereço do dono', () => {
  it('IPv4 sai com dois octetos e perde os dois últimos', () => {
    expect(mascararIp('189.45.200.31')).toBe('189.45.x.x');
  });

  it('a máscara nunca contém o endereço inteiro, em nenhuma forma testada', () => {
    // O repositório é público (`D-21`) e o resumo nasce para virar linha de registro.
    const casos = ['189.45.200.31', '10.0.0.1', '100.64.3.7', '2804:14c:1:2::9', 'abc.local'];

    for (const ip of casos) {
      expect(mascararIp(ip)).not.toContain(ip);
    }
    expect(mascararIp(null)).toBe('—');
  });

  it('nome mDNS não vaza: é identificador estável do aparelho', () => {
    expect(mascararIp('4f2a1b3c-0000-0000-0000-000000000000.local')).toBe('(mDNS)');
  });

  it('descreverPar mascara quando pedido e mostra inteiro quando pedido', () => {
    const p = { local: lado({ tipo: 'srflx', ip: '189.45.200.31' }), remoto: lado({ tipo: 'srflx', ip: IP_B }) };

    expect(descreverPar(p, false)).toContain('189.45.x.x');
    expect(descreverPar(p, false)).not.toContain('189.45.200.31');
    expect(descreverPar(p, true)).toContain('189.45.200.31');
  });

  it('descreverPar diz a faixa junto do endereço, e diz quando não houve par', () => {
    const p = { local: lado({ tipo: 'srflx', ip: '100.64.1.2' }), remoto: lado({ tipo: 'srflx', ip: IP_B }) };

    expect(descreverPar(p, true)).toContain('CGNAT');
    expect(descreverPar(null, true)).toBe('par não lido');
  });
});

describe('T-16 · o observador chega ao getStats sem M6 mudar um byte', () => {
  class Falsa {
    public readonly cfg: unknown;

    public constructor(cfg?: unknown) {
      this.cfg = cfg;
    }

    public static marca(): string {
      return 'estático preservado';
    }
  }

  it('guarda toda instância criada, na ordem, e repassa os argumentos', () => {
    const o = criarObservador(Falsa);
    const a = new o.Observada({ n: 1 });
    const b = new o.Observada({ n: 2 });

    expect(o.pcs).toEqual([a, b]);
    expect(o.pcs[0]?.cfg).toEqual({ n: 1 });
  });

  it('a instância é indistinguível de uma criada sem instrumento', () => {
    // A condição para a medição continuar medindo a rede, e não o instrumento: é por isso que o
    // embrulho é `Proxy` sobre `construct`, e não uma subclasse.
    const o = criarObservador(Falsa);
    const inst = new o.Observada();

    expect(inst).toBeInstanceOf(Falsa);
    expect(inst.constructor).toBe(Falsa);
    expect(o.Observada.marca()).toBe('estático preservado');
  });

  it('limpar esvazia a lista — cada tentativa vê só as conexões dela', () => {
    // Sem isto, o par lido poderia ser o da tentativa anterior, que rodou em outra sala e talvez
    // em outro modo.
    const o = criarObservador(Falsa);
    new o.Observada();
    o.limpar();

    expect(o.pcs).toHaveLength(0);
  });

  it('lerPar devolve o primeiro par encontrado', async () => {
    const vazia = { getStats: (): Promise<Map<string, Record<string, unknown>>> => Promise.resolve(relatorio([])) };
    const cheia = { getStats: (): Promise<Map<string, Record<string, unknown>>> => Promise.resolve(parChrome('srflx', IP_A, 'srflx', IP_B)) };

    expect((await lerPar([vazia, cheia]))?.local.ip).toBe(IP_A);
  });

  it('getStats que estoura não derruba a leitura, e não passa calado', async () => {
    // Falha do INSTRUMENTO não pode virar falha de conexão na planilha — seria o viés de `QA-08`
    // por uma terceira porta. Mas erro engolido em silêncio é bug, não resiliência.
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const quebrada = { getStats: (): Promise<never> => Promise.reject(new Error('conexão fechada')) };
    const boa = { getStats: (): Promise<Map<string, Record<string, unknown>>> => Promise.resolve(parChrome('relay', IP_A, 'srflx', IP_B)) };

    const par = await lerPar([quebrada, boa]);

    expect(par?.local.tipo).toBe('relay');
    expect(aviso).toHaveBeenCalledOnce();
    aviso.mockRestore();
  });

  it('nenhuma conexão com par devolve null, que é contado como ausente', async () => {
    const vazia = { getStats: (): Promise<Map<string, Record<string, unknown>>> => Promise.resolve(relatorio([])) };

    expect(await lerPar([vazia])).toBeNull();
    expect(classificarPar(await lerPar([]))).toBe('ausente');
  });
});

/**
 * Portões de origem, cobrados por leitura do disco — o mesmo recurso de `medicao.test.ts`.
 *
 * O que estes prendem não é lógica de função: é **onde** a leitura acontece. Ler os candidatos
 * depois de fechar o canal, ou instrumentar M6 em vez do global do navegador, são defeitos que
 * passam em todo teste de unidade e reprovam o portão do dono.
 */
describe('T-16 · portões de origem', () => {
  it('src/net/index.ts não sabe que está sendo medido', () => {
    // A restrição literal de `T-15` e `T-16`: M6 não muda um byte. Se o instrumento vazar para
    // dentro dele, este teste reprova antes de o dono precisar conferir o diff.
    const m6 = arquivo('../net/index.ts');
    // `RTCPeerConnection` aparece uma vez em M6, dentro do comentário de `setSignalingLoader`, e
    // aparecia antes de `T-16` existir. O que não pode aparecer é CÓDIGO: por isso a contagem é de
    // linhas executáveis, e não do arquivo inteiro.
    const emCodigo = m6
      .split('\n')
      .filter((l) => !/^\s*(\/\*|\*|\/\/)/.test(l))
      .join('\n');

    expect(emCodigo).not.toContain('getStats');
    expect(emCodigo).not.toContain('RTCPeerConnection');
    expect(emCodigo).not.toContain('medicao');
  });

  it('a via é o global do navegador, e o global é embrulhado antes de qualquer canal', () => {
    const src = fonteMedicao();
    const antesDeMontar = src.slice(0, src.indexOf('function montar('));

    expect(antesDeMontar).toContain('globalThis.RTCPeerConnection = observador.Observada');
    expect(src).not.toContain('hostRoom(ice');
  });

  it('o par é lido ANTES de fechar o canal', () => {
    // Fechar solta a sala e mata a conexão: lido depois, o relatório vem vazio e o par viraria
    // `ausente` — dado perdido com cara de dado ausente.
    const src = fonteMedicao();
    const corpo = src.slice(src.indexOf('function tentativa('), src.indexOf('async function rodarUma'));
    const posLeitura = corpo.indexOf('await lerPar(');
    const posFecha = corpo.indexOf('canal.close()');

    expect(posLeitura).toBeGreaterThan(-1);
    expect(posFecha).toBeGreaterThan(posLeitura);
  });

  it('o tempo da tentativa é fechado antes da leitura dos candidatos', () => {
    // `getStats()` é assíncrono; dentro da conta, ele entraria na mediana como tempo de conexão.
    const src = fonteMedicao();
    const corpo = src.slice(src.indexOf('function tentativa('), src.indexOf('async function rodarUma'));

    expect(corpo.indexOf('const ms = Math.round')).toBeLessThan(corpo.indexOf('await lerPar('));
  });

  it('só sucesso é aberto por classe, e a classe sai de classificarPar', () => {
    const src = fonteMedicao();
    const corpo = src.slice(src.indexOf('async function rodarUma'), src.indexOf('const pct ='));

    expect(corpo).toContain('c.porClasse[classificarPar(par)] += 1');
    expect(corpo.indexOf('c.porClasse[classificarPar(par)] += 1')).toBeGreaterThan(corpo.indexOf('if (ok)'));
  });

  it('o resumo colável separa relay de srflx↔srflx sem o dono interpretar', () => {
    const src = fonteMedicao();
    const corpo = src.slice(src.indexOf('function resumo('), src.indexOf('function pintar('));

    expect(corpo).toContain('abertura(');
    expect(corpo).toContain('ultimoPar');
  });

  it('o resumo mascara o IP por padrão; mostrar inteiro é escolha explícita', () => {
    const src = fonteMedicao();

    expect(src).toContain('descreverPar(ultimoPar, ipInteiro())');
    // A tela mostra inteiro, porque ela não sai do aparelho.
    expect(src).toContain('descreverPar(ultimoPar, true)');
    // Caixa desmarcada na montagem: `checked` aqui inverteria o padrão sem ninguém notar.
    expect(src).toMatch(/id="ipInteiro"\s*\/>/);
  });

  it('sala nova e zerar contadores esquecem o par exibido junto com o índice', () => {
    const src = fonteMedicao();
    const abrir = src.slice(src.indexOf("$('abrir').addEventListener"), src.indexOf("$('tentar').addEventListener"));
    const zerar = src.slice(src.indexOf("$('zerar').addEventListener"), src.indexOf("$('copiar').addEventListener"));

    // O rótulo diz `#N`; depois do reinício aquele `#N` aponta para outra tentativa.
    expect(abrir).toContain('esquecerPar()');
    expect(zerar).toContain('esquecerPar()');
  });

  it('pintar escreve o par nos dois papéis, fora do bloco que separa anfitrião de convidado', () => {
    const src = fonteMedicao();
    const corpoPintar = src.slice(src.indexOf('function pintar('), src.indexOf('function montar('));

    expect(corpoPintar).toContain("$('par').textContent");
    expect(corpoPintar).toContain("$('classe').textContent");
    expect(corpoPintar).not.toContain("papel === 'guest'");
  });
});
