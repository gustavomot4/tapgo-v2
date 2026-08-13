/**
 * M4 — Catálogo de seleções.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M4 — Catálogo de seleções".
 * Dado curado que entra no bundle: não recebe nada em runtime, não faz I/O, não muda depois
 * de carregado. Depende só de M1 (`CountryCode`).
 *
 * **A lista aqui é a real** (`D-51`): 32 seleções, com o critério e a data de corte congelados
 * naquela decisão. `Q-03` está respondida. Desde `T-19` a bandeira também é real: os 32 SVGs de
 * `D-54` estão em `src/assets/flags/`, com a licença versionada antes deles.
 */

import type { CountryCode } from '../core/index';

/**
 * Uma seleção jogável.
 *
 * `flag` é **caminho local resolvido no build**, nunca URL: hotlink quebra o jogo offline e foi o
 * defeito de licença da v1 [Fonte: a_context/licenciamento.md#o-que-é-proibido-no-projeto].
 *
 * O tipo continua admitindo `null` porque a porta é a de `D-13`/`D-22` e mudar assinatura de porta
 * congelada é `D-NN`, não efeito colateral de uma tarefa de asset. **Hoje nenhuma das 32 é `null`**
 * — o catálogo recusa seleção sem arquivo no carregamento, e é o teste que cobra isso.
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

/**
 * `flag` de seleção cujo arquivo de bandeira não existe (`D-22`).
 *
 * Continua exportada e continua sendo `null`: é o valor que a porta promete para o caso "sem
 * arquivo", e `T-19` não o revogou — só esvaziou o conjunto de seleções que caem nele. Trocar por
 * `''` ou por um caminho inventado seria o "ausente ≠ zero" da skill, e a tela mostraria um ícone
 * quebrado no lugar de uma ausência declarada.
 */
export const FLAG_PENDENTE = null;

/**
 * Os arquivos de bandeira que **existem no disco**, com o caminho que o build vai emitir.
 *
 * `import.meta.glob` eager resolve na hora do build, que é o que o PLANO exige do catálogo
 * ("imutável, resolve em build") [Fonte: a_context/b_plan.md#quem-é-dono-de-qual-estado]: nenhuma
 * leitura em runtime, nenhum `fetch`, e o SVG entra no bundle como asset com hash. É também o que
 * torna "zero URL, zero hotlink" verificável em vez de prometido — o valor não é digitado por
 * ninguém, ele sai do arquivo que está versionado.
 *
 * `?no-inline` é obrigatório, e não estilo: 22 dos 32 SVGs estão abaixo do limite de inline do
 * Vite (4 kB) e virariam `data:` dentro do JS. Isso deixaria `flag` ora caminho, ora um blob de
 * 3 kB — dois formatos no mesmo campo, e o campo é declarado "caminho local".
 */
const ARQUIVOS_DE_BANDEIRA: Readonly<Record<string, string>> = import.meta.glob(
  '../assets/flags/*.svg',
  { eager: true, query: '?no-inline', import: 'default' },
);

/**
 * O caminho da bandeira de um código, ou `FLAG_PENDENTE` se o arquivo não existir.
 *
 * O nome do arquivo é **derivado** do código (`GB-ENG` → `gb-eng.svg`), nunca uma segunda lista
 * digitada ao lado de `CODES`: duas listas para a mesma verdade divergem no dia em que alguém
 * edita uma só.
 */
function bandeiraDe(code: string): string | null {
  const bruto = ARQUIVOS_DE_BANDEIRA[`../assets/flags/${code.toLowerCase()}.svg`];
  if (bruto === undefined) return FLAG_PENDENTE;

  // No build o caminho já vem limpo (`/tapgo-v2/assets/br-<hash>.svg`); no `vite dev` e sob o
  // vitest ele vem com o `?no-inline` pendurado. O `?` é marca da ferramenta, não do domínio:
  // deixá-lo passar faria o MESMO campo ter dois formatos conforme quem rodou, e o primeiro
  // `flag.endsWith('.svg')` de quem consumir isto seria um bug que só aparece em produção.
  const semQuery = bruto.split('?')[0];
  return semQuery === undefined || semQuery === '' ? FLAG_PENDENTE : semQuery;
}

/**
 * `false` desde `T-18`: o que `listTeams()` devolve é dado curado, não mais andaime.
 *
 * Continua exportada porque é a constante que o portão de M4 nomeia — era ela que segurava a
 * entrega enquanto a lista fosse de fixação, e é ela que diz, para quem lê de fora, se o catálogo
 * é resposta a `D-51` ou lista arbitrária.
 */
export const CATALOG_IS_FIXTURE = false;

/**
 * Os nomes que o ICU **não** resolve — lista fechada, hoje de tamanho 1.
 *
 * `D-52` admite `alfa-2 + subdivisão` onde a alfa-2 não existe, e entre as 32 há um único caso: a
 * alfa-2 disponível nomeia um território maior, que não é a seleção listada. `Intl.DisplayNames`
 * com `type: 'region'` resolve *região* e lança `RangeError` em *subdivisão*, então esta é a única
 * entrada do catálogo cujo nome é texto digitado.
 *
 * É exceção **nomeada**, não afrouxamento do portão de `D-23`: código fora da alfa-2 que não
 * esteja aqui é recusado no carregamento (`assertCatalogCode`), e o teste cobra o tamanho desta
 * lista e qual é o literal. Trocar isto por "aceita subdivisão" devolveria o buraco que `D-23`
 * fechou — nome digitado sem ninguém para conferi-lo.
 */
export const NAME_EXCEPTIONS: ReadonlyMap<CountryCode, string> = new Map([['GB-ENG', 'Inglaterra']]);

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
 * Fechar esse buraco exige a lista oficial da norma, que o projeto não tem; `D-51` trouxe as 32
 * seleções, não a norma, então o limite de `D-23` **segue declarado**. Inventá-la seria inventar
 * fonte.
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

/**
 * Recusa qualquer código que o catálogo não possa conter: alfa-2 válida, ou uma das exceções
 * nomeadas de `D-52`.
 *
 * **Exportada de propósito.** O portão diz que "um segundo código fora da alfa-2 reprova", e isso
 * só é verificável se o teste puder tentar a violação na via mais baixa — aqui, onde o catálogo é
 * construído. Conferir a lista pronta prova que a lista de hoje está certa; não prova que a
 * próxima linha errada será recusada.
 */
export function assertCatalogCode(code: string): void {
  if (NAME_EXCEPTIONS.has(code)) return;
  assertAlpha2(code);
}

/**
 * A lista de exceções só é legítima enquanto cada entrada for um código que o ICU não resolve.
 *
 * Uma alfa-2 aqui dentro seria nome digitado onde havia nome derivado — o buraco que `D-23`
 * fechou —, e passaria calada, porque a exceção tem precedência sobre o ICU em `makeTeam`.
 */
function assertExceptions(): void {
  for (const [code, name] of NAME_EXCEPTIONS) {
    if (/^[A-Z]{2}$/.test(code)) {
      throw new RangeError(`teams: ${code} é alfa-2 e tem nome no ICU — não pode ser exceção`);
    }
    if (name.trim() === '') {
      throw new RangeError(`teams: exceção ${code} sem nome`);
    }
  }
}

/** Monta uma seleção. O `name` vem do código, salvo a exceção nomeada — ninguém mais o digita. */
function makeTeam(code: string): Team {
  assertCatalogCode(code);

  const flag = bandeiraDe(code);

  // A exceção vem antes do ICU, e não como reserva depois dele: `REGION_NAMES.of` LANÇA em
  // subdivisão, então consultá-lo primeiro derrubaria o carregamento do módulo.
  const excecao = NAME_EXCEPTIONS.get(code);
  if (excecao !== undefined) {
    return Object.freeze({ code, name: excecao, flag });
  }

  const name = REGION_NAMES.of(code);
  if (name === undefined) {
    throw new RangeError(`teams: ${code} passou na validação mas não tem nome — ICU incompleto`);
  }
  return Object.freeze({ code, name, flag });
}

/**
 * Os 32 códigos do catálogo, na ordem congelada por `D-51`.
 *
 * **A procedência não mora aqui.** Critério, data de leitura, fontes e a conferência código a
 * código estão na nota `e_qa/m4_lista_das_32.md`, e é de lá que esta lista sai — não de memória.
 * Dentro de `src/` a origem se cita como `D-51` e como ponteiro para a nota, **nunca por extenso**:
 * quem publica a lista é marca de terceiro, e o portão de M7 varre `src/` atrás dela.
 */
const CODES: readonly string[] = [
  'ES', 'AR', 'FR', 'GB-ENG', 'BR', 'MA', 'PT', 'BE',
  'NL', 'MX', 'CO', 'DE', 'HR', 'CH', 'IT', 'US',
  'JP', 'SN', 'NO', 'UY', 'DK', 'IR', 'AT', 'EG',
  'EC', 'NG', 'TR', 'AU', 'DZ', 'CA', 'CI', 'KR',
];

/**
 * Constrói o catálogo uma vez, no carregamento do módulo, e o congela.
 *
 * **Exportada pelo mesmo motivo de `assertCatalogCode` (`D-61`):** os dois invariantes que moram
 * aqui — nenhum código repetido, e nenhuma seleção sem arquivo de bandeira — só são cobráveis na
 * via mais baixa se o teste puder tentar a violação onde ela seria cometida. Conferir a lista
 * pronta prova que a de hoje está certa; não prova que a próxima linha errada é recusada.
 *
 * Seleção sem arquivo **derruba o carregamento**, e é de propósito: `T-19` entregou as 32
 * bandeiras, então bandeira faltando aqui não é lacuna declarada, é arquivo perdido no caminho —
 * e um build sem SVG passaria calado, com o jogo mostrando código onde devia mostrar bandeira.
 */
export function buildCatalog(codes: readonly string[]): readonly Team[] {
  assertExceptions();
  const vistos = new Set<string>();
  const teams = codes.map((code) => {
    if (vistos.has(code)) {
      throw new RangeError(`teams: código repetido no catálogo: ${code}`);
    }
    vistos.add(code);
    const team = makeTeam(code);
    if (team.flag === FLAG_PENDENTE) {
      throw new RangeError(
        `teams: ${code} sem arquivo de bandeira — esperado src/assets/flags/${code.toLowerCase()}.svg ` +
          '(e a linha dele na tabela de procedência de licenciamento.md)',
      );
    }
    return team;
  });
  return Object.freeze(teams);
}

const CATALOG: readonly Team[] = buildCatalog(CODES);

const BY_CODE: ReadonlyMap<string, Team> = new Map(CATALOG.map((team) => [team.code, team]));

/** A lista de seleções jogáveis, na ordem do catálogo. Sempre a mesma instância congelada. */
export function listTeams(): readonly Team[] {
  return CATALOG;
}

/**
 * Busca por código exato.
 *
 * **Não normaliza:** código em minúscula devolve `undefined`, e não a seleção correspondente.
 * As representações obrigatórias dizem que país é identificado por código ISO-3166 — alfa-2, ou
 * alfa-2 + subdivisão onde ela não existe (`D-52`) —, nunca por texto digitado
 * [Fonte: a_context/a_context_source.md]; aceitar variação aqui seria aceitar o texto digitado
 * pela porta dos fundos e esconder o bug de quem chamou.
 *
 * Código ausente do catálogo é resposta legítima (`undefined`), não erro — quem chama decide.
 */
export function findTeam(code: CountryCode): Team | undefined {
  return BY_CODE.get(code);
}
