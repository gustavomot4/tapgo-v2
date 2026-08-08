---
tags: [decisoes, arquivo]
status: arquivado
---
# Arquivo de decisões — íntegra das linhas retiradas de `c_decisions.md`

> **Este arquivo não define ID.** Quem define `D-NN` continua sendo `a_context/c_decisions.md`, e
> cada decisão arquivada mantém lá uma linha `ARQUIVADO` com o resumo e o ponteiro para cá. Isso é
> o que preserva o ID: `D-01` citado em oito arquivos continua resolvendo, e `check.py` continua
> achando a definição na coluna 1 da tabela do `c_decisions.md`.
>
> Motivo do arquivamento: `c_decisions.md` chegou a 11.782/12.000 caracteres — 218 de folga, menos
> que uma linha de decisão. A íntegra das cinco primeiras decisões (as mais longas e as mais
> estáveis, todas de 2026-08-06 e nenhuma revertida) mora aqui.
>
> **Somente leitura.** Reverter uma decisão arquivada é linha nova em `c_decisions.md` com
> `SUPERSEDE D-XX`, nunca edição aqui.

## D-01 … D-05 — íntegra como estavam em `c_decisions.md`

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-01` | 2026-08-06 | ADOTADO | Forma = SPA estática, sem backend; motor de regras puro isolado do render | Restrição "custo R$ 0" elimina servidor; motor isolado deixa CPU/2P/online usarem a mesma regra |
| `D-02` | 2026-08-06 | ADOTADO | Stack = TypeScript + Vite + Phaser 3 | Phaser min+gzip ~345 KB, folgado no teto de 8 MB; TS pega em compilação o `fezGOl` da v1 — ver [[regras_partida]] |
| `D-03` | 2026-08-06 | ADOTADO | Identidade de time = país ISO-3166 + bandeira; nenhum escudo | Lei Pelé art. 87 protege símbolo de clube e federação sem registro — ver [[licenciamento]] |
| `D-04` | 2026-08-06 | ADOTADO | Online = P2P WebRTC, sinalização por infra pública (Trystero) | Único caminho para online a custo zero; falha para 15-30% sob CGNAT — ver [[online_p2p]] |
| `D-05` | 2026-08-06 | ADOTADO | Publicação = GitHub Pages (canônico) + itch.io (vitrine) | Ambos gratuitos para build estático; itch.io é reativa a DMCA, então não é a fonte da verdade |

## D-11, D-12, D-16 … D-18 — íntegra como estavam em `c_decisions.md`

As decisões de ferramenta, build e publicação de **E-1**, etapa fechada em 2026-08-07 e no ar.
Arquivadas em T-09 porque o registro vivo tinha 421 caracteres de folga e as decisões desta sessão
não caberiam — mesmo motivo das anteriores. O comportamento que elas descrevem não mora mais só
aqui: está em `package.json`, `vite.config.ts`, `.github/workflows/pages.yml` e
`src/scripts/bundle-size.mjs`, e o portão de M9 o reconfere a cada build.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-11` | 2026-08-07 | ADOTADO | Runner de teste = Vitest | Todo portão de módulo do [[b_plan\|PLANO]] depende de suíte, e a suíte não tinha dono; é o runner do próprio Vite (`D-02`), sem configuração extra e sem peso no bundle. Fecha AC-06 |
| `D-12` | 2026-08-07 | ADOTADO | `index.html` mora em `src/`, com `root: 'src'` e `outDir: '../dist'` no Vite | Mantém a raiz limpa que o padrão do repositório exige sem contrariar a convenção do Vite; é configuração de M9, não exceção ao padrão. Fecha AC-06 |
| `D-16` | 2026-08-07 | ADOTADO | Piso de `vitest` = `^3.2.7`, que resolve `vite@7`; **T-05 declara `vite@^7`** para não abrir uma segunda árvore | `vitest@2.1.8` trazia 5 advisories (1 CRÍTICO, 1 alto) por `vite`/`esbuild` transitivos; com `^3.2.7`, `npm audit` dá 0 e a suíte passa sem tocar em uma linha de teste. Não altera `D-11` — o runner continua Vitest, muda o piso |
| `D-17` | 2026-08-07 | ADOTADO | Publicação por GitHub Actions (`.github/workflows/pages.yml`) com `base: '/tapgo-v2/'`; o portão inteiro roda ANTES do deploy e o job que publica não recompila | `base` errado é 404 de todo asset só em produção, a falha que o contrato de M9 manda evitar. O que vai ao ar é o artefato que passou no portão, não um build novo feito em outra máquina |
| `D-18` | 2026-08-07 | ADOTADO | O número do bundle sai de `src/scripts/bundle-size.mjs`, que soma bytes do manifesto do Vite e sai com erro em 8.000.000 B; a sonda de asset é forçada a virar arquivo por `assetsInlineLimit` | O Vite embute asset < 4 kB como `data:` no HTML, e **asset embutido nunca dá 404** — o portão de E-1 passaria sozinho. Medido em T-05: inicial 4.599 B, 0,06% do teto |

## QA-01 … QA-03 — íntegra como estavam em `c_decisions.md`

Os três nasceram da passagem 1 de consistência e foram **fechados e verificados** na passagem 2
de T-03, todos em 2026-08-07. Arquivados em T-08 pelo mesmo motivo das decisões acima: achado
fechado não precisa ocupar o orçamento do registro vivo. `QA-04` continua **aberto** e, portanto,
continua inteiro no `c_decisions.md`.

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| `QA-01` | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — portão de M9 e contrato de M6 (AC-01) | "Custo R$ 0" sem portão em módulo nenhum; o relay TURN aparecia só como prosa, sem dono, sem portão e sem tarefa | Portão de custo em M9 + `IceConfig` no contrato de M6 + tabela de custo por dependência em [[stack]]; E-4 exige a decisão de TURN por escrito | 2026-08-07, verificado na passagem 2 de T-03 |
| `QA-02` | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — portão de M7 (AC-02) | "Nenhuma marca de terceiro" só era verificada onde há bandeira; M7 desenha uniforme, jogador e texto de tela e não tinha uma linha de licença | Portão de licença em M7 com escopo de `assets/` inteiro, proibição de uniforme e jogador reais, e `grep` da lista-morta de [[licenciamento]] | 2026-08-07, verificado na passagem 2 de T-03 |
| `QA-03` | 2026-08-07 | CRÍTICO | [[b_plan\|PLANO]] — portão de M9 (AC-03) | "Sem analytics de terceiro" não tinha portão em módulo nenhum: nada verificava script externo nem endpoint remoto | Portão de privacidade em M9: zero `<script>` externo no HTML publicado e zero endpoint externo fora da sinalização e do relay de M6 | 2026-08-07, verificado na passagem 2 de T-03 |

## Gatilhos de revisão que acompanham estas decisões

~~Os gatilhos de `D-01` e `D-02` **continuam em `c_decisions.md`**, na tabela "Gatilhos de revisão",
e não foram movidos: é lá que a sessão de evolução vai procurá-los, e são curtos.~~
**Superado em `A-12` por `D-43`:** a tabela "Gatilhos de revisão" saiu do `c_decisions.md`. O gatilho
de `D-01` mora em [[online_p2p]] e o de `D-02` em [[stack]] — cada um ao lado do número que o dispara,
e os dois temas já estão no Mapa do CONTEXT. O `c_decisions.md` guarda a linha-ponteiro.

## D-14, D-15, D-19, D-20, D-22, D-23, D-26 … D-28 — íntegra como estavam em `c_decisions.md`

As decisões de implementação de **E-2 e E-3**, todas de módulo entregue e portão fechado
(M1 em T-04, M2 em T-06, M3 em T-07, M4 em T-08, M5 em T-09, M7 em T-10). Arquivadas em T-11
porque o registro vivo tinha **7 caracteres** de folga — menos que uma palavra — e as decisões
de M6 não caberiam. Mesmo critério das duas passagens anteriores: sai a íntegra, fica o ID com
resumo e ponteiro.

O comportamento que elas descrevem não mora mais só aqui: está em `src/core/index.ts`,
`src/engine/index.ts`, `src/cpu/index.ts`, `src/data/teams.ts`, `src/session/index.ts` e
`src/ui/`, e a suíte o reconfere a cada `npm test`.

**Ficaram vivas de propósito:** `D-24` e `D-25` (contrato de M6/M5 no modo online — é o que T-11
toca agora) e as três rejeições `D-06`..`D-08`, que são curtas e existem justamente para não
serem re-propostas.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-14` | 2026-08-07 | ADOTADO | `package.json` e `tsconfig.json` nascem em T-04; `vite.config.ts` e o workflow do Pages continuam de M9 (T-05) | O PLANO põe T-04 antes de T-05, e sem runner instalado o portão de M1 não roda — `D-11` já dera dono à suíte, faltava o arquivo. M9 mantém intacto o que o contrato lhe atribui: `base`, `root`, `outDir` e o número do bundle |
| `D-15` | 2026-08-07 | ADOTADO | `createRng` recusa semente que não seja inteiro seguro; semente efetiva é módulo 2^32 | O contrato dizia só `seed: number`, e semente `1.5` ou `NaN` quebraria o determinismo sem erro visível — falha alta é mais barata que sequência silenciosamente errada. Limite declarado: `0` e `2**32` são a mesma semente, e `newSeed()` devolve dentro de `[0, 2^32)` |
| `D-19` | 2026-08-07 | ADOTADO | `play` reconfere o estado recebido contra o próprio histórico de cobranças e **lança** quando não fecha, em vez de calcular sobre estado torto | `goals`/`taken` deixam de ser um resumo em que se confia e passam a ser total reconferível: é o lugar mais forte disponível sem banco, e cobre o defeito 5 da v1 na raiz. Torna M2 o ponto de validação do estado que chega pela rede em M6 — M5/M6 tratam a exceção, não a duplicam |
| `D-20` | 2026-08-07 | ADOTADO | O teto de 70% da CPU é **corte aplicado depois** da mistura de `D-10`, e não o peso dela; distribuição em ppm inteiro, com o excesso repartido proporcionalmente entre as outras zonas | A mistura crua dá `0,70 + 0,30/3 = 80%` no difícil — a armadilha que o contrato de M3 nomeia —, e como corte próprio o teto continua valendo se uma progressão ou torneio mexer nos pesos. Em inteiro ele é conferido por **igualdade** (`zoneDistributionPpm` exportada de propósito), não dentro da tolerância de uma medição por frequência |
| `D-22` | 2026-08-07 | ADOTADO | `Team.flag` passa a `string \| null`; `null` = bandeira ainda sem arquivo, até `A-04` | Antes de `Q-03` não existe string honesta: caminho inventado fura o portão de procedência e `""` violaria "ausente ≠ zero". Muda contrato de saída de M4, logo é `D-NN` — ver [[m4_catalogo_notas]] |
| `D-23` | 2026-08-07 | ADOTADO | `name` derivado por `Intl.DisplayNames` em locale FIXO `pt-BR`; código que não resolve lança | Cumpre "name vem do código" com zero país digitado e zero peso no bundle. Limite declarado: o ICU aceita código retirado (`SU`) e reservado (`UK`, `EU`) — ver [[m4_catalogo_notas]] |
| `D-26` | 2026-08-07 | ADOTADO | No modo `cpu`, M5 chama `pick` da CPU **antes** de `observe` da escolha humana da mesma cobrança | Hoje inobservável (papéis disjuntos); é a trava se `Q-08` for invertida. **Não muda o significado de `pick`** — ver [[m5_sessao_notas]] |
| `D-27` | 2026-08-07 | ADOTADO | M7 = DOM no menu, seleções, placar e zonas; Phaser só na cobrança, por `import()` | Canvas não dá teclado, foco nem leitor de tela, e o portão da skill exige os três; adiá-lo pôs o bundle inicial em **80.604 B** — [[m7_tela_notas]] |
| `D-28` | 2026-08-07 | ADOTADO | Áudio sintetizado por `gen-audio.mjs`, determinístico — zero sample de terceiro | Procedência conferível por hash, não declarada; zero imagem em T-10 — [[licenciamento]] |

## D-09, D-10 e D-13 — íntegra como estavam em `c_decisions.md`

Arquivadas na mesma passagem de T-11, quando as decisões de M6 ainda não couberam. São as três
mais citadas do projeto e continuam definidas em `c_decisions.md` — o que saiu foi só a
evidência, que já mora inteira em outro lugar: a regra da disputa e a da CPU em
[[regras_partida]], e o congelamento do PLANO no próprio [[b_plan|PLANO]] e nos dois relatórios
de consistência.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-09` | 2026-08-06 | ADOTADO | Alternadas = morte súbita em rodadas de 1 cobrança por lado, decidida ao FIM da rodada, sem teto de rodadas | Padrão IFAB; preserva o invariante de cobranças iguais sem critério artificial — ver [[regras_partida]]. Responde Q-01 |
| `D-10` | 2026-08-06 | ADOTADO | CPU em 3 níveis por peso do histórico de zonas da sessão: 0% / 50% / 70%, teto absoluto 70% | Os 30% uniformes garantem que o jogador sempre pode enganar a CPU; histórico em memória, nada persistido — ver [[regras_partida]]. Responde Q-02 |
| `D-13` | 2026-08-07 | ADOTADO | **PLANO congelado**: M1..M9 com porta de entrada única, dono de estado declarado e portão objetivo; etapas E-1..E-6 | T-02 aprovado pelo dono e T-03 aprovado na passagem 2 (5/5 restrições com portão, 6/6 critérios com número ou comando) — ver [[b_artifact_consistency_report_260807_1605\|relatório 2]]. Daqui em diante, mudança de rumo é D-NN novo |

## D-24 e D-25 — íntegra como estavam em `c_decisions.md`

As duas decisões que T-09 tomou sobre a borda online. Arquivadas ao fim de T-11, quando `D-24`
deixou de descrever o presente (`src/net/index.ts` não é mais só-tipos: M6 está implementado) e
as decisões novas de M6 precisavam do espaço. O detalhe das duas vive em [[m5_sessao_notas]].

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-24` | 2026-08-07 | ADOTADO | `src/net/index.ts` nasce em T-09 com **só os tipos** que `D-13` congelou para M6 — zero implementação | Sem `../net`, o portão de M5 e o de camada de M7 eram impossíveis para `LinkStatus`. T-11 segue inteira — ver [[m5_sessao_notas]] |
| `D-25` | 2026-08-07 | ADOTADO | M5 recusa na **criação**: `online`, `level` ausente em `cpu` ou presente fora dele, `roomId` fora de `online`, seleção fora de M4 | Degradar `online` calado poria dois aparelhos em partidas separadas; `level` virando `'medium'` seria dado inventado — ver [[m5_sessao_notas]] |

## Por que os IDs estão em crase nesta página

Coluna 1 sem crase é lida por `check.py` como *definição* de ID em qualquer tabela do vault
[Fonte: b_process/d_agent_learnings.md, lição de 2026-08-06]. Aqui a crase é obrigatória: esta
tabela é cópia, não definição.

## Critério da seção de QA (movido de `c_decisions.md` em T-10, pelo teto de 12.000)

A tabela de QA é preenchida pelas sessões de revisão (`guardrails-review` e
`artifact-consistency`). Os defeitos da v1 **não** são QA-NN deste projeto: a v1 é baseline
morto, e eles estão em [[regras_partida]] como entrada de projeto. Evidência completa da
passagem 1: [[a_artifact_consistency_report_260807_1543|relatório de consistência 2026-08-07]]
(19 achados `AC-NN`; só os CRÍTICOS viraram QA-NN).

**A coluna `Fechado em` é o que separa "corrigido no papel" de "conferido".** Sem ela, a
tabela descrevia a correção como fato e o CONTEXT listava o mesmo QA como aberto — as duas
leituras defensáveis, que é o pior estado possível para um registro (AC-21).

## D-06 … D-08, D-21, D-29, D-30 e D-33 — íntegra como estavam em `c_decisions.md`

Arquivadas em **T-13**, pelo mesmo motivo das anteriores: o registro vivo tinha 32 caracteres de
folga e `D-35`, `D-36` e `Q-11` não caberiam. A seleção seguiu o que o `check.py` aponta — as três
**REJEITADAS** primeiro — e, depois, decisões de etapa já fechada (`D-21`, de E-1, no ar) ou cujo
racional inteiro já mora em [[m6_transporte_notas]] (`D-29`, `D-30`, `D-33`). Nenhuma foi revertida:
o que muda é onde o texto longo mora, nunca o que a decisão diz.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-06` | 2026-08-06 | REJEITADO | Reaproveitar o backend Node/Express/MySQL da v1 | Exigiria host pago e trazia SQL por interpolação e senha em texto puro; conta não é requisito |
| `D-07` | 2026-08-06 | REJEITADO | Usar clubes reais, ou seleções com escudo de federação | Colide com Lei Pelé art. 87; trocar clube por seleção troca o titular, não remove o risco |
| `D-08` | 2026-08-06 | REJEITADO | Godot 4 como engine | Payload WASM maior que o teto de 8 MB da Poki sem otimização, e custo de aprender GDScript sem ganho para jogo 2D de UI |
| `D-21` | 2026-08-07 | ADOTADO | O repositório `gustavomot4/tapgo-v2` é **público** — é o que deixa o Pages publicar no plano Free | Repositório privado e "custo R$ 0" não coexistem (`D-05`). Página no ar com o veredito verde e `base` `/tapgo-v2/` conferidos no celular do dono: fecha E-1. Responde Q-06 |
| `D-29` | 2026-08-07 | ADOTADO | STEP 0 da skill: troca de jogadas é **assíncrona**, não request/response — confirma a porta de `D-13` | Um salto, sem cadeia; circuit breaker e retry ficam sem objeto — [[m6_transporte_notas]] |
| `D-30` | 2026-08-07 | ADOTADO | `roomId` = 26 caracteres Crockford (130 bits) de `crypto.getRandomValues`, **fora** do `Rng` de M1 | M1 é determinístico por contrato, e ID previsível é o defeito 6 da v1; portão de M1 segue verde — [[m6_transporte_notas]] |
| `D-33` | 2026-08-07 | ADOTADO | `src/medicao.html` como **segunda entrada** do build: instrumento das duas medições de E-4, TURN digitado em runtime | Medir em celular exige HTTPS; travessia para M9 **autorizada pelo dono nesta sessão** — [[m6_transporte_notas]] |

## A-09 — as linhas que saíram da tabela viva (2026-08-08)

Até aqui o arquivamento tirava só a **íntegra** e deixava no `c_decisions.md` uma linha
`ARQUIVADO` com resumo e ponteiro. Quatro passagens depois, essas linhas-ponteiro somavam
mais que as decisões vivas: o registro fechou T-13 com **5 caracteres** de folga, e o
`check.py` avisava desde os 9.600. Nesta passagem sai a **linha inteira** das decisões que
nenhum arquivo vivo cita — `src/` não as nomeia e nenhuma nota fora de `d_history/` e `e_qa/`
depende delas. O ID continua resolvendo: quem procurar `D-17` acha aqui, na tabela abaixo ou
nas seções anteriores desta página.

**Critério, na ordem em que foi aplicado** (o mesmo das passagens anteriores, agora escrito):

1. Sai quem **nenhum arquivo vivo cita** — nem `src/`, nem `a_context/`, nem `b_process/`.
2. **Fica toda REJEITADA** (`D-06`..`D-08`): é a lista-morta que a sessão de evolução varre
   antes de propor, e ela nunca lê `e_qa/`. Retirá-las era convidar a re-proposta do que morreu.
3. Fica o que `src/` cita, mesmo antigo (`D-01`, `D-02`, `D-09`, `D-10`, `D-12`, `D-14`, `D-19`,
   `D-20`, `D-22`, `D-24`..`D-27`, `D-29`..`D-32`, `D-35`) — é o portão declarado de `A-09`.
4. Fica o mais recente (`D-35`, `D-36`, de 2026-08-08): decisão de ontem não é decisão antiga.

**Íntegra já arquivada em passagem anterior** (a linha-ponteiro é que saiu agora, o texto não
se moveu): `D-03`, `D-05` (seção `D-01 … D-05`) · `D-11`, `D-16`..`D-18` (seção `D-11, D-12,
D-16 … D-18`) · `D-15`, `D-23`, `D-28` (seção `D-14 … D-28`) · `D-21`, `D-33` (seção `D-06 …
D-33`) · `QA-02` (seção `QA-01 … QA-03`).

**Íntegra que chega agora:** `D-34` e `Q-06`, que ainda não tinham passado por aqui.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-34` | 2026-08-07 | ADOTADO | Sinalização entra em M6 por **injeção** (`setSignalingLoader`); `opened()` expõe a promessa de abertura | Mock de módulo escapava sob carga e a Trystero real caía no teste; verde no Linux, **17 reprovas no Windows do dono**. É costura de teste, não regra: o caminho de produção continua carregando a Trystero por `import()` — [[m6_transporte_notas]] |

| # | Questão | Decidir quando |
|---|---|---|
| `Q-06` | ~~O repositório `gustavomot4/tapgo-v2` fica **público**?~~ | **RESPONDIDA 2026-08-07 → `D-21`** — repositório privado e "custo R$ 0" não coexistem no plano Free do Pages |

### O ponteiro deixou de ser linha a linha

`íntegra em [[decisions_archive]]` aparecia **31 vezes** na tabela viva, sempre igual: 716
caracteres para dizer uma frase. Agora ela é dita uma vez, no cabeçalho do `c_decisions.md`,
válida para toda linha marcada `ARQUIVADO`. Nenhuma informação saiu — saiu a repetição.

### O que esta passagem NÃO resolveu

O registro passou no portão, mas a folga até o **aviso** dos 9.600 é de pouco mais de uma
linha de decisão — o número vivo está no [[a_context_source|CONTEXT]], que é onde ele mora.
Ou seja: a próxima decisão registrada traz o aviso de volta, e o `check.py` volta a apontar
candidatas que já não são as certas. O que sobrou de gordura não são decisões e sim as
**questões abertas** — `Q-08` sozinha tem 613 caracteres, `Q-07` 406, `Q-09` 346 e `QA-04` 416,
todas violando o "teto de 2 frases por linha" que o próprio `c_decisions.md` declara no topo.
Encolhê-las é mover justificativa para `e_qa/`, não arquivar: questão aberta continua aberta.
Fica como `A-10` no BACKLOG, e não foi feito aqui porque `A-09` pede arquivamento de decisão,
não reescrita de questão viva.

## A-12 — o critério 3 de `A-09` caiu (2026-08-08)

`A-09` previu esta passagem e errou só o prazo: a auditoria de `QA-08` somou 1.998 caracteres e
`T-15` somou o resto, levando o registro a **11.888/12.000** — 112 da FALHA, com o próximo `D-NN`
travado. O que `A-09` não previu foi que seu próprio critério 3 (*"fica o que `src/` cita, mesmo
antigo"*) tornaria o portão **inalcançável**: medido antes de mexer, o corte máximo honrando-o
dava 10.055, ainda 455 acima do aviso. Não é opinião — é a soma de tudo que sobrava para cortar.

O critério 3 cai, e `D-43` registra por quê. A observação que o matou é que `A-09` **já o havia
excedido**: retirou `D-33`, que `vite.config.ts` cita. O que substitui: sai da tabela viva quem
nenhum arquivo **`.md` vivo** cita — que é exatamente a régua do `check.py` (`a_context/`,
`b_process/`, `c_technical_docs/` e a raiz; `d_history/` e `e_qa/` ficam de fora por serem
históricos). Citação em `src/` deixa de segurar a linha porque o ID continua resolvendo: o
cabeçalho do `c_decisions.md` lista os retirados e aponta para cá.

**Retiradas agora — só o ponteiro se moveu, a íntegra já estava aqui desde T-08/T-09/T-13:**
`D-12` (seção `D-11, D-12, D-16 … D-18`) · `D-14`, `D-19`, `D-20`, `D-26` (seção `D-14 … D-28`) ·
`D-24`, `D-25` (seção `D-24 e D-25`) · `D-29`, `D-30` (seção `D-06 … D-33`). Nove linhas, 1.129
caracteres, **nenhum byte de texto novo** — é o arquivamento mais barato que restava.

**Também saíram da tabela:** `QA-01` e `QA-03`, fechados e verificados em 2026-08-07 e com a íntegra
aqui desde T-08 — a linha viva era ponteiro puro, e a única citação que a segurava era a linha de
estado do CONTEXT, que esta sessão reescreve. Recebem o mesmo tratamento que `QA-02` teve em `A-09`.
E a tabela **"Gatilhos de revisão"** inteira, cujos dois gatilhos foram para [[online_p2p]] e [[stack]].

**Ficaram de propósito:** as seis **REJEITADAS** (`D-06`..`D-08`, `D-39`..`D-41`), pelo motivo de
sempre — são a lista-morta que a sessão de evolução varre, e ela nunca lê `e_qa/`. E `D-42`, que
é o portão estatístico de `A-08`, a tarefa que o dono roda a seguir: arquivar a evidência da
decisão que governa a próxima ida a campo seria economizar no lugar errado.

### Íntegra que chega agora — decisões de 2026-08-07/08

A linha viva destas sete perde **só a coluna de evidência** e ganha `ARQUIVADO`; a decisão curta,
o ID e a data continuam na tabela do `c_decisions.md`. Nenhuma foi revertida.

| # | Data | Status | Decisão (curta) | Evidência (número-chave + link) |
|---|---|---|---|---|
| `D-31` | 2026-08-07 | ADOTADO | `'failed'` é **terminal**; peer que sai volta a `waiting` e **rearma** os 20 s; `onStatus` entrega o status atual ao assinar | Peer atrasado ressuscitaria partida já dada como perdida; quem vence segue sendo `Q-04` — [[m6_transporte_notas]] |
| `D-32` | 2026-08-07 | ADOTADO | M6 valida a **forma** do `Move` e descarta o resto com log; ordem e legalidade seguem de M5. Fila de envio com teto 32 | Senão M6 entregaria `Move` mentiroso na única borda com dado de fora; `seq` torna reenvio seguro — [[m6_transporte_notas]] |
| `D-35` | 2026-08-08 | ADOTADO | `Q-04`: peer que some no meio = disputa **sem resultado**; M5 para de aceitar escolha e `winner` segue `null` | Vencedor por abandono seria regra de disputa na borda; M2 intacto, T-13 fechou sem tocar `regras_partida` — [[m5_sessao_notas]] |
| `D-36` | 2026-08-08 | ADOTADO | Notificação vinda da REDE não propaga exceção de assinante (loga); a de `choose()` propaga | Exceção subindo pela pilha de M6 partiria a máquina de estados do canal — [[m5_sessao_notas]] |
| `D-37` | 2026-08-08 | ADOTADO | Critério de aceite sai do CONTEXT e vira [[portao_de_aceite]], lido sob demanda pelo Mapa | Era o maior bloco movível sem levar estado numérico junto, com o CONTEXT a 17 chars da FALHA de 4.000 (`A-11`) |
| `D-38` | 2026-08-08 | ADOTADO | `QA-08`: na medição os DOIS lados entram por `joinRoom(idDaTentativa(base,n))`; a porta de `D-13` não muda um byte | `hostRoom` e `joinRoom` caem no mesmo `createChannel`, e rotação passa em `ROOM_ID_RE` (0 recusas em 1,5 M) — [[m6_transporte_notas]] |

### Íntegra que chega agora — os três QA fechados em `T-15`

Fechados **e verificados** em 2026-08-08, com commit citado. Mesmo tratamento que `QA-01`..`QA-03`
receberam em T-08: achado fechado não ocupa o orçamento do registro vivo, e a linha viva vira
ponteiro com o "o que quebrava" em uma frase. Os seis QA **abertos** (`QA-04`..`QA-07`, `QA-10`,
`QA-11`) continuam inteiros no `c_decisions.md` — achado aberto não se arquiva.

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| `QA-08` | 2026-08-08 | CRÍTICO | `src/medicao.ts` (`D-33`) | O anfitrião descarta o `id` rotacionado e chama `hostRoom()`, que sorteia sala nova a cada toque: os dois aparelhos nunca se encontram e a medição de `A-08` dá 0% | `D-38`: os dois lados entram por `joinRoom` na sala rotacionada, sem tocar a porta de M6 — é `T-15`, ver [[m6_transporte_notas]] | ✔ `T-15` 2026-08-08 (`bd68d0f`) |
| `QA-09` | 2026-08-08 | CRÍTICO | `src/medicao.ts` (`D-33`) | Índice da rotação é contador por aparelho (`contadores[modo].tentativas`): um toque a mais dessincroniza as salas e **não ressincroniza**, e os 20 s saem como falha de P2P | A tela mostra índice e 6 chars do ID nos dois aparelhos — dentro de `T-15`, commit separado de `D-38` | ✔ `T-15` 2026-08-08 (`31b39d9`) |
| `QA-12` | 2026-08-08 | CRÍTICO | `src/medicao.ts` | Sortear sala nova não zerava a rotação — achado em campo, ver [[m6_transporte_notas]] | Índice separado da estatística | ✔ `T-15` 2026-08-08 |

### O que esta passagem NÃO resolveu

O registro voltou para baixo do aviso, mas **a curva não mudou**: `A-09` deu 9.347, `A-10` deu
8.808, e cinco dias de trabalho comeram os dois. O que ficou barato de arquivar acabou — as nove
linhas retiradas aqui eram as últimas cujo texto já morava neste arquivo. A próxima passagem vai
ter de mover texto de verdade, ou mexer na estrutura: hoje o `c_decisions.md` acumula **três**
registros de ciclo de vida diferente (decisão permanente, questão aberta, achado de QA) num
orçamento só, e é a seção de QA que cresce mais rápido — 3.374 caracteres em 11 achados, seis
deles ainda abertos. Separar QA em arquivo próprio foi levantado ao dono nesta sessão e **não
escolhido**; o custo é que `check.py` crava `DECISOES` como o único arquivo que define ID, e a
mudança seria no script. Fica registrado aqui como o caminho que sobrou, não como tarefa.
