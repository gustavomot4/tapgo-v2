/**
 * Derivação da sala de cada tentativa da medição de E-4. Parte de `src/medicao.ts` (`D-33`).
 *
 * **Por que é um módulo separado.** `medicao.ts` é *entrada de página*: ele chama `montar()` na
 * última linha, mexe em `document` e importa M6. Importá-lo de um teste executaria a página
 * inteira — sem DOM, sem `window`, e com um `import()` de sinalização em voo. `D-38` exige provar
 * que os dois aparelhos derivam o MESMO ID, e essa prova precisa da derivação **sem** a página em
 * volta. Era isso, e só isso, que faltava para `QA-08` ser testável.
 *
 * Módulo **puro**: nenhum DOM, nenhum `src/net`, nenhum estado de módulo. A pureza não é estética
 * — é ela que deixa a derivação ser exercitada milhares de vezes sem abrir um canal sequer.
 */

/**
 * ID da tentativa `n`, derivado da sala-base por **rotação**.
 *
 * Rotacionar um ID válido devolve um ID válido — mesmo comprimento, mesmo alfabeto —, então
 * `joinRoom` o aceita sem que a medição precise conhecer o alfabeto de M6 (constante duplicada é
 * constante que diverge). E, sendo determinístico, os dois aparelhos calculam o MESMO ID a partir
 * da mesma base, sem trocar mensagem nenhuma — o que importa, já que é justamente a troca de
 * mensagens que está sob teste.
 *
 * **É `D-38` que faz esta função valer para os dois lados.** Antes dela o anfitrião descartava o
 * resultado daqui e sorteava sala nova a cada toque (`QA-08`): a derivação já era determinística,
 * mas só um dos aparelhos a obedecia.
 *
 * **Limite já declarado (não é achado novo):** a rotação tem período `b.length` — 26, em M6 —,
 * logo `n` e `n + 26` devolvem a MESMA sala. Com o piso de 30 tentativas por contador que `A-08`
 * fixou, as quatro últimas reentram em salas já usadas e perdem independência. Está registrado na
 * auditoria de 2026-08-08 (`d_history/a_changelog.md`, e a íntegra em [[m6_transporte_notas]]) e
 * **não** é consertado aqui: mexer no denominador da medição é decisão do dono, não de `T-15`.
 */
export function idDaTentativa(b: string, n: number): string {
  const k = n % b.length;
  return b.slice(k) + b.slice(0, k);
}

/**
 * Quantos caracteres do ID a tela pode mostrar.
 *
 * Seis, o mesmo corte do `tag` de M6 e pelo mesmo motivo: o ID inteiro **é a credencial de entrada
 * na sala**, e print de tela viaja. Seis bastam para dois humanos compararem duas telas; não
 * bastam para um terceiro entrar na medição.
 */
export const PREFIXO_VISIVEL = 6;

/**
 * A linha que os dois aparelhos comparam antes de tocar em "Tentativa" — o guarda de `QA-09`.
 *
 * **O defeito que ela torna visível:** o índice da rotação é um contador LOCAL de cada aparelho
 * (`contadores[modo].tentativas`). Um toque a mais de um dos lados desencontra as salas e **não
 * ressincroniza sozinho** — e o sintoma são 20 s de espera terminando em `'failed'`, idêntico a
 * um NAT simétrico. Sem esta linha, erro de operador entra na planilha como falha de rede, que é
 * a mesma direção de viés de `QA-08`: número falso e crível.
 *
 * **O índice vai junto do prefixo de propósito.** Só o prefixo não serve: seis caracteres de duas
 * rotações da mesma base podem coincidir, e aí duas telas dessincronizadas leriam igual. O índice
 * é o que nunca colide.
 *
 * Isto **mostra** o desencontro; não o conserta. Ressincronizar sozinho mudaria o denominador da
 * medição, e denominador de portão é `D-NN` do dono.
 */
export function rotuloDaTentativa(b: string, n: number): string {
  return `#${n} · ${idDaTentativa(b, n).slice(0, PREFIXO_VISIVEL)}`;
}
