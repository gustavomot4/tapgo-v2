/**
 * M7 — a tela do torneio: onde ele está, quem você enfrenta agora, e a sua chave.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 * A porta lida é a de M8: `current()`, `group()` e `champion()`. Esta tela **não** conta disputa,
 * não classifica e não simula nada — tudo isso é de M8, e é por isso que o chaveamento vivo mora
 * lá e não aqui (`D-57`).
 *
 * ## O fluxo crítico fecha em 1 toque
 * "Jogar esta disputa" é o único caminho principal da tela, e ele já vem com foco. A tabela do
 * grupo fica embaixo, para quem quiser olhar — ela é leitura, nunca um passo a mais.
 *
 * ## A coluna de gols, e a decisão de `Q-13` (`D-67`)
 * O placar da disputa do jogador não volta por `report(winner)` — porta congelada (`D-13`,
 * `D-58`). A tabela **não escreve `0`** no lugar: a linha do jogador mostra `—`, porque as três
 * disputas dela são justamente as que não têm placar, e as outras três mostram a soma do que se
 * sabe, com a nota dizendo o que ficou de fora. Ver `golsDaLinha` em `rotulos.ts`.
 *
 * ## A coluna de pontos (`P-2`)
 * "Pts" é derivação de render: `pontos = 3 x vitórias`, exatamente, porque a disputa nunca empata
 * (`D-09`) e não há ponto de empate a distribuir. M8 não ganhou campo nenhum por causa dela, e a
 * ordenação segue sendo a de `D-53` — empatar em pontos é empatar em vitórias, e é ali que
 * confronto direto, saldo, gols e sorteio entram. `NOTA_PONTOS` diz isso embaixo da tabela para
 * que a coluna não sugira uma segunda regra de desempate.
 *
 * ## Os 4 estados
 * - **carregando** — não há: o torneio já está na memória (M8 resolve tudo em chamada síncrona).
 * - **vazio** — não há torneio em andamento. Acontece por entrada direta na rota; a tela oferece
 *   começar um.
 * - **erro** — o torneio não tem próxima disputa nem campeão. M8 não produz isso; se produzir, a
 *   pessoa recebe uma frase em português e a saída de descartar, nunca uma tela travada.
 * - **sucesso** — a próxima disputa e a tabela do grupo.
 */

import type { CountryCode, Side } from '../core/index';
import { newSeed } from '../core/index';
import type { Standing } from '../tournament/index';
import { botao, confirmar, el, focar } from './dom';
import {
  NOME_TORNEIO,
  NOTA_PONTOS,
  NOTA_SEM_GOLS,
  ROTULO_SEM_GOLS,
  TITULO_PONTOS,
  golsDaLinha,
  nomeFase,
  nomeSelecao,
  pontosDaLinha,
} from './rotulos';
import { marca } from './tela_selecoes';
import { telaCampeao } from './tela_campeao';
import type { Contexto, Tela } from './rotas';

/** A próxima disputa, do tamanho de quem é o assunto da tela. */
function proximaDisputa(times: Readonly<Record<Side, CountryCode>>): HTMLElement {
  const lado = (code: CountryCode): HTMLElement =>
    el('span', { classe: 'confronto__lado' }, [
      marca(code, true),
      el('span', { classe: 'confronto__nome', texto: nomeSelecao(code) }),
    ]);

  // `aria-hidden` não entra aqui: diferente do confronto da tela de seleções, este par não está
  // escrito em nenhum outro lugar da tela — esconder seria apagá-lo de quem usa leitor de tela.
  return el('div', { classe: 'confronto' }, [
    lado(times.A),
    el('span', { classe: 'confronto__vs', texto: '×' }),
    lado(times.B),
  ]);
}

/**
 * A tabela do grupo: posição, seleção, pontos, vitórias e gols.
 *
 * `<table>` de verdade, com `<th scope>`: é o que faz o leitor de tela dizer "Vitórias, 2" em vez
 * de ler quatro números soltos. A linha do jogador leva `data-voce` e um texto para quem não vê
 * a cor — destaque que só existe em cor não existe para parte das pessoas.
 */
function tabelaDoGrupo(linhas: readonly Standing[], humana: CountryCode): HTMLElement {
  const cabecalho = el('tr', {}, [
    el('th', { classe: 'tabela__pos', texto: '#', attrs: { scope: 'col' } }),
    el('th', { texto: 'Seleção', attrs: { scope: 'col' } }),
    el('th', {
      classe: 'tabela__num tabela__pts',
      texto: 'Pts',
      attrs: { scope: 'col', title: TITULO_PONTOS },
    }),
    el('th', { classe: 'tabela__num', texto: 'V', attrs: { scope: 'col', title: 'Vitórias' } }),
    el('th', { classe: 'tabela__num', texto: 'Gols', attrs: { scope: 'col' } }),
  ]);

  const corpo = el('tbody');
  linhas.forEach((linha, i) => {
    const ehVoce = linha.code === humana;
    const nome = el('span', { classe: 'tabela__nome', texto: nomeSelecao(linha.code) });

    corpo.append(
      el('tr', ehVoce ? { dados: { voce: 'sim' } } : {}, [
        el('th', { classe: 'tabela__pos', texto: `${String(i + 1)}º`, attrs: { scope: 'row' } }),
        el('td', { classe: 'tabela__celula-nome' }, [
          el('span', { classe: 'tabela__time' }, [
            marca(linha.code),
            nome,
            ...(ehVoce ? [el('span', { classe: 'tabela__voce', texto: 'você' })] : []),
          ]),
        ]),
        el('td', { classe: 'tabela__num tabela__pts', texto: String(pontosDaLinha(linha)) }),
        el('td', { classe: 'tabela__num', texto: String(linha.wins) }),
        el('td', {
          classe: 'tabela__num',
          texto: golsDaLinha(linha, ehVoce),
          // O traço de ausente não é lido: quem usa leitor de tela ouviria "menos". A frase
          // inteira entra por `aria-label`, e só na linha em que o dado falta.
          ...(ehVoce ? { attrs: { 'aria-label': ROTULO_SEM_GOLS } } : {}),
        }),
      ]),
    );
  });

  return el('table', { classe: 'tabela' }, [el('thead', {}, [cabecalho]), corpo]);
}

export const telaTorneio: Tela = (raiz: HTMLElement, ctx: Contexto) => {
  const emCurso = ctx.torneio();

  if (emCurso === null) {
    // ── Estado VAZIO ──────────────────────────────────────────────────────────────────────
    raiz.append(
      el('section', { classe: 'tela' }, [
        el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
        el('div', { classe: 'aviso' }, [
          el('p', { texto: 'Não há torneio em andamento.' }),
          el('p', { classe: 'sub', texto: 'Comece um novo para disputar as 64 partidas.' }),
        ]),
        el('div', { classe: 'grupo empurra' }, [
          botao('Começar um torneio', 'botao botao--principal', () =>
            ctx.ir({ nome: 'torneio_novo' }),
          ),
          botao('Voltar ao início', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })),
        ]),
      ]),
    );
    return () => undefined;
  }

  const { torneio, humana, nivel } = emCurso;
  const proxima = torneio.current();

  // Sem próxima disputa, o torneio acabou para o jogador — e M8 já simulou o que faltava até o
  // campeão (`D-57`). A tela do campeão é OUTRA tela, e quem a mostra é ela mesma: repetir aqui
  // um resumo do desfecho daria duas versões da mesma notícia para manter.
  if (proxima === null) return telaCampeao(raiz, ctx);

  const tela = el('section', { classe: 'tela' });
  raiz.append(tela);

  const ladoLocal: Side = proxima.teams.A === humana ? 'A' : 'B';

  function jogar(): void {
    if (proxima === null) return;
    ctx.ir({
      nome: 'cobranca',
      partida: {
        modo: 'cpu',
        // O nível do TORNEIO, não o da preferência de agora: um torneio inteiro no mesmo nível
        // é `D-60`, e a preferência pode ter mudado desde o começo dele.
        nivel,
        times: { A: proxima.teams.A, B: proxima.teams.B },
        ladoLocal,
        semente: newSeed(),
        torneio: true,
        // O torneio é offline por contrato ([[online_p2p]]: ele funciona sem rede nenhuma), e
        // sala é coisa do modo `online`. `null` aqui é literal, não pendência.
        sala: null,
      },
    });
  }

  function sair(): void {
    // Ação irreversível: o torneio salvo é apagado e não há como voltar a ele.
    confirmar(raiz, {
      titulo: 'Abandonar o torneio?',
      corpo: 'Isso apaga o torneio salvo neste aparelho. As disputas já jogadas não voltam.',
      confirmar: 'Abandonar',
      aoConfirmar: () => {
        ctx.definirTorneio(null);
        ctx.ir({ nome: 'inicio' });
      },
    });
  }

  const jogarBotao = botao('Jogar esta disputa', 'botao botao--principal', jogar);

  tela.append(
    el('h1', { classe: 'titulo', texto: NOME_TORNEIO }),
    el('p', { classe: 'sub', texto: nomeFase(proxima.stage, proxima.round) }),
    el('div', { classe: 'grupo' }, [
      el('p', { classe: 'legenda', texto: 'Sua próxima disputa' }),
      proximaDisputa(proxima.teams),
      jogarBotao,
    ]),
  );

  // ── Estado de ERRO da tabela ────────────────────────────────────────────────────────────
  // `group()` recusa código que não está no torneio. Não deveria acontecer — o registro salvo é
  // conferido na leitura —, e mesmo assim a tela mostra a disputa e diz que a tabela faltou, em
  // vez de sumir inteira por causa de um pedaço.
  let linhas: readonly Standing[] | null = null;
  try {
    linhas = torneio.group(humana);
  } catch {
    linhas = null;
  }

  if (linhas === null) {
    tela.append(
      el('div', { classe: 'aviso' }, [
        el('p', { texto: 'Não foi possível mostrar a tabela do seu grupo.' }),
        el('p', { classe: 'sub', texto: 'A disputa acima continua valendo — dá para jogar.' }),
      ]),
    );
  } else {
    tela.append(
      el('div', { classe: 'grupo' }, [
        el('p', { classe: 'legenda', texto: 'Sua chave' }),
        tabelaDoGrupo(linhas, humana),
        // A nota de `P-2`: vem ANTES da de gols porque explica a coluna que a pessoa lê
        // primeiro, e porque é ela que impede "Pts" de sugerir um desempate que não existe.
        el('p', { classe: 'lacuna', texto: NOTA_PONTOS }),
        // A nota de `Q-13`/`D-67`. Fica colada na tabela, e não no rodapé da tela: uma coluna
        // parcial sem a nota ao lado é a tela dizendo um número que ela não mediu.
        el('p', { classe: 'lacuna', texto: NOTA_SEM_GOLS }),
      ]),
    );
  }

  tela.append(
    el('div', { classe: 'grupo empurra' }, [
      // A saída não destrutiva vem PRIMEIRO: quem só quer jogar uma disputa avulsa não precisa
      // passar perto do botão que apaga o torneio.
      botao('Voltar ao início', 'botao botao--discreto', () => ctx.ir({ nome: 'inicio' })),
      botao('Abandonar o torneio', 'botao botao--discreto', sair),
    ]),
  );

  focar(jogarBotao);
  return () => undefined;
};
