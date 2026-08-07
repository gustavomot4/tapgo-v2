/**
 * Tipos de ambiente do Vite (`import.meta.env`, import de asset como URL).
 *
 * Mora aqui, e não no `tsconfig.json`, de propósito: `include: ["src"]` já pega este arquivo,
 * então o portão `npx tsc --noEmit` passa a enxergar o ambiente de build sem que M9 precise
 * mexer num arquivo que é de `D-14`.
 */
/// <reference types="vite/client" />
