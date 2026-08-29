"""Regressao de `QA-27`: no ramo `candidatas: nao_citadas`, o aviso de 90% do teto do
registro NAO pode oferecer uma linha REJEITADA — ela e a lista-morta que `D-74` manda
manter viva. Falha na versao anterior ao conserto (oferecia `D-92`); passa depois.

Nao e a suite do kit (`scripts/test_check.py` mora no repositorio do kit e nao veio na
instalacao — ver README). E a prova executavel anexa a `QA-27`, para quem mexer no ramo
`nao_citadas` reprovar antes de commitar.

Rodar:  python e_qa/test_qa27.py
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CHECK = RAIZ / "scripts" / "check.py"

# Registro sintetico: nenhuma das duas linhas e citada por `.md` vivo nenhum, entao as
# duas entram no pool do criterio. So o STATUS as separa.
REGISTRO = """# DECISIONS

| ID | Data | Status | Decisao |
|---|---|---|---|
| D-90 | 2026-01-01 | REJEITADO | linha-morta que `D-74` preserva |
| D-91 | 2026-01-02 | ADOTADO | linha viva, candidata legitima |
"""


def rodar(teto: int) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        vault = Path(tmp)
        (vault / "a_context").mkdir()
        (vault / "a_context" / "c_decisions.md").write_text(REGISTRO, encoding="utf-8")
        (vault / ".kit-config.json").write_text(
            json.dumps({"tetos": {"a_context/c_decisions.md": teto},
                        "candidatas": "nao_citadas"}), encoding="utf-8")
        return subprocess.run([sys.executable, str(CHECK), str(vault)],
                              capture_output=True, text=True, encoding="utf-8",
                              errors="replace").stdout


def main() -> int:
    # Teto escolhido para cair entre 90% e 100% do tamanho do registro sintetico: e o
    # unico ponto em que o ramo das candidatas roda (abaixo de 90% ele nem acende).
    teto = int(len(REGISTRO) / 0.95)
    saida = rodar(teto)
    linha = next((l for l in saida.splitlines() if "Candidatas:" in l), "")
    if not linha:
        print("INCONCLUSIVO: o aviso de 90% nao acendeu - ajuste o teto do fixture.")
        print(saida)
        return 2
    erros = []
    if "D-90" in linha:
        erros.append("QA-27: o aviso ofereceu a REJEITADA D-90 - `D-74` manda preserva-la.")
    if "D-91" not in linha:
        erros.append("o aviso deixou de oferecer a ADOTADA D-91 - o corte virou cego.")
    # O console do Windows nao e UTF-8: imprima so ASCII para o teste nao morrer
    # de encoding no lugar de reprovar (ou aprovar) o que veio medir.
    print(linha.strip().encode("ascii", "replace").decode("ascii"))
    for e in erros:
        print("FALHOU: " + e)
    if erros:
        return 1
    print("OK: REJEITADA fora do pool, ADOTADA dentro (QA-27).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
