---
tags: [contexto, tema, online]
status: atual
---
# Online P2P — como o modo online existe sem custo, e onde ele falha

> Leia ao tocar o módulo de partida online. Sustenta D-04 e a restrição "custo R$ 0" do [[a_context_source|CONTEXT]].

## A pergunta que originou este arquivo
O dono exigiu **custo zero, sem servidor nem hospedagem**, e ainda assim quer modo online.
Isso parece contraditório: partida online exige, no mínimo, sinalização para os dois navegadores se acharem.
**É resolvível** — mas com limitação medida, não com otimismo.

## Como funciona
1. **Sinalização** — os navegadores trocam SDP/ICE por infraestrutura pública de terceiros (BitTorrent
   trackers, Nostr, MQTT). A biblioteca **Trystero** (MIT) abstrai isso; nenhum servidor nosso é envolvido.
2. **Partida** — depois de conectados, os dados vão **direto entre os dois navegadores** via WebRTC
   DataChannel, com criptografia ponta a ponta. O tráfego nunca passa pela infraestrutura de sinalização.
3. **Payload** — a disputa é por turnos: cada evento é "canto escolhido" + número de sequência.
   São dezenas de bytes por cobrança. Isto é o que torna o custo zero sustentável — ver a lacuna abaixo.

## A lacuna declarada (não maquiar)
**15-30% dos jogadores estão atrás de NAT simétrico ou CGNAT** e não conectam P2P direto. A CGNAT é o padrão
da maioria das operadoras móveis — exatamente o público de um jogo mobile-first no Brasil. Para esses, é
preciso um **relay TURN**, que não é gratuito por natureza.

**Mitigação:** existem camadas gratuitas de TURN (ex.: Open Relay/Metered, ~20 GB/mês; sinalização gerenciada
com 100 conexões simultâneas). Para vídeo, 20 GB/mês acaba em horas; para um jogo por turnos que troca
dezenas de bytes por jogada, é efetivamente ilimitado. **Isto é raciocínio de ordem de grandeza, não medição.**

**O IPv6 desvia da lacuna, e só de parte dela (`D-46`).** Onde os dois jogadores têm IPv6, o candidato `host`
já é endereço global: não há NAT no caminho e os 15-30% acima não se aplicam. Mas o caminho IPv6 exige os
**dois** lados — um peer só-IPv4 derruba a conexão inteira para IPv4 —, então a fração de pares que o
alcança é aproximadamente `p²`. Com o Brasil perto de 50% de adoção, isso é cerca de **um quarto dos pares**;
os outros três quartos encontram a CGNAT. Por isso a medição tem dois contadores e o corte cobra o de IPv4.

**Portão obrigatório (Fase 4):** medir a taxa real de conexão em **rede móvel real**, não em Wi-Fi doméstico.
Wi-Fi de casa conecta quase sempre e esconde o defeito. Sem esse número, o modo online não é aceito.

**Gatilho de revisão de `D-01`** (mora aqui desde `A-12`, junto do número que o dispara — "vai escalar"
não é gatilho): a forma "SPA estática, sem backend" reabre quando a conexão P2P medida ficar **< 70% em
rede móvel real e o fallback exigir TURN próprio**; ou quando o dono aprovar requisito com autoridade de
servidor (ranking global antifraude, conta). O critério estatístico da medição é `D-42`, tabelado em
[[m6_transporte_notas]].

**Medido em 2026-08-12 (`A-08`, `D-47`): 17/17 no contador `IPv4/com NAT`, limite inferior 95% de 83,8%.**
O gatilho **não** disparou — a forma "SPA estática, sem backend" está confirmada por medição, não por otimismo.
Claro nos dois aparelhos, APN forçado a IPv4; todas as 17 por `srflx↔srflx` com IPs públicos diferentes.
**A lacuna que sobrou** não é mais "15-30% de CGNAT" genérico: é (1) o caso entre operadoras DIFERENTES,
não exercitado, e (2) os até ~16% que o limite inferior admite — esses recebem o timeout explícito e a
mensagem honesta da tabela abaixo, e **não** têm relay, porque `D-47` deixou TURN fora de escopo.

**Qual número dispara o gatilho (`D-46`):** o do contador **`IPv4/com NAT`**, não o total nem o de IPv6.
Uma taxa alta medida com IPv6 nos dois aparelhos não desarma este gatilho — ela mede o caminho em que a
NAT não existe, que é justamente o que o gatilho não está vigiando. Para produzir o número certo com dois
aparelhos da mesma operadora, force o APN para IPv4 nos dois (ver `A-08`).

## Riscos que precisam de fallback escrito
| Risco | Consequência | Fallback exigido |
|---|---|---|
| Infra pública de sinalização cai ou muda | ninguém entra em sala | erro claro na tela + jogo local segue funcionando |
| Peer atrás de CGNAT sem TURN | conexão falha em silêncio | timeout explícito e mensagem honesta, nunca tela travada |
| Cota grátis de TURN estourada | online para | modo local intacto; online degrada, o jogo não morre |
| Oponente desconecta no meio | partida órfã | resultado definido por regra, registrado em `regras_partida` |

**Invariante de arquitetura:** o online é uma **camada opcional sobre o motor de regras**. Se toda a
infraestrutura de terceiros sumir, 1P vs CPU, 2P local e torneio continuam funcionando. O jogo nunca
depende de rede para ser jogável.

## Anti-trapaça: escopo declarado
P2P sem autoridade central significa que **não há árbitro**. Um cliente modificado pode mentir sobre a
jogada. O projeto **aceita isso conscientemente**: é jogo casual entre amigos por link de convite, sem
ranking global, sem prêmio, sem placar público. Se um dia existir ranking, esta decisão precisa ser
revista com D-NN novo — ranking sem servidor autoritativo é ranking falso.

## Fontes
- Trystero (MIT, sinalização serverless) — https://github.com/dmotz/trystero
- Necessidade de TURN e NAT simétrico — https://bloggeek.me/webrtcglossary/turn/
- CGNAT em operadoras móveis quebrando WebRTC — https://www.kindgeek.com/blog/webrtc-mobile-network-scenarios
- Camada gratuita de TURN/sinalização — https://www.metered.ca/tools/openrelay/
- Limites do PeerJS Cloud gratuito (alternativa avaliada) — https://peerjs.com/server/cloud
