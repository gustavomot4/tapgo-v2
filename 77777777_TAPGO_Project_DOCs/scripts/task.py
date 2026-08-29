#!/usr/bin/env python3
"""Ponto de entrada único do kit.  Uso: python scripts/task.py [tarefa]

Por que isto existe: os comandos do kit moravam em prosa espalhada pelo README, pelo
roteiro e pelo guia do Obsidian. Prosa duplicada derrapa — uma auditoria encontrou três
divergências doc × código num único arquivo, e a regra do próprio kit diz que
divergência doc × código é achado de QA. Comando que mora em UM lugar não derrapa.

Não é um Makefile de propósito: `make` não existe num Windows por padrão, e o kit não
tem nenhuma dependência externa — roda em qualquer máquina com Python, sem `pip install`
e sem rede. Manter isso vale mais do que a conveniência de `make check`.
"""
import subprocess
import sys
from pathlib import Path

# Rede de segurança da SAÍDA (o gêmeo do QA-01). Saída redirecionada num Windows pt-BR
# usa cp1252, não UTF-8: um caractere fora dele — uma seta, um "≤" — mata o script na
# hora de IMPRIMIR, depois de todo o trabalho feito. `errors="replace"` degrada em vez
# de matar, e não muda nada no console, que já é UTF-8.
for _fluxo in (sys.stdout, sys.stderr):
    if hasattr(_fluxo, "reconfigure"):
        _fluxo.reconfigure(errors="replace")

AQUI = Path(__file__).resolve().parent
PY = sys.executable or "python"

# nome -> (argumentos, o que faz, é portão?)
TAREFAS = {
    "check":     ([PY, str(AQUI / "check.py")],
                  "Portão de higiene: orçamento, links, IDs, segredo na árvore + 30 commits.", True),
    "check-all": ([PY, str(AQUI / "check.py"), "--historico-completo"],
                  "Igual, varrendo o histórico INTEIRO. Rode antes de entregar (Fase 6).", True),
    "strict":    ([PY, str(AQUI / "check.py"), "--avisos-reprovam"],
                  "Igual ao check, mas avisos também reprovam.", True),
    "hook":      ([PY, str(AQUI / "install_hook.py")],
                  "Instala o pre-commit — sem isto o portão só roda quando você lembra.", False),
    "escopo":    ([PY, str(AQUI / "install_hook.py"), "--escopo"],
                  "Liga a trava de escopo: escrita fora da pasta do módulo em andamento é "
                  "recusada (Claude Code). Desligar: `escopo --remover`.", False),
    "portao":    ([PY, str(AQUI / "install_hook.py"), "--portao"],
                  "Liga a trava do pulo: `git commit --no-verify` sem 'SEM-PORTAO: <motivo>' "
                  "é recusado (Claude Code). Desligar: `portao --remover`.", False),
    "unhook":    ([PY, str(AQUI / "install_hook.py"), "--remover"],
                  "Remove o pre-commit deste kit.", False),
    "arquivar":  ([PY, str(AQUI / "arquivar.py")],
                  "Lista as decisões que ninguém vivo cita (relata; só escreve com --aplicar).", False),
    "arquivar-backlog": ([PY, str(AQUI / "arquivar.py"), "--backlog"],
                  "Card FECHADO vira ponteiro com ID e Módulo; íntegra vai para e_qa/. "
                  "É a saída da checagem 15 (relata; só escreve com --aplicar).", False),
    "evidencia": ([PY, str(AQUI / "evidencia.py")],
                  "Mede o uso do kit neste projeto a partir do git e dos arquivos "
                  "(relata; use --json para acumular entre projetos).", False),
    # Fica na tabela para a ajuda poder marcá-lo com `-` em vez de calar (QA-42).
    "test":      ([PY, str(AQUI / "test_check.py")],  # do repositório do KIT: não veio aqui
                  "Testes de regressão dos scripts (encoding, worktree, git ausente).", True),
}


def instalada(cmd) -> bool:
    """O script desta tarefa veio nesta instalação?

    A ajuda pergunta ao disco em vez de confiar numa lista fixa: `test` é do
    repositório do KIT e nunca chega num projeto, e oferecê-lo com a mesma marca de
    portão de `check` fazia a ajuda mentir até alguém rodar a tarefa (QA-42).
    """
    return Path(cmd[1]).exists()


def ajuda() -> int:
    print(__doc__.splitlines()[0])
    print("\nTarefas:\n")
    largura = max(len(n) for n in TAREFAS)
    faltando = False
    for nome, (cmd, desc, portao) in TAREFAS.items():
        if instalada(cmd):
            marca = "*" if portao else " "
            print(f"  {marca} {nome:<{largura}}  {desc}")
        else:
            faltando = True
            print(f"  - {nome:<{largura}}  {desc} NÃO RODA AQUI.")
    print("\n  * = reprova com código 1 quando encontra problema (serve de portão em CI).")
    if faltando:
        print("  - = o script é do repositório do KIT e não veio nesta instalação.")
    print("\nSem argumento, roda `check`.")
    return 0


def main() -> int:
    pedido = sys.argv[1] if len(sys.argv) > 1 else "check"
    if pedido in ("-h", "--help", "help", "ajuda"):
        return ajuda()
    if pedido not in TAREFAS:
        print(f"Tarefa desconhecida: {pedido}\n")
        ajuda()
        return 2
    cmd = TAREFAS[pedido][0] + sys.argv[2:]
    if not instalada(cmd):
        # Acontece de propósito com `test`: `test_check.py` é do repositório do KIT e não
        # veio nesta instalação. Mensagem que explica vale mais que a que só reclama.
        print(f"A tarefa '{pedido}' não existe aqui: {Path(cmd[1]).name} não foi instalado.")
        if pedido == "test":
            print("   `test` é do repositório do KIT — ele testa os próprios scripts.")
            print("   Num projeto, o portão é `check` (e `check-all` antes de entregar).")
        return 1
    return subprocess.run(cmd, cwd=AQUI.parent).returncode


if __name__ == "__main__":
    sys.exit(main())
