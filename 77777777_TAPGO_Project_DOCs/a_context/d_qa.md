---
tags: [qa, registro]
status: atual
---
# QA.md — achados de revisão (QA-NN)

> **Saiu do [[c_decisions|DECISIONS]] em 2026-08-12 por `D-50` (`A-13`).** Motivo: os três registros
> tinham ciclo de vida diferente e um orçamento só, e era esta seção que crescia mais rápido —
> eram 6 os achados abertos, e achado aberto não se arquiva.
> **Decisão permanente e questão do dono continuam no [[c_decisions|DECISIONS]]**; aqui fica só QA.
> **Append-only**, mesma regra de lá: achado novo = linha nova, e o ID nunca é reciclado.
> **Retirados da tabela** (íntegra em [[decisions_archive]], ID preservado, nada revertido): `QA-01`..`QA-04` `QA-06` `QA-08` `QA-09` `QA-11`..`QA-16` `QA-18` `QA-19` `QA-22` `QA-23` `QA-24` `QA-25` `QA-26` `QA-28` `QA-30` — os FECHADOS saem, os abertos ficam (`D-74`).
> **Retirados da tabela em 2026-08-29** (mesmo corte de `D-74`, íntegra em [[decisions_archive]]): `QA-10` `QA-05` `QA-20` `QA-21` `QA-31` `QA-32` `QA-33` `QA-35` `QA-36` `QA-37` — todos FECHADOS; os 5 abertos ficam.
> **Teto: 2 frases por linha** (colunas de prosa: "O que quebrava" e "Correção"). Evidência longa
> vira nota em `e_qa/<slug>.md` linkada aqui.
> **Orçamento: 8.000 caracteres**, aviso em 6.400, cobrado por `scripts/check.py` — medido **sem** o
> padding de alinhamento das tabelas, senão um `Ctrl+S` do editor consome orçamento sem uma palavra nova.

> Citado no commit assim: `fix: QA-NN …`. Passagens de revisão: 1. Critério e evidência: [[decisions_archive]].

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-07 | 2026-08-08 | BAIXO | `Q-08` e `Q-09`, no próprio registro | Prazo de decisão vencido com a questão ainda aberta: `Q-08` dizia "antes de E-3" (fechada) e `Q-09` "antes de T-10" (feita) | O dono redata o prazo ou responde a questão — `A-10` não mexe em prazo alheio (regra 6) | _(aberto)_ |
| QA-17 | 2026-08-12 | BAIXO | `b_process/templates/c_session_closing.md` | O template manda registrar `QA-NN` em [[c_decisions\|DECISIONS]], que desde `D-50` não define mais `QA-NN`, e mandar a reprodução para `dev/`, pasta que o padrão do repositório não tem | Apontar as duas linhas para [[d_qa\|QA]] e `e_qa/` — template do kit vendorizado, de outro dono (regra 4) | _(aberto)_ |
| QA-27 | 2026-08-20 | MÉDIO | `scripts/check.py` (desde `D-74`) | O corte de `D-43` ainda é medido pelo critério antigo: o script oferece como candidata uma linha **REJEITADA**, que `D-74` mandou manter viva por ser a lista-morta que a fase de evolução varre. Seguir a ferramenta apagaria justamente o que impede a IA de re-propor o que já morreu | A checagem tem de pular quem está `REJEITADO`. Hoje `D-76` só escapou porque a nota de `QA-26` passou a citá-lo — proteção por acidente de citação, não por critério | _(aberto)_ |
| QA-29 | 2026-08-20 | BAIXO | `README.md` (linha 70) × docstring de `scripts/check.py` | O README declara o portão em **dois** números que discordam: 15 falhas/17 avisos na linha 25, "14 falhas · 12 avisos" na 70 — o docstring lista 15 e 17 | Acertar a linha 70 pelo docstring. Achada ao conferir o custo declarado de `A-21`, que aponta a frase errada; de outra sessão (regra 4) | _(aberto)_ |
| QA-34 | 2026-08-21 | BAIXO | `src/tests/ui.test.ts`, o teste das 4 faixas do gramado (desde `T-29`) | O teste redeclara o gramado como HSL **aproximado** em vez de usar as faixas reais de `cena.ts`: duas referências para a mesma medida, e a diferença chega a **5,2** | Medição e correção em [[qa34_gramado_aproximado]] | _(aberto)_ |
| QA-38 | 2026-08-29 | BAIXO | `a_context_source.md`, o Mapa de leitura × este arquivo | O QA é o único tema de `a_context/` fora do Mapa: doc fora do mapa nunca é lido, e o `check.py` avisa desde que `D-50` o tirou do DECISIONS | Entrar no Mapa com a condição que justifica lê-lo, ou sair de `a_context/` — custa orçamento do arquivo que `D-97` encolheu; de outra sessão (regra 4) | _(aberto)_ |
