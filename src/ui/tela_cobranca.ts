/**
 * M7 — tela da cobrança. É onde a disputa acontece.
 *
 * Contrato: `77777777_TAPGO_Project_DOCs/a_context/b_plan.md` → "M7 — Tela (Phaser)".
 *
 * ## O que esta tela NÃO sabe
 * Regra de disputa nenhuma. Não soma placar, não decide gol, não decide fim: tudo isso chega
 * pronto no `MatchState` que M5 entrega. A única coisa derivada aqui é de quem é a vez de
 * escolher no modo `local` — a derivação de `Q-09`, que mora em `derivacao.ts` e é testada.
 *
 * ## Modo `local`: a zona escolhida não aparece na tela
 * Os dois jogadores olham o mesmo aparelho. Se a tela destacasse a zona do chute enquanto o
 * goleiro escolhe, o modo `local` seria injogável — e o defeito seria de UI, não de motor. Por
 * isso o primeiro toque só produz "passe o aparelho": a zona fica dentro de M5, onde já estava,
 * e esta tela nunca a recebe de volta.
 *
 * ## Quem cobra primeiro chega pronto (D-48)
 * Esta tela não sorteia e não guarda lado nenhum: M5 sorteia na criação da sessão, e o resultado
 * chega em `state().turn` antes da 1ª cobrança. A tela lê e mostra. É o que `QA-15` cobrava — a
 * versão anterior repetia a constante do motor e teria passado a mentir no dia do sorteio.
 *
 * ## Modo `online`: a sessão chega pronta, e conectada (`T-21`)
 * Nos outros dois modos esta tela cria a sessão. No `online` ela **recebe** a que a tela de
 * convite criou e conectou — porque lá criar é conectar, e é lá que moram os dois portões de
 * `D-75` (nenhuma sessão antes do toque, retentativa só antes do primeiro `'connected'`). Criar
 * outra aqui abriria um segundo canal na mesma sala.
 *
 * Duas consequências que valem estar escritas:
 *
 * 1. **Depois de escolher, este aparelho espera o outro.** No `online` cada aparelho escolhe uma
 *    vez por cobrança, e M5 recusa a segunda escolha da mesma cobrança em voz alta. Então o
 *    toque tranca as zonas e só as destranca quando a cobrança fecha — o que chega por
 *    notificação de REDE, não pelo retorno de `choose()`.
 * 2. **Queda depois de conectado não retenta.** É `D-35`: o peer saiu, a disputa terminou sem
 *    resultado, e não há vencedor a inventar. Reentrar na sala aqui seria o peer fantasma de
 *    `D-41`.
 *
 * ## Modo `online`: 15 s por cobrança, e o estouro não sai deste aparelho (`T-24`/`D-84`)
 * A regra do dono (`Q-15`) é "15 s por cobrança, e quem demorou perde". A forma óbvia — cada
 * aparelho contar 15 s e **resolver** a cobrança sozinho — reprova antes de compilar: são dois
 * relógios sem árbitro, e uma jogada que chega a 15,05 s aqui e 14,90 s lá faz os dois lados
 * resolverem a MESMA cobrança de formas diferentes, com os `MatchState` divergindo em silêncio.
 *
 * O que esta tela faz no lugar disso: aos 15 s ela **escolhe uma zona sozinha**, por
 * `createRng(newSeed())` de M1, e a manda por `choose()` como qualquer toque. O outro aparelho
 * nunca sabe que houve estouro — para ele chegou uma jogada normal —, então não há o que
 * divergir. "Perde a cobrança" vira "cobra no escuro", que pune de fato: zona sorteada contra um
 * goleiro que escolheu.
 *
 * Três consequências que valem estar escritas:
 *
 * 1. **Zero byte em `src/net` e `D-13` intacto.** Nenhum tipo novo no fio, nenhum método novo na
 *    porta congelada de M5/M6. O prazo inteiro vive em M7 — é o que torna esta a saída barata.
 * 2. **O relógio conta a escolha DESTE aparelho, não a do outro.** Depois de escolher, ele para:
 *    quem está devendo é o outro lado, e lá corre o relógio dele. Esperar é limitado por eles
 *    dois, nunca por nada que esta tela precise cronometrar.
 * 3. **Com o peer sumido (`T-22`), o relógio para.** Ali já corre o prazo de M6 e a disputa pode
 *    acabar sem resultado (`D-35`); somar um segundo contador seria cobrar pressa de quem não
 *    tem com quem jogar. Se o peer voltar dentro do prazo, a cobrança recomeça com os 15 s
 *    cheios — generoso e inofensivo, porque nada aqui decide placar.
 *
 * ## Os 4 estados
 * - **carregando** — a cena Phaser chegando por `import()`. O campo aparece sem animação e os
 *   botões já funcionam: esperar o cenário para deixar jogar seria trocar jogabilidade por enfeite.
 *   No `online` há um segundo: a espera pela escolha do outro aparelho, entre um toque e a
 *   cobrança fechar.
 * - **vazio** — não existe: uma disputa sempre tem cobrança a fazer até `phase === 'finished'`,
 *   e aí a tela troca. Lacuna declarada, não esquecida.
 * - **erro** — `createSession` recusou a configuração, `choose` recusou o toque, ou (no `online`)
 *   o outro jogador caiu. Mensagem em português, com o que fazer, e uma saída.
 * - **sucesso** — a disputa correndo.
 */

import type { Side, Zone } from '../core/index';
import { createRng, newSeed } from '../core/index';
import type { LinkStatus, MatchState, Session, SessionConfig } from '../session/index';
import { CONNECT_TIMEOUT_MS, createSession } from '../session/index';
import type { Cena } from './cena';
import { camisasDaDisputa } from './sprites';
import { criarDerivacao } from './derivacao';
import type { Vez } from './derivacao';
import { botao, el, focar, limpar } from './dom';
import { marca } from './tela_selecoes';
import {
  AVISO_COBRANCA_SORTEADA,
  AVISO_PEER_SUMIU,
  PRAZO_COBRANCA_MS,
  SEGUNDOS_DE_PRESSA,
  ZONAS,
  descricaoFase,
  instrucao,
  instrucaoDoSorteio,
  nomeSelecao,
  nomeZona,
  placar,
  avisoDePressa,
  segundosRestantes,
  textoDaEspera,
  textoDoPrazo,
  resultadoUltimaCobranca,
  rotuloZona,
  sorteioDoPrimeiro,
} from './rotulos';
import type { Contexto, Partida, Tela } from './rotas';

/** Atalhos de teclado sobre o mesmo `<button>` do toque — nenhum caminho de entrada paralelo. */
const TECLAS: Readonly<Record<string, Zone>> = {
  ArrowLeft: 'L',
  ArrowDown: 'C',
  ArrowUp: 'C',
  ArrowRight: 'R',
  '1': 'L',
  '2': 'C',
  '3': 'R',
};

function configDaPartida(p: Partida): SessionConfig {
  // `exactOptionalPropertyTypes` está ligado, e `createSession` recusa `level` fora do modo
  // `cpu`. Montar o objeto em dois ramos é o que impede `level: undefined` de ser passado —
  // que, para o TypeScript deste projeto, não é o mesmo que não passar `level`.
  if (p.modo === 'cpu' && p.nivel !== null) {
    return { mode: 'cpu', seed: p.semente, level: p.nivel, teams: p.times, localSide: p.ladoLocal };
  }
  // `online` sem sessão pronta não é caminho do jogo — a tela de convite sempre entrega a dela
  // (`T-21`). Ainda assim a configuração é montada com `roomId`, e nunca sem: o ramo sem
  // `roomId` de M5 abriria uma sala que ninguém consegue convidar.
  if (p.modo === 'online' && p.sala !== null) {
    return { mode: 'online', seed: p.semente, teams: p.times, localSide: p.ladoLocal, roomId: p.sala };
  }
  return { mode: 'local', seed: p.semente, teams: p.times, localSide: p.ladoLocal };
}

/**
 * @param pronta a sessão que a tela de convite já conectou (`online`), ou `null` para esta tela
 *               criar a sua. `null` no `online` cai no estado de erro — e cai de propósito, em
 *               vez de abrir um canal por conta própria fora do controle de `D-75`.
 */
export const telaCobranca =
  (partida: Partida, pronta: Session | null = null): Tela =>
  (raiz: HTMLElement, ctx: Contexto) => {
    // `tela--disputa` é a declaração de largura de desktop desta tela (`D-86`): acima de 1024px
    // a folha vai a 760px e o campo cresce pela ALTURA disponível, não pela largura. O número é
    // menor que o das telas de duas colunas de propósito — `.campo` tem proporção fixa, e numa
    // folha de 1040px ele sozinho passaria da dobra de um monitor de 800.
    const tela = el('section', { classe: 'tela tela--disputa' });
    raiz.append(tela);

    const online = partida.modo === 'online';

    // ── Estado de ERRO na criação ─────────────────────────────────────────────────────────
    let sessao: Session;
    try {
      if (online && pronta === null) throw new Error('online sem sessão conectada');
      sessao = pronta ?? createSession(configDaPartida(partida));
    } catch {
      tela.append(
        el('h1', { classe: 'titulo', texto: 'Não foi possível começar' }),
        el('div', { classe: 'aviso', dados: { tom: 'erro' } }, [
          el('p', { texto: 'A disputa não pôde ser criada com essas escolhas.' }),
          el('p', { classe: 'sub', texto: 'Volte e escolha as seleções de novo.' }),
        ]),
        botao('Voltar ao início', 'botao empurra', () => ctx.ir({ nome: 'inicio' })),
      );
      return () => undefined;
    }

    const derivacao = criarDerivacao(partida.modo, partida.ladoLocal);
    let estado: MatchState = sessao.state();
    let apresentados = 0;
    let travado = false;
    let cena: Cena | null = null;
    let vivo = true;
    // Com o diálogo de saída aberto, os atalhos de teclado precisam calar: `ArrowLeft` chegaria
    // ao `document` por cima do modal e cobraria um pênalti atrás dele.
    let dialogoAberto = false;

    // ── Só o modo `online` usa daqui para baixo ───────────────────────────────────────────
    /** Este aparelho já escolheu nesta cobrança e espera a do outro. */
    let aguardandoPeer = false;
    /** Uma cobrança está sendo animada agora — nem a rede nem o toque começam outra por cima. */
    let apresentando = false;
    /**
     * `true` enquanto a pilha de `choose()` está aberta.
     *
     * M5 notifica de dentro de `choose()` **e** de dentro da rede, pelo mesmo assinante. Sem esta
     * marca, a notificação da própria escolha seria tratada como jogada do peer e a tela
     * destrancaria as zonas antes de a cobrança fechar — que é exatamente o toque a mais que M5
     * recusa em voz alta.
     */
    let emChoose = false;
    /** O peer caiu depois de conectado: `D-35`, disputa encerrada SEM resultado. */
    let caiu = false;
    /**
     * `T-22`: o instante (relógio local) em que o prazo de M6 acaba, ou `null` fora da espera.
     *
     * Ele nasce quando M5 avisa `'waiting'` — o peer saiu e M6 rearmou o timer — e morre quando
     * o peer volta (`'connected'`) ou quando a disputa acaba. O relógio daqui não é o de M6: os
     * dois começam no mesmo evento, e é isso que faz o número da tela valer. Não é sincronizado
     * ao milissegundo, e não precisa ser — a tela nunca decide o fim, só o conta.
     */
    let prazoDaEspera: number | null = null;
    let tiqueDaEspera: ReturnType<typeof setInterval> | null = null;

    /**
     * `T-24`: o instante (relógio local) em que os 15 s desta cobrança acabam, ou `null` quando
     * não há prazo correndo — porque a vez não é de escolher, porque este aparelho já escolheu,
     * ou porque o peer sumiu e quem conta agora é `prazoDaEspera`.
     */
    let prazoDaCobranca: number | null = null;
    let tiqueDaCobranca: ReturnType<typeof setInterval> | null = null;
    /**
     * Qual cobrança o relógio vigia — `estado.kicks.length` no instante em que ele armou.
     *
     * É o que torna `armarRelogio()` idempotente: `desenhar()` roda a cada notificação de M5, e
     * sem esta marca cada notificação sem novidade devolveria o prazo cheio a quem já gastou 14 s.
     */
    let cobrancaDoRelogio: number | null = null;
    /** O aviso falado dos últimos segundos já saiu nesta cobrança. */
    let avisouDaPressa = false;
    /** A última escolha deste aparelho saiu do relógio, não do dedo. */
    let sorteada = false;

    // ── Esqueleto ─────────────────────────────────────────────────────────────────────────
    const numeros = el('span', { classe: 'placar__numeros', texto: placar(estado) });
    const ladoA = el('span', { classe: 'placar__lado' }, [
      marca(partida.times.A),
      el('span', { texto: nomeSelecao(partida.times.A) }),
    ]);
    const ladoB = el('span', { classe: 'placar__lado placar__lado--direita' }, [
      marca(partida.times.B),
      el('span', { texto: nomeSelecao(partida.times.B) }),
    ]);
    const cabecalho = el('div', { classe: 'placar', attrs: { role: 'status' } }, [
      ladoA,
      numeros,
      ladoB,
    ]);

    // ── O sorteio de `D-48`, dito antes da 1ª cobrança ────────────────────────────────────
    // Sem toque a mais: o painel nasce junto com a tela e sai sozinho quando a disputa começa. O
    // fluxo crítico de `tela_inicio.ts` continua fechando em 2 toques, que é o portão de UX
    // declarado lá — um "ok, entendi" aqui seria o terceiro.
    const sorteioMarca = el('span', { classe: 'sorteio__marca' });
    const sorteioTexto = el('p', { classe: 'sorteio__texto' });
    const sorteioSub = el('p', { classe: 'sub' });
    const sorteio = el('div', { classe: 'sorteio' }, [
      sorteioMarca,
      el('div', { classe: 'sorteio__corpo' }, [sorteioTexto, sorteioSub]),
    ]);
    sorteio.hidden = true;
    // O painel está na tela AGORA? Só isso — e serve à moeda de `T-26` e à sobreposição de
    // `T-28`: as duas nascem na transição escondido -> visível, nunca a cada desenho. Ver
    // `anunciarSorteio`.
    let sorteioNaTela = false;
    /** A sobreposição de tela cheia de `T-28`, enquanto ela existe. */
    let sobreposicao: HTMLElement | null = null;
    /** Rede de segurança da sobreposição: ver `mostrarSorteioCheio`. */
    let fimDaSobreposicao: ReturnType<typeof setTimeout> | null = null;

    const canvasPai = el('div', { classe: 'campo__canvas' });
    const semCanvas = el('p', {
      classe: 'campo__sem-canvas',
      texto: 'Preparando o campo — já dá para jogar.',
    });
    const zonas = el('div', { classe: 'zonas' });
    const campo = el('div', { classe: 'campo' }, [canvasPai, semCanvas, zonas]);

    const fase = el('p', { classe: 'sub' });
    const faixa = el('p', { classe: 'faixa', attrs: { role: 'status', 'aria-live': 'polite' } });
    // O contador de `T-22`. `aria-live` **desligado** de propósito: uma região viva que muda a
    // cada segundo faria o leitor de tela recitar o número sem parar por cima de tudo. Quem usa
    // leitor ouve a faixa acima, que anuncia UMA vez que o outro jogador parou de responder.
    const contador = el('p', { classe: 'sub', attrs: { 'aria-live': 'off' } });
    contador.hidden = true;
    // O relógio de `T-24`, pelo mesmo motivo com `aria-live` desligado: número que muda a cada
    // segundo faz o leitor de tela recitar sem parar. Quem usa leitor ouve a faixa, que avisa
    // UMA vez quando faltam poucos segundos (`avisouDaPressa`).
    const relogio = el('p', { classe: 'sub', attrs: { 'aria-live': 'off' } });
    relogio.hidden = true;
    const erro = el('div', { classe: 'aviso', dados: { tom: 'erro' } });
    erro.hidden = true;

    const botoesZona = new Map<Zone, HTMLButtonElement>();
    for (const zona of ZONAS) {
      const b = botao(nomeZona(zona).toUpperCase(), 'zona', () => escolher(zona));
      botoesZona.set(zona, b);
      zonas.append(b);
    }

    const sair = botao('Sair da disputa', 'botao botao--discreto', pedirParaSair);

    tela.append(
      cabecalho,
      fase,
      sorteio,
      campo,
      faixa,
      contador,
      relogio,
      erro,
      // `grupo` além de `empurra` (`QA-31`): sem ele este `<div>` é bloco, e `<button>` não
      // estica dentro de bloco — o "Sair da disputa" saía com 144px em qualquer viewport,
      // enquanto o "Voltar" de toda outra tela ocupa a linha inteira. `.grupo` é flex de coluna,
      // e é isso que faz o botão herdar a largura, exatamente como nas demais telas.
      el('div', { classe: 'grupo empurra' }, [sair]),
    );

    // ── Desenho ───────────────────────────────────────────────────────────────────────────

    function travarZonas(valor: boolean): void {
      for (const b of botoesZona.values()) b.disabled = valor;
    }

    /**
     * O painel do sorteio, enquanto ele ainda é notícia.
     *
     * No modo `local` ele sai já no primeiro toque, e não só na 1ª cobrança resolvida: entre o
     * chute e a defesa o aparelho já trocou de mão, e a frase "quem cobra fica com o aparelho"
     * estaria dizendo a quem defende para fazer o contrário do que a tela pede.
     */
    function anunciarSorteio(vez: Vez): void {
      const anuncio = sorteioDoPrimeiro(estado, partida.times);
      if (anuncio === null || vez.pendente) {
        esconderSorteio();
        return;
      }

      // A marca só é RECONSTRUÍDA quando o painel entra na tela, e é isso que faz a moeda de
      // `T-26` girar uma vez. `desenhar()` roda a cada notificação do motor — no `online` são
      // várias antes do 1º toque —, e reconstruir aqui a cada passagem recomeçaria o giro no
      // meio dele: movimento aparente onde `D-65` pede o mínimo. O lado sorteado não muda
      // enquanto o painel está na tela (M5 sorteia uma vez, na criação da sessão, `D-48`), então
      // não há retrato velho a corrigir; os dois textos abaixo seguem sendo reescritos sempre.
      const entrando = !sorteioNaTela;
      if (entrando) {
        limpar(sorteioMarca);
        sorteioMarca.append(marca(partida.times[anuncio.lado]));
        sorteioNaTela = true;
      }

      sorteioTexto.textContent = `Sorteio: ${anuncio.texto}.`;
      sorteioSub.textContent = instrucaoDoSorteio(partida.modo, vez.papel);
      sorteio.hidden = false;

      // A sobreposição de `T-28` nasce SÓ aqui, depois de o painel estar visível — ela precisa
      // medir para onde encolher, e um painel `hidden` mede zero. O guarda é o mesmo de `D-85`,
      // e pelo mesmo motivo: `aoNotificacaoDeRede()` chama `desenhar()` sem novidade no
      // `online`, e sem `entrando` a bandeira recomeçaria de tela cheia antes do 1º toque.
      if (entrando) mostrarSorteioCheio(anuncio.lado, anuncio.texto);
    }

    /** Nada do sorteio fica na tela: nem o painel, nem a sobreposição no meio do caminho. */
    function esconderSorteio(): void {
      sorteio.hidden = true;
      sorteioNaTela = false;
      tirarSobreposicao();
    }

    function tirarSobreposicao(): void {
      if (fimDaSobreposicao !== null) {
        clearTimeout(fimDaSobreposicao);
        fimDaSobreposicao = null;
      }
      sobreposicao?.remove();
      sobreposicao = null;
    }

    /**
     * `T-28`/`P-8`: a bandeira de quem cobra primeiro em tela cheia, girando e encolhendo para o
     * painel de `D-49`.
     *
     * **Não custa toque, e é por isso que não reabre `D-49`** (o mesmo argumento de `D-85`): ela
     * nasce sozinha com a tela e sai sozinha. O fluxo crítico continua fechando em 2 toques.
     *
     * **O toque não se perde durante ela** — item (2) do portão de `A-29`, e o defeito clássico
     * de sobreposição em tela cheia. A defesa é `pointer-events: none` na folha, não um
     * `addEventListener` de saída: sem alvo, o dedo atravessa e chega no botão de zona que está
     * embaixo, inclusive no primeiro quadro. Uma saída ao toque ainda perderia ESSE toque.
     *
     * **Para onde ela encolhe é medido, não chutado:** o centro do painel já visível, em
     * coordenadas de viewport, vira `--para-x`/`--para-y`. A medida sai ANTES do `append` para
     * não haver segundo cálculo de layout, e o `> 0` cobre o caso de o painel não ter caixa.
     */
    function mostrarSorteioCheio(lado: Side, texto: string): void {
      tirarSobreposicao();

      const alvo = sorteioMarca.getBoundingClientRect();
      const estilo: Record<string, string> = {};
      if (alvo.width > 0) {
        estilo['--para-x'] = `${Math.round(alvo.left + alvo.width / 2 - window.innerWidth / 2)}px`;
        estilo['--para-y'] = `${Math.round(alvo.top + alvo.height / 2 - window.innerHeight / 2)}px`;
      }

      const moeda = el('div', { classe: 'sorteio-cheio__moeda' }, [
        marca(partida.times[lado]),
        el('p', { classe: 'sorteio-cheio__texto', texto }),
      ]);
      // `aria-hidden` porque o painel logo abaixo diz a MESMA frase na árvore de acessibilidade:
      // sem isto quem usa leitor de tela ouve o sorteio duas vezes, e a segunda some sozinha.
      const sobre = el('div', { classe: 'sorteio-cheio', estilo, attrs: { 'aria-hidden': 'true' } }, [
        moeda,
      ]);

      moeda.addEventListener('animationend', tirarSobreposicao);
      // Rede de segurança, e ela existe por medida: em `T-26` a pane escondida do navegador não
      // compõe, e `animation.finished` nunca resolveu lá. Sobreposição de tela cheia presa por
      // um evento que não chega seria pior que a que não existe — o relógio a tira de todo jeito.
      fimDaSobreposicao = setTimeout(tirarSobreposicao, 2600);
      sobreposicao = sobre;
      raiz.append(sobre);
    }

    function desenhar(): void {
      numeros.textContent = placar(estado);
      fase.textContent = descricaoFase(estado);

      const vez = derivacao.vez(estado);
      if (vez === null) {
        esconderSorteio();
        travarZonas(true);
        pararRelogio();
        return;
      }

      anunciarSorteio(vez);

      // Quem está com o aparelho na mão, em destaque no placar. Em `online` é sempre o lado
      // deste aparelho — o outro está em outro aparelho, e destacá-lo aqui seria apontar para
      // uma pessoa que não está na sala.
      const emFoco: Side = partida.modo === 'local' ? vez.lado : partida.ladoLocal;
      ladoA.dataset['vez'] = emFoco === 'A' ? 'sim' : 'nao';
      ladoB.dataset['vez'] = emFoco === 'B' ? 'sim' : 'nao';

      for (const [zona, b] of botoesZona) {
        b.setAttribute('aria-label', rotuloZona(zona, vez.papel));
        // `T-28`/`P-6`(a): o papel deixa de vir só de TEXTO. `data-papel` liga dois canais na
        // folha ao mesmo tempo — a cor da borda da zona e, ao lado dela, uma FORMA (triângulo
        // para chutar, arco para defender). Cor sozinha reprovaria em daltonismo, e nenhuma cor
        // nova entra na paleta: os dois tons já são `--acento` e `--atencao`, que `T-20` já
        // mede. O `aria-label` acima continua sendo o canal de quem usa leitor de tela.
        b.dataset['papel'] = vez.papel;
      }
      travarZonas(travado);

      if (vez.pendente) {
        pararRelogio();
        // Modo `local`, entre chute e defesa. Nenhuma pista da zona escolhida — ver o cabeçalho.
        faixa.dataset['tom'] = 'atencao';
        faixa.textContent = `Passe o aparelho: ${nomeSelecao(partida.times[vez.lado])} defende.`;
        return;
      }

      if (prazoDaEspera !== null) {
        // ── `T-22` ────────────────────────────────────────────────────────────────────────
        // Sobrepõe "Escolha enviada. Esperando o outro jogador…" **de propósito**: quando o
        // peer sumiu, a frase de espera vira mentira por omissão — ela sugere alguém pensando
        // do outro lado. As zonas NÃO são trancadas aqui: o peer ainda pode voltar dentro do
        // prazo, e M6 escoa a fila de jogadas na volta.
        faixa.dataset['tom'] = 'atencao';
        faixa.textContent = AVISO_PEER_SUMIU;
        // `T-24`: o relógio da cobrança cala enquanto o de `T-22` conta. Ver o cabeçalho.
        pararRelogio();
        pintarContador();
        return;
      }

      if (aguardandoPeer) {
        // ── Estado de CARREGANDO do `online` ────────────────────────────────────────────
        // A escolha já foi enviada; o que falta é a do outro aparelho. Zonas continuam
        // trancadas: M5 recusa a segunda escolha da mesma cobrança, e um segundo toque aqui
        // viraria estado de erro por algo que a pessoa não fez de errado.
        // `T-24`: escolhido, o prazo deste aparelho acabou de existir — quem deve agora é o
        // outro lado, e o relógio que o cobra corre no aparelho dele.
        pararRelogio();
        faixa.dataset['tom'] = 'atencao';
        faixa.textContent = sorteada ? AVISO_COBRANCA_SORTEADA : 'Escolha enviada. Esperando o outro jogador…';
        return;
      }

      const resultado = resultadoUltimaCobranca(estado);
      faixa.dataset['tom'] = 'neutro';
      faixa.textContent =
        apresentados > 0 && resultado !== null
          ? `${resultado} ${instrucao(vez.papel)}.`
          : instrucao(vez.papel) + '.';

      // A vez é de escolher e ninguém está esperando animação: é aqui, e só aqui, que os 15 s
      // de `T-24` começam a correr.
      armarRelogio();
    }

    function mostrarErroDeToque(): void {
      limpar(erro);
      erro.hidden = false;
      erro.append(
        el('p', { texto: 'Não foi possível registrar o toque.' }),
        el('p', { classe: 'sub', texto: 'Toque em uma das três áreas de novo.' }),
      );
    }

    // ── Cobrança ──────────────────────────────────────────────────────────────────────────

    /**
     * Anima e sonoriza a cobrança que acabou de ser resolvida.
     *
     * Roda DEPOIS de `choose()` ter voltado, e por isso não interfere na propagação de erro que
     * M5 promete para assinante que explode.
     */
    async function apresentar(): Promise<void> {
      const kick = estado.kicks[estado.kicks.length - 1];
      if (kick === undefined) return;

      ctx.som.tocar('chute');
      // `kick.side` e quem COBROU: o goleiro e o outro lado, e e dele a camisa que a cena veste.
      if (cena !== null) await cena.animar(kick.shot, kick.dive, kick.goal, kick.side);
      if (!vivo) return;

      ctx.som.tocar(kick.goal ? 'gol' : 'defesa');
      apresentados = estado.kicks.length;
      // Ja vestido para a PROXIMA cobranca: `turn` e quem cobra agora, e `null` no fim da disputa
      // deixa em cena as cores da ultima — trocar de camisa num campo parado pareceria defeito.
      cena?.repousar(estado.turn);
    }

    function escolher(zona: Zone): void {
      if (travado || !vivo) return;
      travado = true;
      travarZonas(true);
      // `T-24`: o toque chegou dentro do prazo — o relógio não tem mais o que cobrar. Se
      // `choose()` recusar, `desenhar()` arma um prazo novo e cheio: erro que a pessoa não
      // cometeu não pode comer o tempo dela.
      pararRelogio();
      erro.hidden = true;

      const antes = estado.kicks.length;
      try {
        emChoose = true;
        sessao.choose(zona);
      } catch {
        // ── Estado de ERRO no toque ───────────────────────────────────────────────────────
        travado = false;
        mostrarErroDeToque();
        desenhar();
        return;
      } finally {
        emChoose = false;
      }

      const houveCobranca = estado.kicks.length > antes;

      if (!houveCobranca) {
        if (online) {
          // A jogada foi para o canal e a cobrança fecha quando a do peer chegar — por
          // notificação de rede, em `aoNotificacaoDeRede`. `travado` FICA ligado: destravar
          // aqui deixaria a pessoa tocar de novo, e a segunda escolha da mesma cobrança é
          // erro que M5 lança.
          aguardandoPeer = true;
          desenhar();
          return;
        }
        // Modo `local`, chute guardado dentro de M5: nada a animar, só a troca de mãos.
        seguir();
        return;
      }

      apresentando = true;
      void apresentar().then(seguir, seguir);
    }

    /** O que roda quando a cobrança fechou — vinda do toque ou da rede — e a tela pode andar. */
    function seguir(): void {
      apresentando = false;
      if (!vivo) return;
      travado = false;
      aguardandoPeer = false;
      sorteada = false;

      if (estado.phase === 'finished') {
        ctx.ir({ nome: 'fim', partida, estado });
        return;
      }
      desenhar();
    }

    // ── Rede: a outra metade da cobrança chega por aqui (modo `online`) ────────────────────

    /**
     * Uma notificação de M5 que NÃO veio do toque deste aparelho.
     *
     * Três coisas chegam por aqui, e só a primeira mexe na disputa: a jogada do peer fechando a
     * cobrança, a troca de status do canal, e notificação sem novidade nenhuma. A terceira é
     * comum e é de propósito — M5 notifica por evento, não por mudança de placar.
     */
    function aoNotificacaoDeRede(status: LinkStatus): void {
      if (!vivo || !online) return;

      if (status === 'failed' && !caiu) {
        mostrarQueda();
        return;
      }

      // `T-22`: o peer sumiu (`'waiting'`) ou voltou (`'connected'`). Nada disso mexe na
      // disputa — só no que a tela conta. `'failed'` já saiu acima, e `D-80`/`D-81` chegam
      // por ele **sem passar por `'waiting'`**: a queda sintetizada não espera relógio nenhum,
      // e é por isso que ela nunca mostra prazo em tela.
      if (status === 'waiting') comecarEspera();
      else if (status === 'connected') pararEspera();

      // Cobrança nova já animada, ou animação em curso: nada a fazer. `apresentados` só avança
      // no fim de `apresentar()`, então esta comparação não dispara duas animações da mesma.
      if (apresentando || estado.kicks.length === apresentados) {
        desenhar();
        return;
      }

      apresentando = true;
      void apresentar().then(seguir, seguir);
    }

    // ── `T-24`: o relógio dos 15 s da cobrança (só `online`) ──────────────────────────────

    /**
     * Arma o prazo desta cobrança, se ainda não estiver armado.
     *
     * Idempotente por `cobrancaDoRelogio`: chamada de novo para a MESMA cobrança não devolve
     * segundos a quem já os gastou. Tique de 250 ms pelo motivo de `T-22` — a virada do segundo
     * na tela não pode atrasar até um segundo inteiro atrás do relógio real.
     */
    function armarRelogio(): void {
      if (!online || !vivo || caiu || travado) {
        pararRelogio();
        return;
      }
      const cobranca = estado.kicks.length;
      if (prazoDaCobranca !== null && cobrancaDoRelogio === cobranca) return;

      pararRelogio();
      cobrancaDoRelogio = cobranca;
      avisouDaPressa = false;
      prazoDaCobranca = Date.now() + PRAZO_COBRANCA_MS;
      tiqueDaCobranca = setInterval(pintarRelogio, 250);
      pintarRelogio();
    }

    function pararRelogio(): void {
      if (tiqueDaCobranca !== null) {
        clearInterval(tiqueDaCobranca);
        tiqueDaCobranca = null;
      }
      prazoDaCobranca = null;
      cobrancaDoRelogio = null;
      relogio.hidden = true;
      relogio.textContent = '';
      delete relogio.dataset['tom'];
    }

    /** Pinta os segundos que faltam; em zero, cobra no escuro. */
    function pintarRelogio(): void {
      if (!vivo || prazoDaCobranca === null) return;

      const faltam = segundosRestantes(prazoDaCobranca, Date.now());
      relogio.textContent = textoDoPrazo(faltam);
      relogio.hidden = false;

      if (faltam <= SEGUNDOS_DE_PRESSA) {
        relogio.dataset['tom'] = 'atencao';
        if (!avisouDaPressa) {
          // UMA vez, e na faixa — que é a região viva. É o que quem não está olhando o número
          // recebe; repetir a cada tique tornaria o leitor de tela inútil no resto da tela.
          avisouDaPressa = true;
          faixa.dataset['tom'] = 'atencao';
          faixa.textContent = avisoDePressa(faltam);
        }
      }

      if (faltam === 0) cobrarNoEscuro();
    }

    /**
     * O estouro, resolvido DENTRO deste aparelho: zona sorteada, mandada como jogada normal.
     *
     * `newSeed()` e não a semente da partida: a semente da disputa é acordada entre os dois
     * aparelhos e reproduzir a sequência dela aqui daria ao outro lado como adivinhar a zona. O
     * acaso do estouro é local e descartável, e por isso nasce e morre nesta linha.
     */
    function cobrarNoEscuro(): void {
      pararRelogio();
      if (!vivo || !online || caiu || travado || apresentando || aguardandoPeer) return;

      const zona = ZONAS[createRng(newSeed()).int(ZONAS.length)];
      if (zona === undefined) return;
      sorteada = true;
      escolher(zona);
    }

    // ── `T-22`: o contador do prazo ───────────────────────────────────────────────────────

    /** Pinta os segundos que faltam. Em zero para o tique e deixa a frase de encerramento. */
    function pintarContador(): void {
      if (!vivo || prazoDaEspera === null) return;

      const faltam = segundosRestantes(prazoDaEspera, Date.now());
      contador.textContent = textoDaEspera(faltam);
      contador.hidden = false;

      if (faltam === 0) pararTique();
    }

    function pararTique(): void {
      if (tiqueDaEspera === null) return;
      clearInterval(tiqueDaEspera);
      tiqueDaEspera = null;
    }

    /**
     * O peer saiu e o prazo de M6 começou a correr.
     *
     * Um `'waiting'` repetido **não** reinicia o relógio: M6 rearma o timer dele no
     * `onPeerLeave`, e cada reinício aqui daria à pessoa um prazo maior do que o que existe.
     * O tique é de 250 ms para a virada do segundo na tela não atrasar até um segundo inteiro
     * atrás do relógio real — o número vem de `Date.now()`, não de uma contagem acumulada.
     */
    function comecarEspera(): void {
      if (prazoDaEspera !== null) return;
      prazoDaEspera = Date.now() + CONNECT_TIMEOUT_MS;
      tiqueDaEspera = setInterval(pintarContador, 250);
      pintarContador();
    }

    /** O peer voltou, ou a disputa acabou: nenhum número fica preso na tela. */
    function pararEspera(): void {
      pararTique();
      prazoDaEspera = null;
      contador.hidden = true;
      contador.textContent = '';
    }

    /**
     * O peer caiu depois de conectado — `D-35`: a disputa terminou **sem resultado**.
     *
     * Não vai para a tela de fim: lá o desfecho sem vencedor é tratado como o que não deveria
     * acontecer ("Isso não deveria acontecer"), e aqui ele é o caso normal de uma conexão P2P
     * sem árbitro — a lacuna que [[online_p2p]] declara. Nada de "tentar de novo": a sala já foi
     * solta por M6 (`'failed'` é terminal, `D-31`) e reentrar nela é o peer fantasma de `D-41`.
     */
    function mostrarQueda(): void {
      caiu = true;
      pararEspera();
      pararRelogio();
      aguardandoPeer = false;
      travado = true;
      travarZonas(true);
      esconderSorteio();
      faixa.hidden = true;

      limpar(erro);
      erro.hidden = false;
      erro.append(
        el('p', { texto: 'O outro jogador saiu da disputa.' }),
        el('p', {
          classe: 'sub',
          texto: 'A disputa terminou sem resultado — o placar até aqui não vale como vitória.',
        }),
        botao('Voltar ao início', 'botao botao--principal', () => ctx.ir({ nome: 'inicio' })),
      );
      focar(erro.querySelector<HTMLButtonElement>('button'));
    }

    // ── Sair: ação irreversível, logo confirmação explícita ───────────────────────────────

    function pedirParaSair(): void {
      const anterior = document.activeElement;

      const caixa = el('div', { classe: 'dialogo__caixa' });
      const dialogo = el(
        'div',
        { classe: 'dialogo', attrs: { role: 'dialog', 'aria-modal': 'true' } },
        [caixa],
      );

      const fechar = (): void => {
        dialogoAberto = false;
        dialogo.remove();
        document.removeEventListener('keydown', naTecla);
        if (anterior instanceof HTMLElement) focar(anterior);
      };

      const naTecla = (ev: KeyboardEvent): void => {
        if (ev.key === 'Escape') fechar();
      };

      const cancelar = botao('Continuar jogando', 'botao botao--principal', fechar);
      caixa.append(
        el('h2', { texto: 'Sair da disputa?' }),
        el('p', {
          texto: 'Isso encerra a disputa em andamento. O placar não é guardado e não dá para voltar.',
        }),
        cancelar,
        botao('Sair mesmo assim', 'botao botao--perigo', () => {
          fechar();
          ctx.ir({ nome: 'inicio' });
        }),
      );

      dialogoAberto = true;
      document.addEventListener('keydown', naTecla);
      raiz.append(dialogo);
      focar(cancelar);
    }

    // ── Ligações ──────────────────────────────────────────────────────────────────────────

    const cancelarAssinatura = sessao.subscribe((s: MatchState, status: LinkStatus) => {
      estado = s;
      derivacao.aoNotificar(s);
      // Notificação de dentro do próprio `choose()` já tem quem a trate, logo abaixo dele. Só o
      // que vem de FORA da pilha do toque — a jogada do peer, a queda do canal — passa daqui.
      if (!emChoose) aoNotificacaoDeRede(status);
    });

    const naTeclaGlobal = (ev: KeyboardEvent): void => {
      if (dialogoAberto) return;
      const alvo = ev.target;
      // Não sequestra a tecla de quem está num controle: `ArrowLeft` num rádio muda a escolha.
      if (alvo instanceof HTMLInputElement) return;
      const zona = TECLAS[ev.key];
      if (zona === undefined) return;
      ev.preventDefault();
      focar(botoesZona.get(zona) ?? null);
      escolher(zona);
    };
    document.addEventListener('keydown', naTeclaGlobal);

    // ── Estado CARREGANDO: a cena chega depois, e a disputa não espera por ela ────────────
    void import('./cena')
      .then(async ({ montarCena }) => {
        if (!vivo) return;
        cena = await montarCena(canvasPai);
        if (!vivo) {
          cena.destruir();
          cena = null;
          return;
        }
        // A camisa vem da COR NACIONAL da selecao (`T-29`/`D-88`), e o desempate por padrao ja
        // vem resolvido de `camisasDaDisputa` — funcao pura sobre os dois codigos, entao os dois
        // aparelhos do `online` chegam ao mesmo resultado sem trocar nada pelo fio.
        //
        // **O disco do placar NAO mudou, e isso e escolha declarada:** ele mostra a bandeira desde
        // `T-19`, e o matiz de `marcaSelecao` fica invisivel embaixo dela. Mexer nele custaria
        // todas as telas e nao mudaria um pixel do que a pessoa ve.
        cena.definirCamisas(camisasDaDisputa(partida.times.A, partida.times.B));
        cena.repousar(sessao.state().turn);
        semCanvas.hidden = true;
      })
      .catch(() => {
        if (!vivo) return;
        // Cenário é enfeite; disputa é o jogo. Nada técnico na tela, e nenhum modo local
        // degradando junto com um pacote que não chegou.
        semCanvas.textContent = 'Campo simplificado — o jogo continua igual.';
      });

    desenhar();
    focar(botoesZona.get('C') ?? null);

    return () => {
      vivo = false;
      tirarSobreposicao();
      pararEspera();
      pararRelogio();
      document.removeEventListener('keydown', naTeclaGlobal);
      cancelarAssinatura();
      sessao.dispose();
      cena?.destruir();
      cena = null;
    };
  };
