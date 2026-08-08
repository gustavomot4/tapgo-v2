---
tags: [contexto, tema, stack]
status: atual
tipo: contexto
data: 2026-08-07
---
# Stack — o que ela impede, e quem roda o quê

> Leia ao escolher biblioteca, mexer no build, publicar, ou decidir o que vale como prova.
> Sustenta `D-02`. A stack em si e as representações obrigatórias moram no [[a_context_source|CONTEXT]];
> aqui ficam os limites dela, que são longos demais para o orçamento de 4.000 caracteres.

## Limites da stack (não são preferências — são paredes)

| Limite | O que ele impede |
|---|---|
| Build 100% estático, sem SSR nem rota de servidor | nenhuma verificação, sorteio ou placar pode depender de código que roda fora do navegador |
| `localStorage` é do aparelho e não sincroniza | preferência nunca vira conta; o mesmo jogador em dois aparelhos é dois estados |
| WebRTC exige HTTPS | o modo online não funciona em `file://` nem em host sem TLS — o GitHub Pages já dá HTTPS |
| P2P falha para 15-30% dos jogadores sem relay TURN | CGNAT de operadora móvel é o padrão do público-alvo — ver [[online_p2p]] |
| Cota grátis de TURN é finita | o online degrada quando a cota estoura; o jogo local não pode degradar junto |
| itch.io derruba conteúdo sob DMCA sem aviso prévio | a vitrine não é fonte da verdade; o canônico é o GitHub Pages (`D-05`) |

## Quem roda o quê (o sandbox do agente não é portão)

| Quem | O que roda | Vale como |
|---|---|---|
| Agente | código, testes e build no sandbox | **indicativo** — nunca fecha portão sozinho |
| Dono | build oficial, `git push`, publicação no GitHub Pages e no itch.io | **prova** |
| Dono | teste em celular real: toque, fps e taxa de conexão em rede móvel | **prova** — é o único lugar onde esses números existem |

Processo vivo tem cache: o verde do sandbox e o verde da máquina do dono não são o mesmo verde.

## Custo por dependência e por endpoint (portão de M9)

A restrição "custo R$ 0 permanente" do [[a_context_source|CONTEXT]] só é verificável se cada coisa que
entra tiver uma linha aqui — do mesmo jeito que asset sem linha de procedência não entra em
[[licenciamento]]. **Sem linha, não entra.** Preencher a cada dependência de runtime e a cada host que
o build publicado alcança.

| Dependência ou endpoint | Para quê | Camada usada | Pede cartão? | Fonte |
|---|---|---|---|---|
| Phaser 3 (MIT) — `phaser@3.90.0` | cena da cobrança de M7 (`D-02`, `D-27`) | biblioteca, sem conta e sem serviço próprio; empacotada no build, nenhuma chamada de rede em runtime | Não | https://github.com/phaserjs/phaser |
| Trystero (MIT) — `trystero@0.25.3` + `@trystero-p2p/nostr@0.25.3` | biblioteca de sinalização P2P de M6 (`D-04`) | biblioteca, sem conta e sem serviço próprio; entra por `import()` dinâmico, **fora do bundle inicial** (T-11) | Não | https://github.com/dmotz/trystero |
| Infraestrutura pública de sinalização — **relays Nostr**, a estratégia padrão do `trystero@0.25.3` | os dois navegadores se acharem antes do WebRTC (`D-04`) | pública, de terceiros, sem conta e sem chave — **é a exceção nominal do portão de privacidade de M9**. São **46 relays** na lista padrão da biblioteca (`defaultRelayUrls`), escolhidos por ela em runtime; a lista acompanha a versão e muda com ela | Não | [[online_p2p]] · lista lida de `@trystero-p2p/nostr@0.25.3` |
| GitHub Pages + GitHub Actions | host canônico do build (`D-05`) e o workflow que publica (`D-17`) | gratuita, **com uma condição:** no plano Free o Pages só publica de repositório **público**, e minuto de Actions só é ilimitado em repositório público — repositório privado exige plano pago e derruba a restrição de custo. Pendente de `Q-06` | Não, se o repositório for público | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages |
| Relay TURN | atravessar CGNAT para os 15-30% que não conectam direto | **linha condicional, hoje `Q-10`:** só existe se E-4 escolher a saída (a); se escolher a (b), esta linha vira "fora de escopo" com o percentual sem online registrado. O código já aceita as duas por `IceConfig`, e a credencial é digitada em runtime — nunca versionada | a confirmar em E-4, com as duas medições na mão | [[online_p2p]] · [[m6_transporte_notas]] |

Dependência só de build (compilador, bundler, runner de teste) não vai para esta tabela: ela não roda
no navegador do jogador e não cria conta em serviço nenhum.
