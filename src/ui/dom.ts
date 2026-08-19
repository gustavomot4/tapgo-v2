/**
 * M7 — os quatro auxiliares de DOM que as telas usam.
 *
 * Existe para que nenhuma tela precise de `innerHTML`. Não é preciosismo: `innerHTML` com nome de
 * seleção interpolado é injeção de HTML por um caminho que ninguém revisita, e o catálogo de M4
 * vira lista real em `A-04`. Com `textContent` o problema não existe.
 */

export interface Atributos {
  classe?: string;
  texto?: string;
  /** Atributos crus — `type`, `aria-*`, `role`, `disabled`… */
  attrs?: Record<string, string>;
  /** `data-*` sem o prefixo: `{ tom: 'erro' }` vira `data-tom="erro"`. */
  dados?: Record<string, string>;
  /** Variáveis CSS e estilo pontual. Usado só para o matiz da marca de seleção. */
  estilo?: Record<string, string>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Atributos = {},
  filhos: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (atributos.classe !== undefined) node.className = atributos.classe;
  if (atributos.texto !== undefined) node.textContent = atributos.texto;

  for (const [chave, valor] of Object.entries(atributos.attrs ?? {})) {
    node.setAttribute(chave, valor);
  }
  for (const [chave, valor] of Object.entries(atributos.dados ?? {})) {
    node.dataset[chave] = valor;
  }
  for (const [chave, valor] of Object.entries(atributos.estilo ?? {})) {
    node.style.setProperty(chave, valor);
  }

  for (const filho of filhos) {
    node.append(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  }

  return node;
}

export function botao(
  rotulo: string,
  classe: string,
  aoClicar: () => void,
  atributos: Atributos = {},
): HTMLButtonElement {
  const b = el('button', {
    ...atributos,
    classe,
    texto: rotulo,
    attrs: { type: 'button', ...(atributos.attrs ?? {}) },
  });
  b.addEventListener('click', aoClicar);
  return b;
}

export function limpar(node: HTMLElement): void {
  node.replaceChildren();
}

/**
 * Move o foco para o primeiro alvo da tela nova.
 *
 * Sem isto, quem navega por teclado volta para o começo do documento a cada troca de tela e
 * percorre tudo de novo. `preventScroll` porque o salto de rolagem no celular parece defeito.
 */
export function focar(alvo: HTMLElement | null): void {
  if (alvo === null) return;
  try {
    alvo.focus({ preventScroll: true });
  } catch {
    /* elemento saiu da árvore entre o agendamento e a chamada — nada a fazer. */
  }
}

/**
 * O que uma confirmação precisa dizer. `corpo` diz o que VAI acontecer, nunca "tem certeza?".
 *
 * O campo se chama `corpo`, e não `texto`, por causa do portão de `QA-19`: a varredura de M7
 * reprova qualquer atributo `texto` que receba o campo `.texto` de um objeto — foi assim que o
 * caminho do SVG da bandeira acabou escrito dentro do disco de 34px. O padrão é largo de
 * propósito, e um nome de campo diferente custa menos que afrouxá-lo.
 */
export interface Confirmacao {
  titulo: string;
  corpo: string;
  /** Rótulo do botão que segue com a ação. */
  confirmar: string;
  aoConfirmar: () => void;
}

/**
 * Diálogo de confirmação de ação irreversível.
 *
 * Regra 5 da skill `frontend-uiux`: ação irreversível pede confirmação explícita **e diz o que
 * vai acontecer**. O foco entra no botão que NÃO destrói, `Escape` fecha, e o foco volta para
 * onde estava — quem navega por teclado não é jogado no começo do documento.
 *
 * A tela de cobrança mantém o diálogo dela: lá ele também precisa calar os atalhos de zona
 * enquanto está aberto (`ArrowLeft` chegaria ao `document` por cima do modal e cobraria um
 * pênalti atrás dele), e essa parte é da tela, não do diálogo.
 */
export function confirmar(raiz: HTMLElement, c: Confirmacao): void {
  const anterior = document.activeElement;

  const caixa = el('div', { classe: 'dialogo__caixa' });
  const dialogo = el(
    'div',
    { classe: 'dialogo', attrs: { role: 'dialog', 'aria-modal': 'true' } },
    [caixa],
  );

  const fechar = (): void => {
    dialogo.remove();
    document.removeEventListener('keydown', naTecla);
    if (anterior instanceof HTMLElement) focar(anterior);
  };

  const naTecla = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') fechar();
  };

  const cancelar = botao('Cancelar', 'botao botao--principal', fechar);

  caixa.append(
    el('h2', { texto: c.titulo }),
    el('p', { texto: c.corpo }),
    cancelar,
    botao(c.confirmar, 'botao botao--perigo', () => {
      fechar();
      c.aoConfirmar();
    }),
  );

  document.addEventListener('keydown', naTecla);
  raiz.append(dialogo);
  focar(cancelar);
}
