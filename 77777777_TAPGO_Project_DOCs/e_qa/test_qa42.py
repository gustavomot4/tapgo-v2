#!/usr/bin/env python3
"""Regressao do QA-42: os dois textos so OFERECEM script que existe.

Nao e a suite do kit (o teste de regressao dos scripts mora no repositorio do kit e nao
veio na instalacao). E um teste de um QA so, no formato de test_qa27.py e test_qa43.py.

O que o QA-42 quebrava: o passo 1 do README.md mandava rodar `new_project.py`, e a ajuda
do task.py listava `test` com `*` -- a marca de portao de CI, a mesma de `check`. Os dois
scripts sao do repositorio do KIT e nunca chegam numa instalacao, entao os dois textos
prometiam comando que morre com "No such file".

A regua e a diferenca simetrica do QA-41, agora sobre OFERTA em vez de inventario:

  1. todo script OFERECIDO nos dois textos existe em `git ls-files scripts/`;
  2. todo script versionado aparece em algum dos dois textos.

Oferta x mencao declarada: nomear um script do kit e legitimo -- o README precisa dizer
de onde o projeto nasceu, e o task.py precisa saber o que `test` chamaria. O que o QA-42
proibe e nomea-lo SEM dizer que ele nao esta aqui. Uma mencao deixa de ser oferta quando
a propria linha (ou, no task.py, a marca `-` que a ajuda imprime) declara a ausencia.

Roda em qualquer maquina com Python e git:  python e_qa/test_qa42.py
"""
import os
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCRIPT = re.compile(r"\b([a-z_][a-z0-9_]*\.py)\b")

# Uma mencao numa linha com uma destas marcas nao e oferta: e ausencia declarada.
DECLARA_AUSENCIA = (
    "não vem na instalação",
    "não veio na instalação",
    "no repositório do kit",
    "do repositório do KIT",
    "é do repositório do kit",
)


def versionados() -> set:
    saida = subprocess.run(
        ["git", "ls-files", "scripts/"], cwd=RAIZ, capture_output=True, text=True, check=True
    ).stdout
    return {Path(l).name for l in saida.splitlines() if l.endswith(".py")}


def ofertas(caminho: Path) -> set:
    """Scripts nomeados sem que a linha declare que eles nao estao aqui."""
    achados = set()
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if any(m.lower() in linha.lower() for m in DECLARA_AUSENCIA):
            continue
        achados.update(SCRIPT.findall(linha))
    return achados


def ajuda_marca_ausente() -> bool:
    """A ajuda do task.py imprime `- <tarefa> ... NAO RODA AQUI` para o que nao veio?"""
    # PYTHONIOENCODING e obrigatorio: a saida do task.py, quando capturada num Windows
    # pt-BR, sai em cp1252 e o "NAO RODA AQUI" acentuado chegaria aqui como lixo.
    ambiente = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    saida = subprocess.run(
        [sys.executable, str(RAIZ / "scripts" / "task.py"), "--help"],
        cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace",
        env=ambiente,
    ).stdout
    ausentes = [l for l in saida.splitlines() if l.startswith("  - ") and "NÃO RODA AQUI" in l]
    tem_legenda = "- = o script é do repositório do KIT" in saida
    marcado_como_portao = any(l.startswith("  * ") and " test " in l for l in saida.splitlines())
    return bool(ausentes) and tem_legenda and not marcado_como_portao


def main() -> int:
    reais = versionados()
    citados = ofertas(RAIZ / "README.md") | ofertas(RAIZ / "scripts" / "task.py")
    # `task.py` cita `check.py`, `install_hook.py`, `arquivar.py`, `evidencia.py`; o
    # inventario do README cita os 7. A uniao tem de fechar com o disco nos dois sentidos.
    oferecido_e_ausente = sorted(citados - reais)
    versionado_e_invisivel = sorted(reais - citados)

    falhas = []
    if oferecido_e_ausente:
        falhas.append(f"oferecido nos textos e ausente do disco: {oferecido_e_ausente}")
    if versionado_e_invisivel:
        falhas.append(f"versionado e nao citado em nenhum dos dois textos: {versionado_e_invisivel}")
    if not ajuda_marca_ausente():
        falhas.append("a ajuda do task.py nao marca com `-` o que nao veio (ou marcou `test` com `*`)")

    if falhas:
        print("QA-42 REGREDIU:")
        for f in falhas:
            print(f"  - {f}")
        return 1
    print(f"QA-42 ok: {len(reais)} scripts versionados, diferenca simetrica vazia;")
    print("          a ajuda do task.py marca o que nao veio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
