import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LISTA_MORTA } from './lista_morta';
import {
  CATALOG_IS_FIXTURE,
  FLAG_PENDENTE,
  NAME_EXCEPTIONS,
  assertCatalogCode,
  buildCatalog,
  findTeam,
  listTeams,
  type Team,
} from '../data/teams';

const AQUI = resolve(fileURLToPath(import.meta.url), '..');
const FONTE_M4 = resolve(AQUI, '..', 'data', 'teams.ts');
const DIR_BANDEIRAS = resolve(AQUI, '..', 'assets', 'flags');
const LICENCIAMENTO = resolve(
  AQUI,
  '..',
  '..',
  '77777777_TAPGO_Project_DOCs',
  'a_context',
  'licenciamento.md',
);

/**
 * O único nome digitado que o catálogo tem direito de conter (`D-52`).
 *
 * Escrito aqui por extenso de propósito: "o teste diz qual" é o portão. Lê-lo do próprio módulo
 * faria o teste concordar com qualquer literal que alguém acrescentasse lá.
 */
const LITERAL_ESPERADO = { code: 'GB-ENG', name: 'Inglaterra' } as const;

/** O corte de `D-51`. Número, não "uns 30": mudar o corte é `D-NN` novo, não edição de lista. */
const TOTAL = 32;

describe('M4 · portão — as 32 seleções de D-51', () => {
  it(`o catálogo tem exatamente ${TOTAL} entradas`, () => {
    expect(listTeams()).toHaveLength(TOTAL);
  });

  it('o catálogo não é mais lista de fixação: CATALOG_IS_FIXTURE = false', () => {
    expect(CATALOG_IS_FIXTURE).toBe(false);
  });
});

describe('M4 · portão — todo code é ISO-3166 alfa-2 válido, com UMA exceção (D-52)', () => {
  it('todo código tem 2 letras maiúsculas, ou é a exceção nomeada', () => {
    for (const team of listTeams()) {
      if (NAME_EXCEPTIONS.has(team.code)) continue;
      expect(team.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('a lista de exceções tem tamanho 1, e o teste diz qual é', () => {
    expect([...NAME_EXCEPTIONS.keys()]).toEqual([LITERAL_ESPERADO.code]);
  });

  it('exatamente um código do catálogo está fora da alfa-2, e é ele', () => {
    const fora = listTeams()
      .map((t) => t.code)
      .filter((code) => !/^[A-Z]{2}$/.test(code));
    expect(fora).toEqual([LITERAL_ESPERADO.code]);
  });

  it('um SEGUNDO código fora da alfa-2 reprova — a exceção é lista fechada, não regra', () => {
    // A via mais baixa possível: tentar a violação onde o catálogo é construído. Conferir a
    // lista pronta prova que a de hoje está certa, não que a próxima linha errada é recusada.
    for (const intruso of ['GB-SCT', 'GB-WLS', 'FR-COR', 'BR-SP', 'gb-eng', 'GB-ENG-X']) {
      expect(() => assertCatalogCode(intruso)).toThrow(RangeError);
    }
    expect(() => assertCatalogCode(LITERAL_ESPERADO.code)).not.toThrow();
  });

  it('nenhum código está na faixa de uso do usuário do ISO 3166-1', () => {
    for (const team of listTeams()) {
      expect(team.code).not.toBe('AA');
      expect(team.code).not.toBe('ZZ');
      expect(team.code.charAt(0)).not.toBe('X');
      expect(team.code).not.toMatch(/^Q[M-Z]$/);
    }
  });

  it('o catálogo não tem código repetido', () => {
    const codes = listTeams().map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

});

describe('M4 · portão — o name vem do código, nunca de texto digitado', () => {
  it('cada seleção tem nome não vazio e diferente do próprio código', () => {
    for (const team of listTeams()) {
      expect(team.name.length).toBeGreaterThan(0);
      expect(team.name).not.toBe(team.code);
    }
  });

  it('o nome das 31 vem do ICU em pt-BR, e não do que alguém escreveu', () => {
    const esperado = new Intl.DisplayNames(['pt-BR'], { type: 'region', fallback: 'none' });
    const derivadas = listTeams().filter((t) => !NAME_EXCEPTIONS.has(t.code));
    expect(derivadas).toHaveLength(TOTAL - 1);
    for (const team of derivadas) {
      expect(team.name).toBe(esperado.of(team.code));
    }
  });

  it('a exceção existe porque o ICU RECUSA o código — não por conveniência de quem digitou', () => {
    // O dia em que isto parar de lançar, a exceção deixou de se justificar e sai do catálogo.
    const icu = new Intl.DisplayNames(['pt-BR'], { type: 'region', fallback: 'none' });
    expect(() => icu.of(LITERAL_ESPERADO.code)).toThrow(RangeError);
    expect(findTeam(LITERAL_ESPERADO.code)?.name).toBe(LITERAL_ESPERADO.name);
  });

  it('a alfa-2 do território maior NÃO entra no lugar da subdivisão', () => {
    // Trocar `GB-ENG` por `GB` faria o ICU resolver, e o nome seria de outra coisa. É o atalho
    // que a exceção existe para não precisar tomar.
    expect(findTeam('GB')).toBeUndefined();
  });

  it('EXATAMENTE um nome de país aparece digitado na fonte de M4, e é o da exceção', () => {
    const fonte = readFileSync(FONTE_M4, 'utf8');
    // Se um nome fosse digitado, ele estaria aqui como literal — é o defeito que o portão proíbe.
    const digitados = listTeams()
      .map((t) => t.name)
      .filter((name) => fonte.includes(name));
    expect(digitados).toEqual([LITERAL_ESPERADO.name]);
  });

  it('o nome não depende do locale do aparelho: é fixo em pt-BR', () => {
    const brasil = findTeam('BR');
    expect(brasil?.name).toBe('Brasil');
  });
});

describe('M4 · portão — licença: zero URL, zero escudo', () => {
  it('nenhuma flag é URL ou hotlink', () => {
    for (const team of listTeams()) {
      if (team.flag === null) continue;
      expect(team.flag).not.toMatch(/^[a-z]+:\/\//i);
      expect(team.flag).not.toMatch(/^\/\//);
      expect(team.flag.toLowerCase()).not.toContain('wikipedia');
    }
  });

  it('a fonte de M4 não contém nenhuma URL', () => {
    const fonte = readFileSync(FONTE_M4, 'utf8');
    expect(fonte).not.toMatch(/https?:\/\//i);
  });

  it('a fonte de M4 não cita clube, federação nem marca da lista-morta', () => {
    // `QA-05`: os seis termos de marca vêm montados em tempo de execução, de `lista_morta.ts`.
    // Escritos por extenso aqui — como estavam até aqui —, eles apareciam na própria varredura do
    // portão de marca de M7 (`grep -rniE … src/` = zero) e a faziam devolver 6, todas vindas do
    // arquivo que existe para cobrá-la. Mesmo motivo das agulhas de `core.test.ts` e `ui.test.ts`.
    const fonte = readFileSync(FONTE_M4, 'utf8');
    for (const termo of LISTA_MORTA) {
      expect(fonte, termo.rotulo).not.toMatch(new RegExp(termo.padrao, 'i'));
    }

    // `cbf` e `escudo` não estão na varredura de marca (o portão de M7 não os conta), então
    // continuam por extenso: aqui eles não reprovam portão nenhum.
    const minusculas = fonte.toLowerCase();
    for (const termo of ['cbf', 'escudo']) {
      expect(minusculas, termo).not.toContain(termo);
    }
  });
});

describe('M4 · portão — as 32 bandeiras de D-54', () => {
  it('nenhuma seleção ficou sem bandeira: 32 caminhos, zero nulos', () => {
    const comBandeira = listTeams().filter((t) => t.flag !== FLAG_PENDENTE);
    expect(comBandeira).toHaveLength(TOTAL);
  });

  it('a flag é caminho de arquivo, não "" nem query de ferramenta de build', () => {
    for (const team of listTeams()) {
      expect(team.flag).not.toBe('');
      expect(team.flag).toMatch(/\.svg$/);
      expect(team.flag).not.toContain('?');
    }
  });

  it('o nome do arquivo é DERIVADO do código, não uma segunda lista digitada', () => {
    for (const team of listTeams()) {
      expect(team.flag).toContain(`${team.code.toLowerCase()}.svg`);
    }
    // Inclusive a exceção de `D-52`: `GB-ENG` → `gb-eng.svg`, sem caso especial.
    expect(findTeam('GB-ENG')?.flag).toContain('gb-eng.svg');
  });

  it('todo arquivo apontado EXISTE em src/assets/flags/', () => {
    for (const team of listTeams()) {
      const arquivo = resolve(DIR_BANDEIRAS, `${team.code.toLowerCase()}.svg`);
      expect(existsSync(arquivo), `${team.code}: ${arquivo} não existe`).toBe(true);
    }
  });

  it('a guarda de T-18, REDIRECIONADA: bandeira exige linha de procedência', () => {
    // Guarda de entrega herdada de `T-08`, redirecionada uma vez em `T-18` (`CATALOG_IS_FIXTURE`
    // → `flag`) e agora outra vez. A condição original vigiava o que ainda não tinha acontecido;
    // `T-19` a fez acontecer, e apagá-la devolveria o buraco que ela fecha. Ela passa a vigiar o
    // que ainda pode acontecer: uma seleção 33ª entrar com bandeira e SEM procedência.
    const tabela = readFileSync(LICENCIAMENTO, 'utf8');
    for (const team of listTeams()) {
      const caminho = `src/assets/flags/${team.code.toLowerCase()}.svg`;
      expect(tabela, `${caminho} não tem linha na tabela de procedência`).toContain(caminho);
    }
  });

  it('o texto da licença está versionado, com o aviso de copyright que a MIT exige (D-54)', () => {
    const licenca = readFileSync(resolve(DIR_BANDEIRAS, 'LICENSE.txt'), 'utf8');
    expect(licenca).toContain('MIT License');
    expect(licenca).toContain('Copyright (c) 2013 Panayiotis Lipiridis');
    expect(licenca).toContain('The above copyright notice and this permission notice shall be');
    expect(readFileSync(LICENCIAMENTO, 'utf8')).toContain('src/assets/flags/LICENSE.txt');
  });

  it('a pasta de bandeiras não tem arquivo além dos 32 e da licença', () => {
    // Asset órfão é asset sem dono: entra no bundle, custa bytes e não tem quem responda por ele.
    const esperados = new Set(listTeams().map((t) => `${t.code.toLowerCase()}.svg`));
    esperados.add('LICENSE.txt');
    expect(new Set(readdirSync(DIR_BANDEIRAS))).toEqual(esperados);
  });

  it('nenhum SVG referencia recurso externo — hotlink dentro do arquivo também é hotlink', () => {
    // A v1 quebrou a regra pelo `src` da tela; um `<image href="http…">` dentro do SVG a quebra
    // igual, e ainda deixa o jogo dependente da rede para pintar uma bandeira.
    for (const arquivo of readdirSync(DIR_BANDEIRAS).filter((n) => n.endsWith('.svg'))) {
      const svg = readFileSync(resolve(DIR_BANDEIRAS, arquivo), 'utf8');

      // Sobra só o que NÃO é declaração de namespace XML — namespace é identificador, não busca.
      const externas = [...svg.matchAll(/https?:\/\/[^"' )]*/g)]
        .map((m) => m[0])
        .filter((u) => !u.startsWith('http://www.w3.org/'));
      expect(externas, `${arquivo}: referência externa`).toEqual([]);

      for (const href of [...svg.matchAll(/href="([^"]*)"/g)].map((m) => m[1] ?? '')) {
        expect(href.startsWith('#'), `${arquivo}: href "${href}" sai do arquivo`).toBe(true);
      }
      expect(svg).not.toMatch(/<(image|script|foreignObject)\b/i);
    }
  });

  it('seleção sem arquivo de bandeira DERRUBA o carregamento — não vira null calado', () => {
    // A via mais baixa possível, como em `assertCatalogCode` (`D-61`): `ZW` é alfa-2 válida e o
    // ICU a resolve, então ela passa por toda a validação de código e morre exatamente onde tem
    // de morrer — na ausência do arquivo. É o que separa "lacuna declarada" de "SVG perdido no
    // caminho": depois de `T-19`, bandeira faltando é a segunda coisa, e ela não pode ser calada.
    expect(() => buildCatalog(['ZW'])).toThrow(/sem arquivo de bandeira/);
    expect(() => buildCatalog(['BR'])).not.toThrow();
  });

  it('o campo continua com UM formato só: o `no-inline` da fonte não pode sumir', () => {
    // Sem ele, 24 dos 32 SVGs entram no JS como `data:` e `flag` passa a ser ora caminho, ora
    // blob — e isso NÃO aparece na suíte, que roda em modo dev, onde nada é embutido. O portão
    // possível aqui é a fonte; o outro é a saída do `npm run build`, e é do dono.
    expect(readFileSync(FONTE_M4, 'utf8')).toContain('no-inline');
  });
});

describe('M4 · findTeam', () => {
  it('acha pelo código exato', () => {
    const primeiro = listTeams()[0] as Team;
    expect(findTeam(primeiro.code)).toEqual(primeiro);
  });

  it('devolve undefined para código ausente do catálogo', () => {
    expect(findTeam('ZW')).toBeUndefined();
  });

  it('acha a exceção pelo código com subdivisão', () => {
    const excecao = findTeam(LITERAL_ESPERADO.code);
    expect(excecao?.code).toBe(LITERAL_ESPERADO.code);
    expect(excecao?.name).toBe(LITERAL_ESPERADO.name);
  });

  it('NÃO normaliza: minúscula não acha', () => {
    const primeiro = listTeams()[0] as Team;
    expect(findTeam(primeiro.code.toLowerCase())).toBeUndefined();
  });

  it('devolve undefined para lixo, sem lançar', () => {
    expect(findTeam('')).toBeUndefined();
    expect(findTeam('BRA')).toBeUndefined();
    expect(findTeam('Brasil')).toBeUndefined();
  });
});

describe('M4 · o catálogo é imutável', () => {
  it('a lista devolvida é congelada e é sempre a mesma instância', () => {
    expect(Object.isFrozen(listTeams())).toBe(true);
    expect(listTeams()).toBe(listTeams());
  });

  it('cada seleção é congelada — escrever não altera o catálogo', () => {
    const alvo = listTeams()[0] as Team;
    expect(Object.isFrozen(alvo)).toBe(true);
    expect(() => {
      (alvo as { name: string }).name = 'outro';
    }).toThrow(TypeError);
    expect(findTeam(alvo.code)?.name).toBe(alvo.name);
  });

  it('empurrar na lista devolvida falha, e não corrompe o catálogo', () => {
    const antes = listTeams().length;
    expect(() => {
      (listTeams() as Team[]).push({ code: 'PT', name: 'x', flag: null });
    }).toThrow(TypeError);
    expect(listTeams()).toHaveLength(antes);
  });
});

describe('M4 · camada — M4 depende só de M1', () => {
  it('a fonte não importa motor, CPU, rede nem render', () => {
    const fonte = readFileSync(FONTE_M4, 'utf8');
    for (const proibido of ['engine', 'cpu', 'net', 'phaser']) {
      expect(fonte).not.toMatch(new RegExp(`from\\s+['"][^'"]*${proibido}`, 'i'));
    }
  });

  it('M4 não sorteia nada: não chama o gerador nativo', () => {
    // Agulha montada em tempo de execução, pela mesma razão que em `core.test.ts`: escrita
    // literal, ela apareceria na varredura de camada de M1 e reprovaria o portão de E-1.
    const agulha = ['Math', 'random'].join('.');
    expect(readFileSync(FONTE_M4, 'utf8')).not.toContain(agulha);
  });
});
