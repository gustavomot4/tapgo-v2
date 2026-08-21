/**
 * M9 — build e publicação.
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M9 — Build e publicação".
 *
 * Este arquivo possui `base`, `root` e `outDir`. Nenhum estado de runtime mora aqui.
 */
import { resolve } from 'node:path';

// `vitest/config` reexporta o `defineConfig` do Vite com o bloco `test` no tipo. Importar de
// `vite` puro faria o campo `test` abaixo ser propriedade desconhecida — e o `tsc` do portão só
// não pega isto por `include: ["src"]` não alcançar este arquivo.
import { defineConfig } from 'vitest/config';

/**
 * O GitHub Pages de repositório serve em `https://<usuario>.github.io/tapgo-v2/`, nunca na raiz.
 * Com o `base` padrão (`'/'`) o build gera `/assets/...` e **todo asset dá 404 só em produção**:
 * verde no `vite dev`, quebrado no ar. É a falha que o contrato de M9 manda evitar, e o motivo
 * de E-1 publicar uma página vazia antes de existir jogo.
 *
 * Casado com o nome do repositório (`gustavomot4/tapgo-v2`). Renomear o repositório sem mudar
 * esta linha reproduz exatamente o 404 acima.
 */
const BASE = '/tapgo-v2/';

export default defineConfig({
  base: BASE,

  // D-12: `index.html` mora em `src/`. Mantém a raiz limpa que o padrão do repositório exige
  // sem contrariar a convenção do Vite, para quem o `root` é a pasta do `index.html`.
  root: 'src',

  build: {
    /**
     * Duas páginas, e a segunda existe por causa de `D-33`: o portão de E-4 exige medir a taxa
     * de conexão em rede móvel real, e medição em celular precisa de uma página em HTTPS —
     * que é o que o Pages dá. `medicao.html` é instrumento, não jogo: não é alcançável a partir
     * do `index.html` e leva `noindex`.
     *
     * **Consequência declarada (`QA-06`):** `bundle-size.mjs` soma TODA entrada com `isEntry`
     * no "bundle inicial", então o número do CONTEXT passa a incluir a página de medição. O
     * defeito é da definição do medidor, é de M9, e não foi consertado aqui de carona (regra 4).
     */
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        medicao: resolve(__dirname, 'src/medicao.html'),
      },
    },

    // Relativo a `root` — portanto `dist/` na raiz do repositório. Já coberto pelo `.gitignore`.
    outDir: '../dist',

    // `outDir` fica FORA do `root`: sem isto o Vite se recusa a limpá-lo entre builds e sobra
    // artefato de build anterior no que vai ao ar.
    emptyOutDir: true,

    // O contrato de M9 entrega "o **número** do bundle lido da saída do build". É deste
    // manifesto que `src/scripts/bundle-size.mjs` soma o que a página carrega de entrada;
    // sem ele o número seria estimado, e estimado reprova.
    manifest: true,

    // Asset abaixo de 4 kB vira `data:` dentro do HTML — e asset embutido NUNCA dá 404, o que
    // tornaria o portão de E-1 um teste que passa sozinho. Só a sonda é forçada para fora;
    // `undefined` devolve o resto ao comportamento padrão do Vite.
    assetsInlineLimit: (arquivo) => (arquivo.includes('base-probe') ? false : undefined),
  },

  /**
   * `QA-32` — o teto de tempo da suíte.
   *
   * As provas estatísticas de M2 (1.000 cobranças sorteadas), M3 (3 níveis × 1.000 histogramas,
   * e a frequência medida em cada papel) e M6 (20.000 sorteios de ID, e o rótulo de sincronia)
   * não são testes lentos por descuido: o teto de 70% e a não-colisão do ID só se verificam por
   * repetição, e repetição custa tempo de CPU. Com a máquina livre elas passam folgadas — o
   * caso mais caro medido aqui foi **1.468 ms**. Com build e servidor de desenvolvimento
   * disputando a mesma máquina, `npm test` deu **3 falhas por tempo** e nada mais: mesma
   * semente, mesmas asserções, mesmo resultado — só mais devagar que os 5.000 ms que o Vitest
   * assume quando ninguém declara nada.
   *
   * Teste que reprova por o dono estar compilando ao lado é teste instável (regra 10 da skill
   * `testing`), e suíte instável é suíte que ninguém encara. Então o teto passa a ser declarado,
   * não herdado. **20.000 ms** é escolhido pelo que ele separa: ~13× o pior caso medido, o que
   * absorve a máquina ocupada; e ainda uma ordem de grandeza abaixo de um travamento de verdade
   * (laço que não fecha, espera de rede que a regra 6 proíbe), que continua reprovando rápido.
   *
   * Isto NÃO afrouxa nenhuma asserção, e não muda a contagem da suíte: 598 testes antes, 598
   * depois. O tempo limite nunca foi o que estes testes verificam.
   */
  test: {
    testTimeout: 20_000,

    // O mesmo motivo vale para `beforeEach`/`afterEach`: um hook que monta o dublê de M6 sob
    // máquina ocupada estouraria o teto próprio (também 5.000 ms por padrão) e derrubaria o
    // arquivo inteiro — falha ainda mais confusa que a do caso isolado.
    hookTimeout: 20_000,
  },
});
