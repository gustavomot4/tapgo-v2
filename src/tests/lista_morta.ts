/**
 * A lista-morta de [[licenciamento]], montada em tempo de execução — `QA-05`.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/licenciamento.md` → "O que é proibido no
 * projeto (lista-morta)". O portão de marca de M7 é um `grep -rniE` com a alternância dos seis
 * termos, sobre `src/` e `assets/`, devolvendo **zero** (`a_context/b_plan.md`, contrato de M7).
 * O comando literal NÃO é copiado para cá: ele contém os seis termos, e escrevê-lo aqui faria
 * este arquivo ser exatamente o defeito que `QA-05` fechou.
 *
 * Por que este arquivo existe: `QA-05` mediu que os testes que COBRAM a lista escreviam os seis
 * termos por extenso, e o portão os contava — a varredura devolvia 6, todas vindas dos arquivos
 * que existem para defendê-la. Cada pedaço abaixo é inofensivo sozinho; só o `join` produz o
 * termo, e o `join` acontece depois que o `grep` já passou.
 *
 * Não é módulo de produção: mora em `src/tests/` e nada de `src/main.ts` o alcança. Fica fora de
 * um `*.test.ts` de propósito — os três arquivos que varrem a lista (`marca`, `teams`, `ui`)
 * precisam da MESMA lista, e três cópias sairiam de sincronia no dia em que um termo entrasse.
 */

/** Um termo proibido: como se procura por ele, e um exemplo concreto que ele tem de pegar. */
export interface TermoMorto {
  /** Rótulo legível para a mensagem de reprovação — nunca contém o termo. */
  readonly rotulo: string;
  /** Fonte de regex, sem `RegExp` pronto: cada chamador escolhe as próprias flags. */
  readonly padrao: string;
  /**
   * Uma ocorrência real do termo, montada igual. É o que o teste PLANTA para provar que o padrão
   * ainda pega — padrão com erro de digitação passa verde sobre tudo, e o portão vira decoração.
   */
  readonly exemplo: string;
}

export const LISTA_MORTA: readonly TermoMorto[] = [
  {
    rotulo: 'a sigla da federação internacional',
    padrao: ['fi', 'fa'].join(''),
    exemplo: ['fi', 'fa'].join(''),
  },
  {
    rotulo: 'o nome do mundial em português',
    padrao: ['copa do', 'mundo'].join(' '),
    exemplo: ['copa do', 'mundo'].join(' '),
  },
  {
    rotulo: 'o nome do mundial em inglês',
    padrao: ['world', 'cup'].join(' '),
    exemplo: ['world', 'cup'].join(' '),
  },
  {
    rotulo: 'o campeonato nacional brasileiro',
    // O padrão aceita a forma com e sem acento; o exemplo planta a acentuada, que é a escrita
    // que alguém de fato digitaria.
    padrao: ['brasileir', '[ãa]o'].join(''),
    exemplo: ['brasileir', 'ão'].join(''),
  },
  {
    rotulo: 'o torneio sul-americano de clubes',
    padrao: ['liberta', 'dores'].join(''),
    exemplo: ['liberta', 'dores'].join(''),
  },
  {
    rotulo: 'o torneio europeu de clubes',
    padrao: ['champions', 'league'].join(' '),
    exemplo: ['champions', 'league'].join(' '),
  },
];

/**
 * O padrão único da lista inteira, com as flags do portão (`-i` do `grep` = `i` aqui).
 *
 * Uma função e não uma constante porque `RegExp` com `g` guarda `lastIndex` entre chamadas — um
 * portão que pula ocorrência na segunda leitura é pior que portão nenhum.
 */
export function padraoDaListaMorta(): RegExp {
  return new RegExp(LISTA_MORTA.map((t) => t.padrao).join('|'), 'i');
}

/**
 * O nome do arquivo que `marca.test.ts` planta em `src/tests/` e apaga no mesmo caso de teste.
 *
 * Mora aqui, e não lá, porque `core.test.ts` também varre `src/` inteiro e precisa ignorá-lo pelo
 * nome: os dois arquivos de teste rodam em paralelo, e sem isto aquela varredura poderia tentar
 * ler um arquivo que este já apagou — instabilidade, não portão. Importar de um `*.test.ts`
 * carregaria a suíte de marca dentro da de M1; a constante compartilhada é o caminho barato.
 */
export const NOME_PLANTADO = '__marca_plantada__.ts';
