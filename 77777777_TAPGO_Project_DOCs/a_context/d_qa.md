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
> **Retirados da tabela** (íntegra em [[decisions_archive]], ID preservado, nada revertido): `QA-01`..`QA-03` `QA-08` `QA-09` `QA-11`..`QA-16` `QA-18` `QA-19` — os FECHADOS saem, os abertos ficam (`D-74`).
> **Teto: 2 frases por linha** (colunas de prosa: "O que quebrava" e "Correção"). Evidência longa
> vira nota em `e_qa/<slug>.md` linkada aqui.
> **Orçamento: 8.000 caracteres**, aviso em 6.400, cobrado por `scripts/check.py` — medido **sem** o
> padding de alinhamento das tabelas, senão um `Ctrl+S` do editor consome orçamento sem uma palavra nova.

> Citado no commit assim: `fix: QA-NN …`. Passagens de revisão: 1. Critério e evidência: [[decisions_archive]].

| # | Data | Sev. | Onde | O que quebrava | Correção | Fechado em |
|---|---|---|---|---|---|---|
| QA-04 | 2026-08-07 | MÉDIO | `tsconfig.json` (`D-14`) × `vite.config.ts` (T-05) | `include: ["src"]` deixa o `vite.config.ts` fora do `tsc --noEmit`: erro de tipo no build só estoura no `vite build` | Acrescentar `"vite.config.ts"` ao `include` — de outro dono, regra 4; porquê em [[questoes_abertas_notas]] | _(aberto)_ |
| QA-06 | 2026-08-07 | MÉDIO | `src/scripts/bundle-size.mjs` (M9) | Soma **toda** entrada `isEntry` no "bundle inicial": com `D-33`, o gatilho de `D-02` lê página que o jogador nunca abre | Medir só o grafo de `index.html` — não feito aqui porque é de M9 e muda um portão (regra 4) | _(aberto)_ |
| QA-07 | 2026-08-08 | BAIXO | `Q-08` e `Q-09`, no próprio registro | Prazo de decisão vencido com a questão ainda aberta: `Q-08` dizia "antes de E-3" (fechada) e `Q-09` "antes de T-10" (feita) | O dono redata o prazo ou responde a questão — `A-10` não mexe em prazo alheio (regra 6) | _(aberto)_ |
| QA-10 | 2026-08-08 | MÉDIO | `src/medicao.ts` (`D-33`) | Erro de configuração soma tentativa **e** falha: erro do operador entra na taxa que decide a revisão de `D-01`, enviesando para baixo | Não contar tentativa quando o canal nunca abriu — muda denominador de portão, logo `D-NN` (regra 4) | _(aberto)_ |
| QA-05 | 2026-08-07 | MÉDIO | `src/tests/teams.test.ts` | Escreve por extenso os 6 termos da lista-morta: o portão de marca de M7 (`grep` zero em `src/`) devolve 6 | Montar as agulhas em tempo de execução, como `core.test.ts` e `ui.test.ts` — outro dono (regra 4) | _(aberto)_ |
| QA-17 | 2026-08-12 | BAIXO | `b_process/templates/c_session_closing.md` | O template manda registrar `QA-NN` em [[c_decisions\|DECISIONS]], que desde `D-50` não define mais `QA-NN`, e mandar a reprodução para `dev/`, pasta que o padrão do repositório não tem | Apontar as duas linhas para [[d_qa\|QA]] e `e_qa/` — template do kit vendorizado, de outro dono (regra 4) | _(aberto)_ |
| QA-20 | 2026-08-13 | BAIXO | `src/ui/rotulos.ts` (M7, desde `T-10`) | O matiz de `marcaSelecao` é hash `(soma*37)%360` e **não é injetor**: as 32 seleções dão **30** cores — `FR`/`NL` e `MA`/`EG` colidem, e os discos delas saem idênticos na grade | Trocar o hash muda a cor de marca de todas as seleções em toda tela, logo é `D-NN` do dono (regra 4). `T-20` contornou **só em campo**, com `matizDistinto` | _(aberto)_ |
| QA-21 | 2026-08-19 | MÉDIO | `src/ui/tela_inicio.ts` (M7, desde `T-10`) | A `.lacuna` do rodapé anuncia "As bandeiras ainda não entraram: cada seleção aparece pelo código de duas letras do país" — `T-19` entregou as 32, e a tela contradiz o que ela mesma pinta dois toques adiante | Apagar a linha, ou trocá-la pela lacuna que de fato sobrou. É de M7 e de outra sessão (regra 4): `T-20` fatia 2 só **confirmou** o texto vivo no dev server em 360x640, e não consertou de carona | _(aberto)_ |
| QA-22 | 2026-08-19 | ALTO | `src/net/index.ts` (M6, desde `T-11`) | O relógio de 20 s arma na **criação** do canal e `'failed'` é terminal: convidado que abre o link depois é ignorado, e convite por link não cabe em 20 s | Mexer no prazo ou no momento de armar é portão de M6, logo `D-NN` do dono (regra 4) | _(aberto)_ |
