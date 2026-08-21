---
tags: [nota, qa, e5]
status: atual
---
# `D-70` — E-5 fecha, e a perda de estado no Chrome do desktop é ambiente

Íntegra da evidência de `D-70`, movida do registro pelo corte de `e_qa/registro_no_teto.md` §5.1.
A linha de `D-70` em [[c_decisions|DECISIONS]] guarda o ponteiro.

## O que foi observado

Ao fechar o **Chrome do desktop**, o torneio guardado sumia. A pergunta era se isso é defeito de
código de M8/M9 (persistência errada) ou política de dados do perfil do navegador.

## As três medições que decidem

| aparelho / ação | o torneio sobreviveu? |
|---|---|
| **Edge** (Chromium, mesmo `localStorage`), mesmo build | **sim** |
| **Chrome do celular**, mesmo build | **sim** |
| Chrome do desktop, fechando só a **aba** | **sim** |
| Chrome do desktop, fechando o **navegador** | não |

## Por que isso é ambiente e não defeito

Defeito de código reprovaria **os três** primeiros — é o mesmo build, o mesmo `localStorage` e o
mesmo caminho de escrita. Sobreviveu em Chromium irmão, em Chrome de outra plataforma e no
fechamento de aba do próprio Chrome do desktop. O que resta a explicar o quarto caso é a **política
de dados do perfil** (limpar dados de navegação ao sair), que é configuração do usuário, fora do
alcance de qualquer linha de `src/`.

Com isso **E-5 fecha**: o torneio foi aprovado no aparelho, e esta perda entra como ambiente
declarado — não como achado aberto. O que a entrega declarou de fora está em [[entrega_e6]].
