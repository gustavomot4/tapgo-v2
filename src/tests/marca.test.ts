import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LISTA_MORTA, NOME_PLANTADO, padraoDaListaMorta } from './lista_morta';

/**
 * O portão de marca, cobrado por teste — `QA-05`.
 *
 * O contrato de M7 (`a_context/b_plan.md`) diz: `grep -rniE "…"` sobre `src/` **devolve zero**.
 * Até aqui esse portão só existia no terminal do dono, e o que ele media era o próprio arquivo
 * de teste que escrevia a lista por extenso — 6 ocorrências, todas vindas de quem a defende.
 *
 * Duas metades, como em `T-34`, porque uma sozinha não vale:
 *  1. `src/` inteiro está limpo — a varredura devolve zero;
 *  2. um termo **plantado em arquivo de `src/`** faz esta suíte REPROVAR. Sem a metade 2, a 1 é
 *     verde-por-vazio: bastava um erro de digitação no padrão para o portão parar de medir sem
 *     que ninguém notasse.
 */

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

/** Nada de código do projeto: dependência instalada e cache do Vite não são nossos para cobrar. */
const IGNORAR = new Set(['node_modules', 'dist', '.git', '.vite']);

/** O arquivo que a metade 2 planta e apaga. O nome vem de `lista_morta.ts` — ver o porquê lá. */
const CAMINHO_PLANTADO = join(SRC, 'tests', NOME_PLANTADO);

/**
 * Todo arquivo de `src/`, recursivo e **sem filtro de extensão**.
 *
 * Fail-closed de propósito: o `grep` do portão não pergunta a extensão, e uma lista de extensões
 * permitidas viraria o buraco por onde o próximo tipo de arquivo entra sem ser varrido. Os `.wav`
 * são sintetizados por script com semente fixa (ver [[licenciamento]]), então o conteúdo é
 * determinístico e a leitura como texto não introduz sorte nenhuma.
 */
function varrer(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    if (IGNORAR.has(item.name)) return [];
    const caminho = join(dir, item.name);
    return item.isDirectory() ? varrer(caminho) : [caminho];
  });
}

/** Os caminhos que citam algum termo da lista-morta, em forma legível e ordenada. */
function infratores(arquivos: readonly string[], padrao: RegExp): string[] {
  return arquivos
    .filter((caminho) => padrao.test(readFileSync(caminho, 'utf8')))
    .map((caminho) => relative(SRC, caminho).split(sep).join('/'))
    .sort();
}

describe('portão de marca — a lista-morta não aparece em src/ (QA-05)', () => {
  const arquivos = varrer(SRC);

  it('a varredura alcança src/ de verdade — não é lista vazia passando verde', () => {
    // Sem esta linha, uma pasta renomeada ou um `IGNORAR` largo demais faria o portão inteiro
    // passar sobre coisa nenhuma. Os três nomes cobrem código, página e asset.
    const nomes = arquivos.map((c) => relative(SRC, c).split(sep).join('/'));
    expect(arquivos.length).toBeGreaterThan(60);
    expect(nomes).toContain('main.ts');
    expect(nomes).toContain('index.html');
    expect(nomes).toContain('assets/flags/br.svg');
  });

  it('nenhum arquivo de src/ cita termo da lista-morta', () => {
    expect(infratores(arquivos, padraoDaListaMorta())).toEqual([]);
  });

  it.each(LISTA_MORTA.map((t) => [t.rotulo, t.padrao] as const))(
    'nenhum arquivo de src/ cita %s',
    (_rotulo, padrao) => {
      expect(infratores(arquivos, new RegExp(padrao, 'i'))).toEqual([]);
    },
  );
});

describe('portão de marca — a metade que prova que ele mede (QA-05)', () => {
  beforeEach(() => {
    rmSync(CAMINHO_PLANTADO, { force: true });
  });

  afterEach(() => {
    rmSync(CAMINHO_PLANTADO, { force: true });
  });

  it('o arquivo plantado não sobrevive a nenhum caso — o portão não fica sujo', () => {
    expect(existsSync(CAMINHO_PLANTADO)).toBe(false);
  });

  it.each(LISTA_MORTA.map((t) => [t.rotulo, t.exemplo] as const))(
    'plantar %s em um arquivo de src/ faz a varredura REPROVAR',
    (_rotulo, exemplo) => {
      // Medido por DELTA, e não por igualdade com a lista pronta: se `src/` já estivesse sujo,
      // uma asserção de igualdade reprovaria este caso pelo motivo errado e esconderia o que ele
      // mede — que é o plantio, e só ele.
      const antes = infratores(varrer(SRC), padraoDaListaMorta());

      // Plantado como código de verdade, em `src/`, no formato que alguém de fato escreveria.
      writeFileSync(CAMINHO_PLANTADO, `export const RODAPE = '${exemplo}';\n`, 'utf8');
      try {
        const depois = infratores(varrer(SRC), padraoDaListaMorta());
        expect(depois.filter((c) => !antes.includes(c))).toEqual([`tests/${NOME_PLANTADO}`]);

        // E a asserção do portão de fato reprova com ele no disco — não basta "a função achou".
        expect(() => expect(depois).toEqual([])).toThrow();
      } finally {
        rmSync(CAMINHO_PLANTADO, { force: true });
      }
      expect(existsSync(CAMINHO_PLANTADO)).toBe(false);
    },
  );

  it('o exemplo de cada termo é pego pelo padrão do próprio termo, e por nenhum outro', () => {
    // Erro de digitação em um padrão o tornaria vácuo e o portão pararia de medir aquele termo
    // em silêncio. Aqui cada padrão tem de pegar o SEU exemplo — e só o dele.
    for (const termo of LISTA_MORTA) {
      const proprio = new RegExp(termo.padrao, 'i');
      expect(proprio.test(termo.exemplo), termo.rotulo).toBe(true);
      const alheios = LISTA_MORTA.filter((outro) => outro !== termo).filter((outro) =>
        new RegExp(outro.padrao, 'i').test(termo.exemplo),
      );
      expect(alheios.map((o) => o.rotulo), termo.rotulo).toEqual([]);
    }
  });

  it('o padrão é insensível a caixa, como o `-i` do grep do portão', () => {
    for (const termo of LISTA_MORTA) {
      expect(padraoDaListaMorta().test(termo.exemplo.toUpperCase()), termo.rotulo).toBe(true);
    }
  });

  it('a lista tem os 6 termos de licenciamento — encolher a lista é decisão, não edição', () => {
    expect(LISTA_MORTA).toHaveLength(6);
    expect(new Set(LISTA_MORTA.map((t) => t.padrao)).size).toBe(6);
  });
});
