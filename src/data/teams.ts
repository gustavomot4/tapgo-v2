/**
 * M4 — Catálogo de seleções.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M4 — Catálogo de seleções".
 * Dado curado que entra no bundle: não recebe nada em runtime, não faz I/O, não muda depois
 * de carregado. Depende só de M1 (`CountryCode`).
 *
 * **O catálogo aqui é LISTA DE FIXAÇÃO.** `Q-03` (quantas e quais seleções entram, e de onde
 * vêm as bandeiras) segue aberta e só se resolve em `A-04`. O contrato e o portão são reais e
 * valem desde já; a lista não é resposta a `Q-03` e não deve ser lida como tal.
 */

import type { CountryCode } from '../core/index';

/**
 * Uma seleção jogável.
 *
 * `flag` é `null` enquanto o asset não existir (`A-04`) — ver `FLAG_PENDENTE`. Quando existir,
 * é **caminho local**, nunca URL: hotlink quebra o jogo offline e foi o defeito de licença da v1
 * [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto].
 */
export interface Team {
  readonly code: CountryCode;
  readonly name: string;
  readonly flag: string | null;
}

/**
 * Locale FIXO em que os nomes são resolvidos.
 *
 * Fixo de propósito: o catálogo é declarado imutável e "resolve em build"
 * [Fonte: a_context/b_plan.md#quem-é-dono-de-qual-estado]. Se o nome saísse do locale do
 * aparelho, dois celulares mostrariam nomes diferentes para a MESMA seleção e o catálogo
 * deixaria de ser imutável sem ninguém notar.
 */
const CATALOG_LOCALE = 'pt-BR';

/**
 * Deriva o nome do país a partir do código — nunca texto digitado.
 *
 * `fallback: 'none'` faz códigos desconhecidos virarem `undefined` em vez de ecoarem o próprio
 * código, o que transforma "ICU ausente" e "código inválido" em falha visível, e não em uma
 * seleção chamada "XX".
 */
const REGION_NAMES = new Intl.DisplayNames([CATALOG_LOCALE], {
  type: 'region',
  fallback: 'none',
});

/** `flag` de seleção cujo arquivo de bandeira ainda não existe. Resolve em `A-04`. */
export const FLAG_PENDENTE = null;

/**
 * `true` enquanto `listTeams()` devolver a lista de fixação.
 *
 * Existe para que a lacuna seja estrutural e não uma nota de rodapé: vira `false` em `A-04`,
 * junto com a lista real, e o teste que trava a entrega lê esta constante.
 */
export const CATALOG_IS_FIXTURE = true;

/**
 * Códigos que o ISO 3166-1 reserva para uso do usuário e que, portanto, NUNCA identificam um
 * país: `AA`, `QM`–`QZ`, `XA`–`XZ`, `ZZ`. É regra estrutural da norma (uma faixa, verificável
 * por comparação), não lista digitada de países.
 */
function isUserAssigned(code: string): boolean {
  const first = code.charAt(0);
  const second = code.charAt(1);
  if (code === 'AA' || code === 'ZZ') return true;
  if (first === 'X') return true;
  return first === 'Q' && second >= 'M' && second <= 'Z';
}

/**
 * Recusa qualquer código que não seja ISO-3166 alfa-2 utilizável como seleção.
 *
 * Falha alta, não silenciosa: um código torto que passasse daqui viraria uma seleção com nome
 * errado no bundle, e dado ruim no bundle sobrevive a todo refactor.
 *
 * **Limite declarado:** o ICU resolve códigos *retirados* e *excepcionalmente reservados* como se
 * fossem países — `SU` devolve "Rússia", `UK` e `EU` devolvem nome — e esta função os aceita.
 * Fechar esse buraco exige a lista oficial da norma, que é dado curado e entra com a lista real
 * em `A-04`; inventá-la aqui seria inventar fonte.
 */
function assertAlpha2(code: string): void {
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new RangeError(
      `teams: código deve ser ISO-3166 alfa-2 (2 letras maiúsculas); recebido ${JSON.stringify(code)}`,
    );
  }
  if (isUserAssigned(code)) {
    throw new RangeError(`teams: ${code} é faixa de uso do usuário no ISO 3166-1, não é país`);
  }
  if (REGION_NAMES.of(code) === undefined) {
    throw new RangeError(`teams: ${code} não resolve para nenhuma região conhecida`);
  }
}

/** Monta uma seleção a partir do código. O `name` vem do código; ninguém o digita. */
function makeTeam(code: string): Team {
  assertAlpha2(code);
  const name = REGION_NAMES.of(code);
  if (name === undefined) {
    throw new RangeError(`teams: ${code} passou na validação mas não tem nome — ICU incompleto`);
  }
  return Object.freeze({ code, name, flag: FLAG_PENDENTE });
}

/**
 * **LISTA DE FIXAÇÃO — não é resposta a `Q-03`.**
 *
 * Existe só para o contrato e o portão terem o que exercitar antes de `A-04`, e é arbitrária por
 * construção. Quem decide quantas e quais seleções entram é o dono, em `Q-03`
 * [Fonte: a_context/b_plan.md#m4--catálogo-de-seleções].
 */
const FIXTURE_CODES: readonly string[] = ['BR', 'AR', 'DE', 'JP'];

/** Constrói o catálogo uma vez, no carregamento do módulo, e o congela. */
function buildCatalog(codes: readonly string[]): readonly Team[] {
  const vistos = new Set<string>();
  const teams = codes.map((code) => {
    if (vistos.has(code)) {
      throw new RangeError(`teams: código repetido no catálogo: ${code}`);
    }
    vistos.add(code);
    return makeTeam(code);
  });
  return Object.freeze(teams);
}

const CATALOG: readonly Team[] = buildCatalog(FIXTURE_CODES);

const BY_CODE: ReadonlyMap<string, Team> = new Map(CATALOG.map((team) => [team.code, team]));

/** A lista de seleções jogáveis, na ordem do catálogo. Sempre a mesma instância congelada. */
export function listTeams(): readonly Team[] {
  return CATALOG;
}

/**
 * Busca por código exato.
 *
 * **Não normaliza:** código em minúscula devolve `undefined`, e não a seleção correspondente.
 * As representações obrigatórias dizem que país é identificado por código ISO-3166 alfa-2,
 * nunca por texto digitado
 * [Fonte: a_context/a_context_source.md]; aceitar variação aqui seria aceitar o texto digitado
 * pela porta dos fundos e esconder o bug de quem chamou.
 *
 * Código ausente do catálogo é resposta legítima (`undefined`), não erro — quem chama decide.
 */
export function findTeam(code: CountryCode): Team | undefined {
  return BY_CODE.get(code);
}
