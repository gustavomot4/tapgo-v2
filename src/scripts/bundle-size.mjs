/**
 * M9 — o número do bundle, LIDO da saída do build.
 *
 * O contrato de M9 entrega "o **número** do bundle lido da saída do build, nunca estimado", e o
 * gatilho de revisão de `D-02` reabre a decisão de stack quando o bundle inicial chega a 8 MB.
 * Um número estimado não serve para nenhum dos dois: este script mede os BYTES dos arquivos que
 * o build acabou de emitir.
 *
 * "Bundle inicial" = o que o navegador baixa para pintar a primeira tela: o `index.html`, o
 * chunk de entrada, tudo que ele importa ESTATICAMENTE (recursivamente) e o CSS e os assets
 * desses chunks. `import()` dinâmico fica de fora — ele é, por definição, carregado depois.
 *
 * Rodado por `npm run build`, depois do `vite build`. Sai com código 1 se estourar o teto:
 * teto que só reprova depois do fato não é teto.
 */
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(RAIZ, 'dist');
const MANIFESTO = join(DIST, '.vite', 'manifest.json');

/** Teto do CONTEXT e gatilho de `D-02`. Decimal (8.000.000 B) — a leitura mais conservadora de "8 MB". */
const TETO_BYTES = 8_000_000;

const bytes = (n) => `${n.toLocaleString('pt-BR')} B  (${(n / 1_000_000).toFixed(3)} MB)`;

function tamanho(caminhoRelativo) {
  try {
    return statSync(join(DIST, caminhoRelativo)).size;
  } catch {
    // Arquivo no manifesto e ausente do disco é build corrompido, não arredondamento.
    console.error(`ERRO: o manifesto cita "${caminhoRelativo}", que não existe em dist/.`);
    process.exit(1);
  }
}

function somaRecursiva(dir) {
  let total = 0;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const alvo = join(dir, item.name);
    total += item.isDirectory() ? somaRecursiva(alvo) : statSync(alvo).size;
  }
  return total;
}

let manifesto;
try {
  manifesto = JSON.parse(readFileSync(MANIFESTO, 'utf8'));
} catch {
  console.error(
    `ERRO: ${MANIFESTO} não existe. Rode o \`vite build\` antes — e confira que\n` +
      '      `build.manifest` continua ligado em vite.config.ts (é dele que sai o número).',
  );
  process.exit(1);
}

// Caminha o grafo de imports ESTÁTICOS a partir de cada entrada, sem revisitar.
const iniciais = new Map(); // arquivo -> bytes
const vistos = new Set();

function visitar(chave) {
  if (vistos.has(chave)) return;
  vistos.add(chave);

  const item = manifesto[chave];
  if (!item) return;

  for (const arquivo of [item.file, ...(item.css ?? []), ...(item.assets ?? [])]) {
    if (arquivo && !iniciais.has(arquivo)) iniciais.set(arquivo, tamanho(arquivo));
  }
  for (const importado of item.imports ?? []) visitar(importado);
}

for (const [chave, item] of Object.entries(manifesto)) {
  if (item.isEntry) visitar(chave);
}

// O `index.html` é a primeira coisa que o navegador baixa. Nem toda versão do Vite o lista no
// manifesto, então ele entra por fora — e sem duplicar se já tiver entrado.
if (!iniciais.has('index.html')) iniciais.set('index.html', tamanho('index.html'));

if (iniciais.size === 0) {
  console.error('ERRO: nenhuma entrada (`isEntry`) no manifesto — não há bundle inicial a medir.');
  process.exit(1);
}

const inicial = [...iniciais.values()].reduce((a, b) => a + b, 0);
const totalDist = somaRecursiva(DIST);

console.log('\n── Bundle (lido de dist/, não estimado) ──────────────────────');
for (const [arquivo, n] of [...iniciais].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(9)} B  ${arquivo}`);
}
console.log('   ────────────────────────────────────────────────────────');
console.log(`   inicial : ${bytes(inicial)}`);
console.log(`   dist/   : ${bytes(totalDist)}   (inclui o que é carregado depois)`);
console.log(`   teto    : ${bytes(TETO_BYTES)}   — CONTEXT + gatilho de D-02`);

if (inicial >= TETO_BYTES) {
  console.error(
    `\nREPROVADO: bundle inicial de ${bytes(inicial)} atinge o teto de 8 MB.\n` +
      'Isto é o gatilho de revisão de `D-02` — abra um D-NN novo, não afrouxe o teto.\n',
  );
  process.exit(1);
}

console.log(`   OK: ${((inicial / TETO_BYTES) * 100).toFixed(2)}% do teto.\n`);
