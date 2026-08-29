"""Regressao de `QA-43`/`D-101`: o aviso de 90% do `check.py` so pode oferecer o que
`python scripts/arquivar.py`, rodado sem flag, retiraria. O portao nao e um inteiro
esperado - e a IGUALDADE entre as duas listas, medida rodando os DOIS programas sobre o
mesmo vault sintetico.

Existe porque `D-101` recusou o `scripts/_comum.py` que fecharia a divergencia na maquina
(acopla dois scripts que hoje rodam avulsos; o `check.py` copiado sozinho para outro
projeto passaria a quebrar). O que impede a terceira regua e este arquivo: sem ele, sobra
um comentario, e comentario ja falhou uma vez aqui - `D-43` escreveu o criterio em
portugues e deixou os dois scripts o implementarem sozinhos, cada um do seu jeito.

Falha na versao anterior ao conserto (o `check.py` de `5ebeaa6` imprime NENHUMA no
caso 1 e oferece a REJEITADA no caso 2); passa depois.

Nao e a suite do kit (`scripts/test_check.py` mora no repositorio do kit e nao veio na
instalacao - ver README). E a prova executavel anexa a `QA-43`, irma de `test_qa27.py`.

Rodar:  python e_qa/test_qa43.py
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CHECK = RAIZ / "scripts" / "check.py"
ARQUIVAR = RAIZ / "scripts" / "arquivar.py"

# Registro sintetico. Cada linha ADOTADA existe para exercer UMA divergencia de recorte
# que `QA-43` mediu entre os dois scripts - e a REJEITADA existe para o corte de status.
REGISTRO = """# DECISIONS

| ID | Data | Status | Decisao |
|---|---|---|---|
| D-90 | 2026-01-01 | REJEITADO | lista-morta: `D-74` a preserva nos dois programas |
| D-91 | 2026-01-02 | ADOTADO | ninguem cita: candidata em qualquer recorte |
| D-92 | 2026-01-03 | ADOTADO | citada por nota VIVA: fica nos dois |
| D-93 | 2026-01-04 | ADOTADO | citada so pelo destino de arquivamento (e_qa/) |
| D-94 | 2026-01-05 | ADOTADO | citada so dentro de bloco cercado |
| D-95 | 2026-01-06 | ADOTADO | citada so pelo d_agent_learnings |
| D-96 | 2026-01-07 | ADOTADO | citada so por docs/ |
"""

# So `D-92` e citacao de verdade. As outras quatro moram em lugar que o `arquivar.py`
# nao conta - e que o `check.py`, ate `QA-43`, contava.
VIVA = "---\ntags: [nota]\n---\n# Nota viva\n\nDepende de `D-92`.\n"
CERCADO = "---\ntags: [nota]\n---\n# Exemplo\n\n```\nver D-94 aqui dentro\n```\n"
MORTA = "---\ntags: [nota]\n---\n# Somente leitura\n\nCard fechado citava `D-93`.\n"
LICOES = "---\ntags: [nota]\n---\n# Licoes\n\nA sessao aprendeu com `D-95`.\n"
DOCS = "---\ntags: [nota]\n---\n# Doc\n\nGerado a partir de `D-96`.\n"

ESPERADAS = {"D-91", "D-93", "D-94", "D-95", "D-96"}

# Registro so de REJEITADAS: exerce o ramo PADRAO do kit (`mais_antigas`), o que roda em
# quem nunca abriu o `.kit-config.json`. Pool legitimo = vazio.
SO_REJEITADAS = """# DECISIONS

| ID | Data | Status | Decisao |
|---|---|---|---|
| D-90 | 2026-01-01 | REJEITADO | lista-morta |
| D-91 | 2026-01-02 | REJEITADO | lista-morta |
"""


def montar(tmp: str, registro: str, candidatas: str | None) -> Path:
    vault = Path(tmp)
    (vault / "a_context").mkdir()
    (vault / "a_context" / "c_decisions.md").write_text(registro, encoding="utf-8")
    if registro is REGISTRO:
        (vault / "a_context" / "nota_viva.md").write_text(VIVA, encoding="utf-8")
        (vault / "a_context" / "nota_cercada.md").write_text(CERCADO, encoding="utf-8")
        (vault / "e_qa").mkdir()
        (vault / "e_qa" / "backlog_archive.md").write_text(MORTA, encoding="utf-8")
        (vault / "b_process").mkdir()
        (vault / "b_process" / "d_agent_learnings.md").write_text(LICOES, encoding="utf-8")
        (vault / "docs").mkdir()
        (vault / "docs" / "gerado.md").write_text(DOCS, encoding="utf-8")
    # Teto entre 90% e 100% do registro: e o unico ponto em que o ramo das candidatas
    # roda (abaixo de 90% o aviso nem acende; acima de 100% vira falha, sem candidatas).
    cfg = {"tetos": {"a_context/c_decisions.md": int(len(registro) / 0.95)}}
    if candidatas:
        cfg["candidatas"] = candidatas
    (vault / ".kit-config.json").write_text(json.dumps(cfg), encoding="utf-8")
    return vault


def rodar(script: Path, vault: Path) -> str:
    return subprocess.run([sys.executable, str(script), str(vault)],
                          capture_output=True, text=True, encoding="utf-8",
                          errors="replace").stdout


def pool_do_check(saida: str):
    """IDs oferecidos pelo aviso de 90%. `None` = o aviso nao acendeu (inconclusivo)."""
    linha = next((l for l in saida.splitlines() if "Candidatas:" in l), None)
    if linha is None:
        return None, ""
    return set(re.findall(r"D-\d+", linha.split("Candidatas:")[1])), linha.strip()


def pool_do_arquivar(saida: str):
    """IDs listados sob o cabecalho `Candidatas (N)`, um por linha indentada."""
    corte = saida.split("Candidatas (")
    if len(corte) < 2:
        return set()
    return set(re.findall(r"^\s+(D-\d+)\s+\|", corte[1], re.M))


def main() -> int:
    erros = []

    # Caso 1 - a igualdade que `D-101` comprou, no ramo deste projeto.
    with tempfile.TemporaryDirectory() as tmp:
        vault = montar(tmp, REGISTRO, "nao_citadas")
        do_check, linha = pool_do_check(rodar(CHECK, vault))
        do_arquivar = pool_do_arquivar(rodar(ARQUIVAR, vault))
    if do_check is None:
        print("INCONCLUSIVO: o aviso de 90% nao acendeu - ajuste o teto do fixture.")
        return 2
    print("check.py    : " + (", ".join(sorted(do_check)) or "(vazio)"))
    print("arquivar.py : " + (", ".join(sorted(do_arquivar)) or "(vazio)"))
    if do_arquivar != ESPERADAS:
        erros.append("o fixture nao mede o que dizia: arquivar.py devolveu %s, esperado %s."
                     % (sorted(do_arquivar), sorted(ESPERADAS)))
    if do_check != do_arquivar:
        so_check = sorted(do_check - do_arquivar)
        so_arq = sorted(do_arquivar - do_check)
        erros.append("QA-43: duas reguas para a mesma linha - so no check.py: %s; "
                     "so no arquivar.py: %s." % (so_check or "-", so_arq or "-"))

    # Caso 2 - o ramo PADRAO do kit: REJEITADA fora, e pool vazio diz NENHUMA.
    with tempfile.TemporaryDirectory() as tmp:
        vault = montar(tmp, SO_REJEITADAS, None)
        padrao, linha_padrao = pool_do_check(rodar(CHECK, vault))
    if padrao is None:
        print("INCONCLUSIVO: o aviso de 90% nao acendeu no ramo padrao.")
        return 2
    print("mais_antigas: " + (", ".join(sorted(padrao)) or "(vazio)"))
    if padrao:
        erros.append("D-101: o ramo padrao ofereceu REJEITADA(s) %s - sem "
                     "--incluir-rejeitadas o arquivar.py nunca as retira." % sorted(padrao))
    if "NENHUMA" not in linha_padrao:
        erros.append('D-101: pool vazio no ramo padrao nao imprimiu NENHUMA - '
                     '"as mais antigas" aponta para a linha que a ferramenta se recusa a tirar.')

    for e in erros:
        # O console do Windows nao e UTF-8: so ASCII, para o teste nao morrer de
        # encoding no lugar de reprovar (ou aprovar) o que veio medir.
        print("FALHOU: " + e.encode("ascii", "replace").decode("ascii"))
    if erros:
        return 1
    print("OK: os dois programas devolvem a MESMA lista, e o ramo padrao "
          "nao oferece REJEITADA (QA-43/D-101).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
