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

Os gatilhos de `D-01` e `D-02` **continuam em `c_decisions.md`**, na tabela "Gatilhos de revisão",
e não foram movidos: é lá que a sessão de evolução vai procurá-los, e são curtos.

## Por que os IDs estão em crase nesta página

Coluna 1 sem crase é lida por `check.py` como *definição* de ID em qualquer tabela do vault
[Fonte: b_process/d_agent_learnings.md, lição de 2026-08-06]. Aqui a crase é obrigatória: esta
tabela é cópia, não definição.
