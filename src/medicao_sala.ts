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
