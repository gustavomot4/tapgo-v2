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
| QA-27 | 2026-08-20 | MÉDIO | `scripts/check.py` (desde `D-74`) | O corte de `D-43` ainda é medido pelo critério antigo: o script oferece como candidata uma linha **REJEITADA**, que `D-74` mandou manter viva por ser a lista-morta que a fase de evolução varre. Seguir a ferramenta apagaria justamente o que impede a IA de re-propor o que já morreu | A checagem tem de pular quem está `REJEITADO`. Hoje `D-76` só escapou porque a nota de `QA-26` passou a citá-lo — proteção por acidente de citação, não por critério. Reprodução executável e realocação (é `check.py`, não `arquivar.py`) em [[c_qa_pass01_report_260829_1125]] | 2026-08-29 — guarda de `REJEIT` no ramo `nao_citadas` do `check.py`; regressão em `e_qa/test_qa27.py` |
| QA-29 | 2026-08-20 | BAIXO | `README.md` (linha 70) × docstring de `scripts/check.py` | O README declara o portão em **dois** números que discordam: 15 falhas/17 avisos na linha 25, "14 falhas · 12 avisos" na 70 — o docstring lista 15 e 17 | Acertar os três pelo código. Achada ao conferir o custo de `A-21` (regra 4) | **FECHADO em 2026-08-29 (`D-100`)** — os três dizem 18 falhas · 20 avisos |
| QA-34 | 2026-08-21 | BAIXO | `src/tests/ui.test.ts`, o teste das 4 faixas do gramado (desde `T-29`) | O teste redeclara o gramado como HSL **aproximado** em vez de usar as faixas reais de `cena.ts`: duas referências para a mesma medida, e a diferença chega a **5,2** | Medição e correção em [[qa34_gramado_aproximado]] | _(aberto)_ |
| QA-38 | 2026-08-29 | BAIXO | `a_context_source.md`, o Mapa de leitura × este arquivo | O QA é o único tema de `a_context/` fora do Mapa: doc fora do mapa nunca é lido, e o `check.py` avisa desde que `D-50` o tirou do DECISIONS | Entrar no Mapa com a condição que justifica lê-lo, ou sair de `a_context/` | **FECHADO em 2026-08-29** — no Mapa, condição "ao registrar, fechar ou consultar um `QA-NN`" |
| QA-39 | 2026-08-29 | MÉDIO | `b_plan.md:349`, `online_p2p.md:107` e o card `T-17` do BACKLOG | Os três tratam `Q-11` como **aberta e travando** o sorteio no `online`; `D-73` a respondeu em 2026-08-19, e o card do PRÓXIMO passo descreve bloqueio que não existe | Reescrever os três por `D-73`. Achado ao arquivar (regra 4) | **FECHADO em 2026-08-29 (`T-17`/`D-98`)**, com a regra de M5 que restava |
| QA-40 | 2026-08-29 | BAIXO | `a_context_source.md`, a linha "Bloqueado/pendente" | As três ocupações de `D-97` estavam velhas (registro 15.6k contra 16.5k medidos) e nada as cobrava: a checagem do `check.py` casa `n/teto` em dígitos, e o `20k` à mão não casa | Números refeitos pela medida do disco; o portão veio pelo `k` | **FECHADO em 2026-08-29 (`D-99`)** — editar um dos três à mão acusa divergência |
| QA-41 | 2026-08-29 | BAIXO | `README.md` (linha 70), o bloco `scripts/` | O inventário lista `test_check.py` e `new_project.py`, que nunca existiram nesta instalação, e omite `arquivar.py`, `evidencia.py`, `escopo_hook.py` e `portao_hook.py`, que existem | Refazer pelo real (regra 4, ao fechar `QA-29`) | **FECHADO em 2026-08-29** — os 7 versionados, um por linha; portão nos dois sentidos |
| QA-42 | 2026-08-29 | BAIXO | `README.md:30` e a ajuda de `scripts/task.py` | Ambos oferecem scripts do repositório do KIT ausentes aqui: o passo 1 manda rodar `new_project.py`, e a ajuda lista `test` com `*` (portão de CI) sem dizer que não roda | Tirar o passo 1 ou dizer de onde se roda; marcar `test` como indisponível. Achado ao fechar `QA-41` (regra 4) | _(aberto)_ |
| QA-43 | 2026-08-29 | MÉDIO | `check.py:425-431` × `arquivar.py` | Uma régua em cada script para o mesmo `D-43`: o `check.py` conta `e_qa/` como citação viva, inclusive o `backlog_archive.md` "Somente leitura", e o `arquivar.py` não. Sete REJEITADAS só escapam por isso | Alinhar `_vivos` a `HISTORICAS` — é `D-NN`, não conserto. Medida em [[c_qa_pass01_report_260829_1125]] | _(aberto)_ |
