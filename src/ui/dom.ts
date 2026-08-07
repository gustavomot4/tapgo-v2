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
