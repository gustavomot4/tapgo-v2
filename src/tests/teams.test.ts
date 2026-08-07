import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CATALOG_IS_FIXTURE,
  FLAG_PENDENTE,
  findTeam,
  listTeams,
  type Team,
} from '../data/teams';

const AQUI = resolve(fileURLToPath(import.meta.url), '..');
const FONTE_M4 = resolve(AQUI, '..', 'data', 'teams.ts');

describe('M4 · portão — todo code é ISO-3166 alfa-2 válido', () => {
  it('todo código do catálogo tem exatamente 2 letras maiúsculas', () => {
    for (const team of listTeams()) {
      expect(team.code).toMatch(/^[A-Z]{2}$/);
    }
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

  it('o catálogo não está vazio — porta de entrada sem dado é lacuna, não contrato', () => {
    expect(listTeams().length).toBeGreaterThan(0);
  });
});

describe('M4 · portão — o name vem do código, nunca de texto digitado', () => {
  it('cada seleção tem nome não vazio e diferente do próprio código', () => {
    for (const team of listTeams()) {
      expect(team.name.length).toBeGreaterThan(0);
      expect(team.name).not.toBe(team.code);
    }
  });

  it('o nome é o que o ISO-3166 resolve em pt-BR, e não o que alguém escreveu', () => {
    const esperado = new Intl.DisplayNames(['pt-BR'], { type: 'region', fallback: 'none' });
    for (const team of listTeams()) {
      expect(team.name).toBe(esperado.of(team.code));
    }
  });

  it('nenhum nome de país aparece digitado no código-fonte de M4', () => {
    const fonte = readFileSync(FONTE_M4, 'utf8');
    // Se um nome fosse digitado, ele estaria aqui como literal — é o defeito que o portão proíbe.
    for (const team of listTeams()) {
      expect(fonte).not.toContain(team.name);
    }
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
    const fonte = readFileSync(FONTE_M4, 'utf8').toLowerCase();
    const listaMorta = [
      'fifa',
      'copa do mundo',
      'world cup',
      'brasileirão',
      'libertadores',
      'champions league',
      'cbf',
      'escudo',
    ];
    for (const termo of listaMorta) {
      expect(fonte).not.toContain(termo);
    }
  });
});

describe('M4 · lacuna declarada — bandeiras travadas em A-04', () => {
  it('enquanto for lista de fixação, toda flag é nula — nunca "" nem caminho inventado', () => {
    expect(CATALOG_IS_FIXTURE).toBe(true);
    for (const team of listTeams()) {
      expect(team.flag).toBe(FLAG_PENDENTE);
      expect(team.flag).not.toBe('');
    }
  });

  it('A-04 derruba este teste de propósito: lista real entra com CATALOG_IS_FIXTURE = false', () => {
    // Guarda de entrega. Quando a lista real chegar, `CATALOG_IS_FIXTURE` vira `false`, este
    // teste falha e obriga a revisitar o portão de licença com os arquivos de bandeira na mão.
    expect(CATALOG_IS_FIXTURE).toBe(true);
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
