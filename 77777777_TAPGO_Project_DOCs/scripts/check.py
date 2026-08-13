#!/usr/bin/env python3
"""Higiene do pipeline. Uso: python scripts/check.py [pasta] [--avisos-reprovam]

Cada checagem existe porque uma regra do kit era só prosa e alguém a pulou.
As regras que a máquina consegue julgar, ela julga aqui; o que sobra é honestamente
do dono (ver "Limites conhecidos" no README).

Os caminhos seguem o padrão do repositório (b_process/e_repository_standard.md):
documentação em a_context/ b_process/ c_technical_docs/ d_history/ e_qa/.
Mudou o padrão? O bloco de constantes no topo é o único lugar a mexer.

FALHAS (código 1)
  1. Orçamento do contexto-fonte        7. Wikilink sem destino
  2. Registro de decisões inchado       8. Segredo versionado (árvore + histórico)
  3. Fonte única (contexto/plano/dec.)  9. .gitignore sem cobertura mínima de segredo
  4. WIP acima do declarado            10. IDs D-/Q-/QA- citados que não existem
  5. Cruft óbvio                       11. IDs duplicados entre os DOIS registros
  6. Skill sem name/description        12. "Em andamento" divergindo entre BACKLOG e CONTEXT
                                       13. Tarefa apontando módulo que não existe no PLANO
                                       14. Skill fora do esquema (Contexto/Limites/Saída)
                                       15. Registro de QA inchado

AVISOS (não reprovam; com --avisos-reprovam, reprovam)
  frontmatter ausente · placeholders · templates em rascunho · nota órfã ·
  arquivo grande não varrido · varredura de histórico que não rodou ·
  portão automático (pre-commit) não instalado · módulo do PLANO sem tarefa ·
  description de skill sem fronteira negativa · CONTEXT perto do teto ·
  DECISIONS perto do teto · QA perto do teto · tema de a_context/ fora do mapa de leitura ·
  sessão sem skill declarada no changelog · ocupação declarada divergindo do arquivo ·
  questão do dono ausente do CONTEXT · achado grave aberto há mais de 14 dias

Os orçamentos são medidos SEM o padding de alinhamento das tabelas (`medida()`, `D-50`):
teto que conta espaço de alinhamento mede o formatador do editor, não o texto.

O README declara quantos itens de checklist existem e quantos esta máquina julga.
Esse número é cobrado por `test_check.py` — a frase mais honesta do kit não pode
ser a que envelhece em silêncio.

Marque uma linha com `checar:ignore` para isentá-la da varredura de segredo
(use só quando o valor for comprovadamente falso — a marca fica visível no diff).
"""
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

# O git emite caminhos em UTF-8. `text=True` SOZINHO decodifica com o encoding do
# SISTEMA — cp1252 num Windows pt-BR — e um caminho com acento ("Área de Trabalho",
# nome real da pasta sob OneDrive KFM em português) derruba a thread leitora com
# UnicodeDecodeError. Pior: UnicodeDecodeError é ValueError, então os `except
# (SubprocessError, OSError)` abaixo passam ao largo; `stdout` volta None e o dono vê
# um AttributeError a duas funções da causa. Resultado medido: o portão nunca rodou
# na máquina do dono, e todo "OK" veio do sandbox Linux do agente.
UTF8 = {"encoding": "utf-8", "errors": "replace"}

# Rede de segurança da SAÍDA (o gêmeo do QA-01). Saída redirecionada num Windows pt-BR
# usa cp1252, não UTF-8: um caractere fora dele — uma seta, um "≤" — mata o script na
# hora de IMPRIMIR, depois de todo o trabalho feito. `errors="replace"` degrada em vez
# de matar, e não muda nada no console, que já é UTF-8.
for _fluxo in (sys.stdout, sys.stderr):
    if hasattr(_fluxo, "reconfigure"):
        _fluxo.reconfigure(errors="replace")

args = [a for a in sys.argv[1:] if not a.startswith("--")]
ESTRITO = "--avisos-reprovam" in sys.argv
raiz = Path(args[0] if args else ".").resolve()
falhas, avisos = [], []


def achar_vault(inicio: Path) -> Path:
    """No kit, a documentação É a raiz. Num projeto, ela vira `77777777_<TAG>_Project_DOCs/`.
    Sem isto o hook precisaria saber o nome da pasta de docs de cada projeto."""
    if (inicio / "a_context").is_dir():
        return inicio
    candidatos = sorted(p for p in inicio.glob("*_Project_DOCs") if (p / "a_context").is_dir())
    if len(candidatos) == 1:
        return candidatos[0]
    if len(candidatos) > 1:
        nomes = ", ".join(p.name for p in candidatos)
        print(f"FALHOU:\n - Mais de uma pasta de documentação ({nomes}) — o padrão pede uma só.")
        sys.exit(1)
    return inicio


def info_git(inicio: Path):
    """Devolve (topo do repositório, pasta de hooks) — e `None` nos hooks quando NÃO há
    repositório git acessível. Uma chamada responde as duas perguntas.

    `(topo / ".git").is_dir()` NÃO serve como teste de "estou num repositório", e essa
    era a falha: em worktree e em submódulo o `.git` é ARQUIVO, então a varredura de
    HISTÓRICO era pulada em silêncio e a saída anunciava "últimos 30 commits" mesmo
    assim. Medido: com segredo plantado no histórico e removido da árvore, repositório
    normal REPROVA (correto) e worktree imprime OK com exit 0. Mesma armadilha quando o
    git não está no PATH. `rev-parse` cobre os quatro casos.

    O padrão põe `.gitignore`, `.gitattributes` e `CLAUDE.md` FORA da pasta de
    documentação, e a varredura de segredo tem de cobrir o código também — por isso o
    topo do repositório, e não só o vault.
    """
    try:
        linhas = subprocess.run(
            ["git", "-C", str(inicio), "rev-parse", "--show-toplevel", "--git-path", "hooks"],
            capture_output=True, text=True, check=True, timeout=15, **UTF8,
        ).stdout.splitlines()
    except (subprocess.SubprocessError, OSError):
        return inicio, None
    if len(linhas) < 2 or not linhas[0].strip():
        return inicio, None
    topo_do_repo = Path(linhas[0].strip()).resolve()
    # `--git-path` vem relativo à pasta passada em `-C` (não ao topo), e vem ABSOLUTO
    # em worktree. Respeita `core.hooksPath` de graça — cravar `.git/hooks` não respeita.
    hooks = Path(linhas[1].strip())
    return topo_do_repo, (hooks if hooks.is_absolute() else (inicio / hooks).resolve())


# DOIS escopos, de propósito:
#   raiz = o vault  -> orçamento, links, órfãs, IDs, WIP, skills
#   topo = o repo   -> .gitignore, cruft, varredura de segredo (árvore + histórico)
raiz = achar_vault(raiz)
topo, DIR_HOOKS = info_git(raiz)
TEM_GIT = DIR_HOOKS is not None

# --- Layout do padrão do repositório (b_process/e_repository_standard.md) ---------
# Um lugar só define onde cada coisa mora. Mudou o padrão? Mude aqui, e só aqui.
# Os caminhos são relativos à raiz da pasta de documentação (o vault).
CONTEXTO = "a_context/a_context_source.md"      # a verdade: estado, ≤4.000 chars
PLANO = "a_context/b_plan.md"                   # plano congelado
DECISOES = "a_context/c_decisions.md"           # D-NN / Q-NN, append-only
# `A-13`/`D-50`: os QA-NN saíram do DECISOES. Motivo medido: três registros de ciclo de vida
# diferente dividiam um orçamento só, e o de QA crescia 10,8× contra 3,6× do de decisões —
# com 6 achados ABERTOS, que por definição não se arquivam. Registro separado, orçamento
# separado; os IDs continuam únicos entre os DOIS arquivos (ver bloco 10/11).
QA_REG = "a_context/d_qa.md"                    # QA-NN, append-only
BACKLOG = "b_process/c_backlog.md"              # fonte única de tarefas
CHANGELOG = "d_history/a_changelog.md"          # histórico datado; nenhuma sessão carrega
ARQUIVO_MORTO = "e_qa/decisions_archive.md"     # íntegra das linhas retiradas da tabela
SKILLS = "b_process/skills"                     # os agentes instaláveis
# Pastas do vault: só nelas "nota órfã" faz sentido. Markdown do próprio app
# (content/, docs de pacote, README de módulo) não é nota e não bloqueia commit.
PASTAS_VAULT = {"a_context", "b_process", "c_technical_docs", "d_history", "e_qa"}
# Histórico e evidência: citam IDs de OUTROS projetos, ficam fora da checagem de existência.
# `docs/` entra aqui porque é onde mora a auditoria do PRÓPRIO kit (ver e_qa/README.md):
# ela cita D-NN e QA-NN dos projetos-cobaia, que nunca existirão no DECISIONS deste repo.
PASTAS_HISTORICAS = {"d_history", "e_qa", "docs"}
# ----------------------------------------------------------------------------------

# `.pytest_cache` e `.mypy_cache` entram porque um `README.md` gerado por ferramenta dentro
# deles disparava "nota sem frontmatter" — aviso falso, sobre arquivo que não é nota e que o
# dono não escreveu. Aviso falso ensina a ignorar aviso: é a regra do próprio kit, e ela
# estava sendo violada na primeira execução real numa máquina com pytest instalado.
IGNORAR = {".git", ".venv", "venv", "node_modules", ".obsidian", "__pycache__",
           ".pytest_cache", ".mypy_cache", ".ruff_cache", ".next", "dist", "build"}
# Notas que existem para serem lidas soltas: não são órfãs por não serem linkadas.
ORFA_OK = {"README", "INDEX", "CLAUDE", "AGENTS"}
# Acima disto o arquivo não é varrido (e o pulo é declarado como aviso, nunca silencioso).
LIMITE_BYTES = 1_000_000


def visiveis(padrao, base=None):
    """Por padrão varre o vault. Passe base=topo para varrer o repositório inteiro."""
    return [p for p in (base or raiz).rglob(padrao) if not (set(p.parts) & IGNORAR)]


def alvos_de_varredura():
    """Universo da varredura de segredo. Com git, é o que o git enxerga — isso respeita
    o .gitignore de graça (sem isso, um CSV de 17 MB em open-data/, já ignorado, era lido
    a cada commit). Sem git, cai para o rglob com a lista fixa de exclusão."""
    if TEM_GIT:
        try:
            saida = subprocess.run(
                ["git", "-C", str(topo), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
                capture_output=True, text=True, timeout=20, check=True, **UTF8,
            ).stdout
            return [topo / n for n in saida.split("\0") if n]
        except (subprocess.SubprocessError, OSError):
            pass
    return visiveis("*", topo)


def sem_codigo(texto):
    texto = re.sub(r"```.*?```", "", texto, flags=re.S)
    return re.sub(r"`[^`\n]*`", "", texto)


def sem_bloco_de_codigo(texto):
    """Só o bloco cercado. É o filtro certo para a checagem de ID (10).

    `sem_codigo` também apaga a crase SIMPLES, e para wikilink isso está certo: `[[x]]`
    dentro de crase é exemplo, não link. Para ID é o contrário — medido: 300 de 341
    citações de ID estavam ENTRE CRASES, porque a casa escreve `D-13`, não D-13.
    Filtrando por `sem_codigo`, a checagem enxergava 12% das citações e imprimia verde
    sobre os outros 88%: portão que não olha é pior que portão que não existe, porque
    o verde continua saindo.
    """
    return re.sub(r"```.*?```", "", texto, flags=re.S)


def medida(texto):
    """Tamanho do CONTEÚDO, sem o padding de alinhamento das tabelas (`A-13`/`D-50`).

    Medido em 2026-08-12: ao salvar o `c_decisions.md`, um formatador de Markdown alinhou
    as colunas e somou **2.048 caracteres de padding puro** — 17% do arquivo, sem uma
    palavra nova. O arquivo saltou de 11.470 para 13.806 e o portão passou a REPROVAR num
    commit que só respondia uma questão; foi preciso desalinhar tudo à mão para voltar.

    Orçamento que conta espaço de alinhamento mede o FORMATADOR do editor, não o texto —
    e some ou volta conforme quem salvou por último. Aqui as células viram `a|b|c` antes
    de contar, então o mesmo conteúdo mede igual em qualquer editor.

    Só mede; NUNCA reescreve o arquivo. O alinhamento continua livre para quem edita.
    """
    linhas = []
    for linha in texto.split("\n"):
        if linha.lstrip().startswith("|"):
            linha = re.sub(r" *\| *", "|", linha.strip())
        linhas.append(linha)
    return len("\n".join(linhas))


# Notas do repositório inteiro: o padrão deixa CLAUDE.md e README.md fora do vault,
# e um wikilink para eles não pode contar como link quebrado.
notas = sorted(visiveis("*.md", topo))
corpo = {p: p.read_text(encoding="utf-8") for p in notas}

# 1. Orçamento do contexto-fonte (regra 1)
ctx = raiz / CONTEXTO
texto_ctx = corpo.get(ctx, "")
n_ctx = medida(texto_ctx)
if not ctx.exists():
    falhas.append(f"{CONTEXTO} não encontrado — é onde o padrão do repositório põe o contexto-fonte.")
elif n_ctx > 4000:
    falhas.append(
        f"{CONTEXTO} com {n_ctx} caracteres (orçamento: 4.000). "
        f"Corte: detalhe -> a_context/<tema>.md, decisão -> {DECISOES}, datado -> d_history/a_changelog.md."
    )
elif n_ctx > 3600:
    # Avisar a 90% em vez de só reprovar a 100%: quando o teto estoura, quem escreve
    # está no meio de uma sessão de trabalho e vai cortar o que estiver à mão — não o
    # que devia sair. O aviso dá a chance de mover um tema com calma, antes da parede.
    avisos.append(
        f"{CONTEXTO} com {n_ctx}/4.000 caracteres ({100*n_ctx//4000}%) — "
        "mova um tema para a_context/<tema>.md agora, não na sessão em que estourar."
    )

# 2. Registros inchados (projeto longo). São DOIS desde `D-50`, com tetos separados:
#    decisão permanente envelhece devagar e arquiva; achado de QA ABERTO não arquiva nunca.
#    Somar os dois num teto só fazia o segundo comer o orçamento do primeiro.
qa_reg = raiz / QA_REG
texto_qa = corpo.get(qa_reg, "")
n_qa = medida(texto_qa)
if texto_qa and n_qa > 8000:
    falhas.append(
        f"{QA_REG} acima de 8.000 caracteres — feche ou arquive achados em "
        "e_qa/decisions_archive.md (IDs preservados) e deixe um ponteiro."
    )
elif texto_qa and n_qa > 6400:
    avisos.append(
        f"{QA_REG} com {n_qa}/8.000 caracteres ({100*n_qa//8000}%) — "
        "achado FECHADO vira ponteiro; achado aberto fica, e por isso o corte tem de ser nos fechados."
    )

dec = raiz / DECISOES
texto_dec = corpo.get(dec, "")
n_dec = medida(texto_dec)
if texto_dec and n_dec > 12000:
    falhas.append(
        f"{DECISOES} acima de 12.000 caracteres — arquive SUPERSEDIDAS/rejeitadas antigas "
        "em e_qa/decisions_archive.md (IDs preservados) e deixe um ponteiro."
    )
elif texto_dec and n_dec > 10800:
    # O README declarava esta fraqueza com todas as letras: "o arquivamento é manual e
    # ninguém lembra". Portão que só roda quando alguém lembra não é portão — foi o
    # argumento do QA-04, e valia contra o próprio kit. O script não arquiva (a decisão
    # é do dono); ele avisa antes da parede e já aponta os candidatos.
    # `D-63`: as candidatas saem do critério de `D-43` — sai da tabela quem NENHUM `.md` vivo
    # cita. Listar "as mais antigas" mandava arquivar linha que `D-43` proíbe retirar: o aviso
    # ensinava a violar a regra que ele deveria proteger, e quem obedecesse reprovaria depois.
    vivos = "\n".join(txt for cam, txt in corpo.items()
                      if cam.name not in (Path(DECISOES).name, Path(ARQUIVO_MORTO).name)
                      and "d_history" not in cam.parts)
    velhas = [i for i in re.findall(r"^\|\s*(D-\d+)\s*\|", texto_dec, re.M)
              if not re.search(rf"\b{i}\b", vivos)]
    amostra = ", ".join(velhas[:5]) if velhas else (
        "NENHUMA — todo D-NN vivo é citado por algum .md, então o corte de `D-43` está esgotado "
        "e o que resta é rever o teto")
    avisos.append(
        f"{DECISOES} com {n_dec}/12.000 caracteres ({100*n_dec//12000}%) — "
        f"arquive o que `D-43` libera em e_qa/decisions_archive.md, preservando os IDs. Candidatas: {amostra}."
    )

# 3. Fonte única (regra 6) — o mesmo nome em dois lugares é estado duplicado
for nome in (Path(BACKLOG).name, Path(CONTEXTO).name, Path(DECISOES).name, Path(QA_REG).name):
    achados = visiveis(nome)
    if len(achados) > 1:
        caminhos = ", ".join(str(p.relative_to(raiz)) for p in achados)
        falhas.append(f"{nome} duplicado ({caminhos}) — fonte única!")

# 4. WIP: o limite é o DECLARADO no cabeçalho do BACKLOG ("Em andamento (máx N)").
#    Projeto solo declara 1; um time de 3 declara 3 e o kit deixa de atrapalhar.
bl = raiz / BACKLOG
texto_bl = corpo.get(bl, "")
em_andamento = []
if texto_bl:
    bloco = re.search(r"## Em andamento([^\n]*)\n(.*?)(?=\n## |\Z)", texto_bl, re.S)
    if bloco:
        # "máx 3", "max 3", "limite 3", "≤ 3" — a mesma intenção escrita de quatro jeitos.
        # Só `máx` era aceito, e as outras caíam no default 1 em SILÊNCIO: o dono declarava
        # 3, o script cobrava 1 e ainda dizia "limite declarado é 1". Mensagem que afirma
        # ter lido o que não leu é o defeito que este arquivo inteiro persegue.
        m = re.search(r"(?:m[áa]x(?:imo)?|limite|≤|<=)\s*[:=]?\s*(\d+)", bloco.group(1), re.I)
        limite = int(m.group(1)) if m else 1
        em_andamento = re.findall(r"^- \[ \] *(\S+)", bloco.group(2), re.M)
        if len(em_andamento) > limite:
            falhas.append(
                f"{BACKLOG}: {len(em_andamento)} itens 'Em andamento', limite declarado é {limite} "
                "— termine, despromova, ou suba o limite no cabeçalho se o time cresceu."
            )

# 5. Cruft óbvio
cruft = [p for pat in ("*.bak", "*.tmp", "*.orig", ".fuse_hidden*") for p in visiveis(pat, topo)]
if cruft:
    falhas.append("Cruft: " + ", ".join(str(p.relative_to(topo)) for p in cruft[:10]))

# 6. Skills: existem e têm frontmatter com name + description
dir_skills = raiz / SKILLS
if dir_skills.is_dir():
    encontradas = sorted(dir_skills.glob("*/SKILL.md"))
    if not encontradas:
        falhas.append(f"{SKILLS}/ existe mas não tem nenhum SKILL.md — os agentes do pipeline estão faltando.")
    for skill in encontradas:
        cabeca = corpo.get(skill, skill.read_text(encoding="utf-8"))[:800]
        rel = skill.relative_to(raiz)
        if not cabeca.startswith("---"):
            falhas.append(f"{rel}: sem frontmatter — a skill não será reconhecida.")
            continue
        if "name:" not in cabeca:
            falhas.append(f"{rel}: frontmatter sem 'name:'.")
        if "description:" not in cabeca:
            falhas.append(f"{rel}: frontmatter sem 'description:' — sem ela a skill não dispara.")
        # Esquema do corpo. Medido: 24/24 das skills tinham "Contexto" e "Saída" por
        # convenção, e NENHUMA tinha limite explícito — a convenção sobrevivia por hábito,
        # e hábito não sobrevive a uma skill nova escrita com pressa.
        #   Contexto = o que a sessão carrega (o oposto de "leia o repositório")
        #   Limites  = o que o agente não faz mesmo tendo sido escolhido certo
        #   Saída    = o artefato, para o dono saber o que esperar
        texto_skill = corpo.get(skill, skill.read_text(encoding="utf-8"))
        for secao in ("## Contexto que você recebe", "## Limites", "## Saída"):
            if secao not in texto_skill:
                falhas.append(f"{rel}: sem a seção '{secao}' — esquema obrigatório de skill.")
        # A `description` é o único texto que a ferramenta lê para ESCOLHER a skill. Sem a
        # fronteira negativa, duas skills disputam a mesma tarefa e a errada ganha metade
        # das vezes. É aviso, não falha: skill em rascunho pode ainda não saber quem é a vizinha.
        if "Não use" not in cabeca:
            avisos.append(
                f"{rel}: description sem 'Não use para … (é <outra skill>)' — "
                "sem fronteira negativa, a skill errada dispara."
            )

# 7. Wikilinks: destino que não existe (link quebrado). A nota órfã virou AVISO — ver abaixo.
por_caminho = {p.relative_to(topo).with_suffix("").as_posix() for p in notas}
por_caminho |= {p.relative_to(raiz).with_suffix("").as_posix() for p in notas if raiz in p.parents}
por_nome = {p.stem for p in notas}
quebrados, apontadas = {}, set()
for nota in notas:
    for bruto in re.findall(r"\[\[([^\]\n]+)\]\]", sem_codigo(corpo[nota])):
        alvo = bruto.split("|")[0].rstrip("\\").split("#")[0].strip()
        if not alvo or alvo.startswith("<") or set(alvo) <= {".", " "}:
            continue
        alvo = alvo[:-3] if alvo.endswith(".md") else alvo
        if alvo in por_caminho or alvo in por_nome:
            apontadas.add(alvo)
            continue
        casa = [c for c in por_caminho if c.endswith("/" + alvo)]
        if casa:
            apontadas.update(casa)
            continue
        quebrados.setdefault(nota.relative_to(topo).as_posix(), set()).add(alvo)
if quebrados:
    detalhe = "; ".join(f"{a} -> {', '.join(sorted(v))}" for a, v in sorted(quebrados.items())[:8])
    falhas.append(f"Wikilink(s) sem destino: {detalhe}")

# Nota órfã: AVISO, e só dentro do vault.
# Era FALHA e varria o repositório inteiro — qualquer `content/blog/*.md` ou doc de pacote
# do próprio app bloqueava TODO commit por motivo cosmético. O efeito medido era o pior
# possível: o dono adotava `git commit --no-verify` por hábito e desligava junto o portão
# de segredo, o orçamento e a fonte única. Portão que se aprende a pular não é portão.
orfas = []
for p in notas:
    if p != raiz / p.name and raiz not in p.parents:
        continue  # fora do vault (código do app, README da raiz): não é nota
    rel = p.relative_to(raiz)
    no_vault = len(rel.parts) == 1 or rel.parts[0] in PASTAS_VAULT
    if not no_vault or p.stem in ORFA_OK:
        continue
    if p.stem in apontadas or rel.with_suffix("").as_posix() in apontadas:
        continue
    orfas.append(rel.as_posix())
if orfas:
    avisos.append(
        "Nota(s) órfã(s) no vault — ninguém linka, então ninguém lê: "
        + ", ".join(sorted(orfas)[:8])
    )

# 8. Segredo versionado — a checagem que a skill guardrails-review exige.
#
# Dois erros de desenho que a auditoria de 2026-07-30 mediu (0 de 8 segredos reais
# detectados) e que este bloco corrige:
#   a) o filtro de exemplo descartava a LINHA INTEIRA — um comentário `# ver <ticket-4412>`
#      desligava a checagem. Agora ele avalia só o TRECHO CASADO.
#   b) os padrões exigiam aspas, então a linha de .env (`API_KEY=sk_live_...`), que é o
#      formato mais comum de vazamento, passava. Agora valor sem aspas também casa.
#
# Valor sem aspas: exige dígito, para não casar com prosa ("token: obrigatório").
VALOR = r"""(?:['"](?P<q>[^'"\s]{8,})['"]|(?P<u>(?=[^\s'"]*\d)[^\s'";,)]{12,}))"""
CHAVE = r"(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|aws_secret_access_key|aws_access_key_id|secret)"
PADROES = [
    # sem \b à esquerda: DB_PASSWORD / MY_API_KEY não têm fronteira depois do underscore
    (rf"(?i){CHAVE}\b\s*[:=]\s*{VALOR}", "chave/segredo literal"),
    (rf"(?i)(?:password|senha|passwd|pwd)\b\s*[:=]\s*{VALOR}", "senha literal"),
    # senha embutida em connection string: postgres://user:SENHA@host
    (r"(?i)\b[a-z][a-z0-9+.-]{2,}://[^\s:@/]{1,64}:(?P<u>[^\s:@/]{6,})@", "senha em connection string"),
    (r"\bAKIA[0-9A-Z]{16}\b", "access key AWS"),
    (r"-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----", "chave privada"),
    (r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b", "JWT"),
    (r"\b[sr]k_(live|test)_[A-Za-z0-9]{16,}\b", "chave estilo Stripe"),
    (r"\bsk-[A-Za-z0-9_-]{20,}\b", "token estilo OpenAI"),
    (r"\bgh[pousr]_[A-Za-z0-9]{30,}\b", "token GitHub"),
    (r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b", "token Slack"),
    (r"\bglpat-[A-Za-z0-9_-]{18,}\b", "token GitLab"),
]
# Avaliado SÓ contra o trecho casado (ou contra o valor, quando o padrão o captura).
EXEMPLO = re.compile(r"(?i)<[^>]*>|x{3,}|change[_-]?me|your[_-]|placeholder|exemplo|example|dummy|fake|sample|redacted|\.\.\.|^\$\{|^<%")
ARQUIVO_EXEMPLO = re.compile(r"(?i)(\.example|\.sample|\.template|\.dist)(\.|$)")
ISENTA = re.compile(r"checar:ignore")


def varrer(texto, origem, achados):
    if ARQUIVO_EXEMPLO.search(origem):
        return
    for linha_n, linha in enumerate(texto.splitlines(), 1):
        if ISENTA.search(linha):
            continue
        for padrao, rotulo in PADROES:
            m = re.search(padrao, linha)
            if not m:
                continue
            # o filtro de exemplo olha o valor casado, nunca o resto da linha
            grupos = m.groupdict()
            alvo = grupos.get("q") or grupos.get("u") or m.group(0)
            if EXEMPLO.search(alvo):
                continue
            achados.append(f"{origem}:{linha_n} ({rotulo})")
            break


achados_seg, grandes = [], []
for p in alvos_de_varredura():
    if not p.is_file() or p.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".ico", ".woff", ".woff2"):
        continue
    try:
        if p.stat().st_size > LIMITE_BYTES:
            grandes.append(p.relative_to(topo).as_posix())
            continue
        varrer(p.read_text(encoding="utf-8"), p.relative_to(topo).as_posix(), achados_seg)
    except (UnicodeDecodeError, OSError, ValueError):
        continue
if grandes:
    avisos.append(
        f"{len(grandes)} arquivo(s) acima de 1 MB NÃO varridos por segredo: "
        + ", ".join(sorted(grandes)[:5])
        + " — confira à mão se algum devia ser versionado."
    )

# O histórico é caro de varrer e este script roda em todo commit: por padrão olha
# os 30 commits recentes. A varredura completa é da Fase 6 (skills/revisao-entrega),
# ou aqui com --historico-completo.
COMPLETO = "--historico-completo" in sys.argv
LIMITE_HIST = [] if COMPLETO else ["-30"]  # lista vazia = todos; "-0" significava ZERO commits
# `alcance` sai DAQUI, do que realmente rodou — nunca da flag. A linha final anunciava
# "últimos 30 commits" mesmo quando nenhum commit tinha sido lido: mensagem verde que
# não corresponde ao que rodou é a classe de erro que este bloco existe para fechar.
alcance_hist = None
if TEM_GIT:
    try:
        hist = subprocess.run(
            ["git", "-C", str(topo), "log", "-p", "--no-color", *LIMITE_HIST, "--", "."],
            capture_output=True, text=True, timeout=120 if COMPLETO else 25, **UTF8,
        ).stdout
        adicionadas = [l[1:] for l in hist.splitlines() if l.startswith("+") and not l.startswith("+++")]
        achados_hist = []
        varrer("\n".join(adicionadas), "histórico do git", achados_hist)
        if achados_hist:
            achados_seg.append(f"histórico do git ({len(achados_hist)} linha[s]) — segredo removido da árvore continua comprometido")
        alcance_hist = "histórico completo" if COMPLETO else "últimos 30 commits"
    except subprocess.TimeoutExpired:
        # falha aberta com mensagem verde foi achado da auditoria: agora ela aparece
        avisos.append("Varredura do HISTÓRICO estourou o tempo — o histórico NÃO foi verificado nesta rodada.")
    except (subprocess.SubprocessError, OSError) as erro:
        avisos.append(f"Varredura do HISTÓRICO não rodou ({type(erro).__name__}) — o histórico NÃO foi verificado.")
else:
    avisos.append(
        "Sem repositório git acessível (git fora do PATH, ou pasta ainda sem `git init`) — "
        "a varredura de HISTÓRICO não rodou e a de árvore não respeitou o .gitignore."
    )

# Portão que só roda quando alguém lembra não é portão — é a regra do próprio kit, e
# até aqui ela não valia para a instalação do próprio portão. O caminho vem do git
# (`--git-path hooks`), então worktree e `core.hooksPath` não geram aviso falso.
# Testa se o hook RODA o check.py, não a marca literal: assim a checagem não sai de
# sincronia com o texto de `install_hook.py`.
if DIR_HOOKS is not None:
    gancho = DIR_HOOKS / "pre-commit"
    try:
        armado = gancho.is_file() and "check.py" in gancho.read_text(encoding="utf-8", errors="replace")
    except OSError:
        armado = False
    if not armado:
        avisos.append(
            "Portão automático NÃO instalado — este check só roda quando você lembra, e "
            "commit sem saída nenhuma parece commit aprovado. Instale: python scripts/install_hook.py"
        )
if achados_seg:
    falhas.append("Possível segredo versionado: " + "; ".join(dict.fromkeys(achados_seg))[:400])

# 9. .gitignore cobre o básico de segredo
gi = topo / ".gitignore"
if not gi.exists():
    falhas.append(".gitignore ausente — o kit assume que ele existe antes do primeiro commit.")
else:
    # QA-15: só as linhas EFETIVAS. Um .gitignore que apenas COMENTA os padrões
    # ("# nunca commite .env, *.pem…") satisfazia a checagem por substring sem ignorar
    # nada — o arquivo passava no portão explicando o que deveria fazer.
    texto_gi = "\n".join(l for l in gi.read_text(encoding="utf-8").splitlines()
                         if l.strip() and not l.lstrip().startswith("#"))
    faltando = [p for p in (".env", "*.pem", "*.key", "id_rsa", "credentials.json", "*.p12") if p not in texto_gi]
    if faltando:
        falhas.append(".gitignore sem cobertura mínima de segredo — faltam: " + ", ".join(faltando))

# 10 e 11. Integridade dos IDs rastreáveis (regra 4).
# Desde `D-50` os IDs nascem em DOIS arquivos, e a unicidade passa a valer sobre a UNIÃO —
# não por arquivo. O motivo é o próprio risco da divisão: uma linha copiada para o registro
# novo e esquecida no antigo define o mesmo ID duas vezes, e sem esta checagem os dois
# arquivos ficariam individualmente válidos enquanto o par mente.
REGISTROS = ((DECISOES, dec, texto_dec), (QA_REG, qa_reg, texto_qa))
if texto_dec or texto_qa:
    ocorrencias = {}
    for rotulo, _, texto in REGISTROS:
        for i in re.findall(r"^\|\s*((?:D|Q|QA)-\d+)\s*\|", texto, re.M):
            ocorrencias.setdefault(i, []).append(rotulo)
    definidos = set(ocorrencias)
    # QA-16: o ID que saiu da tabela para o ARQUIVO MORTO continua EXISTINDO — `D-43`
    # tira a linha da tabela e a íntegra vai para lá, com o ID preservado. Sem isto, a
    # convenção de arquivamento do próprio kit fabrica "ID inexistente" a cada corte de
    # orçamento: medido, 22 fantasmas legitimamente arquivados reprovando todo commit.
    #
    # `arquivados` NÃO entra em `definidos`, de propósito: a checagem 11 (ID duplicado)
    # tem de continuar olhando só as tabelas VIVAS — senão a convenção `ADOTADO ·
    # ARQUIVADO`, que deixa a linha na tabela com a íntegra no arquivo morto, vira
    # duplicata falsa e reprova o repositório por estar correto.
    morto = raiz / ARQUIVO_MORTO
    arquivados = set(re.findall(r"\b((?:D|Q|QA)-\d+)\b", corpo.get(morto, ""))) if morto.exists() else set()
    repetidos = sorted(i for i, onde in ocorrencias.items() if len(onde) > 1)
    if repetidos:
        detalhe = ", ".join(f"{i} (em {', '.join(sorted(set(ocorrencias[i])))})" for i in repetidos)
        falhas.append(
            f"ID duplicado: {detalhe} — cada ID é único e append-only, "
            "inclusive ENTRE os dois registros."
        )
    citados = {}
    registros_em_disco = {caminho for _, caminho, _ in REGISTROS}
    for nota in notas:
        # d_history/, e_qa/ e as lições herdadas citam IDs de OUTROS projetos:
        # ficam fora da checagem de existência. Os dois registros também: neles o ID é
        # definido, e um define o do outro (o ponteiro de `D-50`, o cabeçalho do QA).
        rel_nota = nota.relative_to(topo)
        if nota in registros_em_disco or PASTAS_HISTORICAS & set(rel_nota.parts) or nota.stem == "d_agent_learnings":
            continue
        # QA-14: aqui o filtro é `sem_bloco_de_codigo`, não `sem_codigo`. A casa cita ID
        # ENTRE CRASES (`D-13`), e a crase simples apagava 88% das citações antes de olhar.
        for i in set(re.findall(r"\b((?:D|Q|QA)-\d+)\b", sem_bloco_de_codigo(corpo[nota]))):
            citados.setdefault(i, set()).add(rel_nota.as_posix())
    fantasmas = {i: v for i, v in citados.items()
                 if i not in definidos and i not in arquivados
                 and not re.fullmatch(r"(D|Q|QA)-0*(0|NN)", i)}
    if fantasmas:
        detalhe = "; ".join(f"{i} (em {', '.join(sorted(v))})" for i, v in sorted(fantasmas.items())[:6])
        falhas.append(f"ID citado que não existe em {DECISOES}, {QA_REG} nem em {ARQUIVO_MORTO}: {detalhe}")

# 12. "Em andamento" tem de bater entre BACKLOG e CONTEXT (regra 6, fonte única).
# 13. Cobertura módulo <-> tarefa. Metade FORMAL do que a skill artifact-consistency faz
#     no olho: módulo do PLANO que não aparece em nenhuma tarefa do BACKLOG simplesmente
#     não é construído, e ninguém percebe até faltar. A ideia vem do BMAD, que marca toda
#     tarefa com o critério que ela atende — traçabilidade no artefato, não na revisão.
#     Só funciona porque os IDs existem: sem `M1` no plano e `**Módulo:** M1` na tarefa,
#     isto seria julgamento semântico, e script não julga semântica.
texto_plano = corpo.get(raiz / PLANO, "")
if texto_plano and texto_bl:
    # Tolerante ao separador e à posição dos dois-pontos de propósito: `### M1 — nome`,
    # `### M1: nome` e `**Módulo:** M1` / `**Módulo**: M1` são a mesma intenção, e um
    # regex estrito faria a checagem parar de checar em SILÊNCIO na primeira edição
    # cosmética do template. Checagem que emudece é pior que checagem que não existe,
    # porque o verde continua saindo. (Medido: as duas variações abaixo zeravam os
    # achados antes desta correção.)
    modulos = {m.group(1): m.group(2).strip()
               for m in re.finditer(r"^#{2,4}\s+(M\d+)\s*[—–:.-]\s*(.+)$", texto_plano, re.M)}
    citados = set(re.findall(r"\*\*M[óo]dulo:?\*\*:?\s*(M\d+)\b", texto_bl))
    fantasmas = citados - set(modulos)
    if fantasmas:
        falhas.append(
            f"{BACKLOG} aponta módulo inexistente em {PLANO}: " + ", ".join(sorted(fantasmas))
            + " — tarefa apontando para o vazio é escopo sem dono."
        )
    # Módulo ainda com nome de template (`<nome>`) é plano não preenchido, não lacuna.
    sem_tarefa = sorted(i for i, nome in modulos.items()
                        if not nome.lstrip().startswith("<") and i not in citados)
    if sem_tarefa:
        avisos.append(
            "Módulo do PLANO sem tarefa no BACKLOG: " + ", ".join(sem_tarefa)
            + " — ou vira tarefa, ou é declarado fora do escopo no CONTEXT. "
            "(Aviso, não falha: entre congelar o plano e povoar o backlog existe um intervalo legítimo.)"
        )

if em_andamento and texto_ctx:
    linha_ctx = re.search(r"\*\*Em andamento[^:]*:\*\*\s*(.+)", texto_ctx)
    if linha_ctx and "<" not in linha_ctx.group(1):
        if not any(t in linha_ctx.group(1) for t in em_andamento):
            falhas.append(
                f"'Em andamento' divergente: BACKLOG diz {', '.join(em_andamento)}, "
                f"CONTEXT diz \"{linha_ctx.group(1).strip()[:60]}\" — o estado tem de morar num lugar só."
            )

# --- Avisos ---
sem_fm = [
    p.relative_to(raiz).as_posix()
    for p in notas
    if (p == raiz / p.name or raiz in p.parents) and not corpo[p].startswith("---")
]
if sem_fm:
    avisos.append(f"{len(sem_fm)} nota(s) sem frontmatter: " + ", ".join(sem_fm[:5]))

# Tema de domínio que não entrou no mapa de leitura do CONTEXT. A regra é do próprio
# kit — "doc fora do mapa nunca é lido" — e nada a cobrava: o arquivo existia, custava
# manutenção e ninguém o abria. Aqui a máquina JULGA; escrever o mapa continua sendo do
# dono, porque o CONTEXT é a verdade dele e script não escreve na verdade de ninguém.
NUCLEO_CONTEXTO = {"a_context_source", "b_plan", "c_decisions", "d_qa", "README"}
if texto_ctx:
    fora = sorted(p.stem for p in (raiz / "a_context").glob("*.md")
                  if p.stem not in NUCLEO_CONTEXTO and p.stem not in texto_ctx)
    if fora:
        avisos.append(
            "Tema em a_context/ fora do Mapa de leitura do CONTEXT: " + ", ".join(fora)
            + " — doc fora do mapa nunca é lido; ou entra no mapa com a condição que "
            "justifica lê-lo, ou sai do repositório."
        )

# --- Coerência: o que o CONTEXT DECLARA × o que os arquivos SÃO ---------------------
# Os três avisos abaixo cobram o que nenhuma checagem anterior olhava: o CONTEXT pode
# estar internamente perfeito e mentir sobre o disco. Nenhum reprova — o dono pode estar
# no meio da escrita — e todos só LEEM: a verdade continua sendo dele.

# 1. Ocupação declarada × arquivo. Medido em 12/08: o CONTEXT declarava o registro em
# 8.926 e o arquivo media 9.076 — a linha de estado ficou atrás de uma escrita posterior
# e só apareceu numa conferência manual, por acaso. Quem abre a sessão decide o que
# cortar por ESSE número; número velho manda cortar cedo demais ou tarde demais.
# A chave do dicionário é o ORÇAMENTO, não o nome do arquivo: é o denominador que diz
# de qual registro a linha fala, sem depender de como ela foi escrita.
ORCAMENTOS = {4000: (CONTEXTO, texto_ctx), 12000: (DECISOES, texto_dec), 8000: (QA_REG, texto_qa)}
if texto_ctx:
    ja_avisado = set()
    # `**10.998**/12.000` e `10.998/12.000` são a mesma frase: o negrito sai antes de contar.
    for bruto_dec, bruto_teto in re.findall(r"(\d[\d.]*)\s*/\s*(\d[\d.]*)", texto_ctx.replace("*", "")):
        teto = int(bruto_teto.replace(".", ""))
        if teto not in ORCAMENTOS or teto in ja_avisado:
            continue  # "suíte 385/385" não é orçamento: o denominador é que qualifica
        nome_alvo, texto_alvo = ORCAMENTOS[teto]
        if not texto_alvo:
            continue
        # `medida()`, NUNCA `len()`: o teto deste projeto ignora o padding de alinhamento
        # das tabelas (`D-50`), e comparar com `len()` acusaria divergência em arquivo
        # correto — aviso falso ensina a ignorar aviso.
        real = medida(texto_alvo)
        declarado = int(bruto_dec.replace(".", ""))
        if declarado != real:
            ja_avisado.add(teto)
            avisos.append(
                f"{CONTEXTO} declara {nome_alvo} em {declarado}/{teto}, mas o arquivo mede "
                f"{real} ({real - declarado:+d}) — quem lê o CONTEXT decide o corte por este "
                "número; corrija a linha de estado (o disco é a verdade)."
            )

# 2. Questão do dono aberta que o CONTEXT não lista. A fila de decisões do DONO mora no
# DECISIONS, e quem abre a sessão lê o CONTEXT: questão que não aparece lá não é
# perguntada, e o projeto espera meses por uma resposta que ninguém pediu — sem nenhum
# sintoma, porque a questão CONTINUA registrada, no arquivo que a sessão não carrega.
# As `Q-NN` não se mudaram em `D-50`: este bloco lê o DECISIONS, e é o único dos três
# que lê (ver o de achado grave, que teve de mudar de arquivo).
if texto_dec and texto_ctx:
    mudas = []
    for linha in texto_dec.splitlines():
        m = re.match(r"^\|\s*(Q-\d+)\s*\|", linha)
        # Fora da fila se a linha diz RESPONDIDA ou se a questão está riscada (`~~…~~`) —
        # as duas convenções vivas no registro, e as duas significam a mesma coisa.
        if not m or re.search(r"RESPONDIDA|~~", linha, re.I):
            continue
        if m.group(1) not in texto_ctx:
            mudas.append(m.group(1))
    if mudas:
        avisos.append(
            "Questão do dono aberta e AUSENTE do CONTEXT: " + ", ".join(dict.fromkeys(mudas))
            + f" — ela mora em {DECISOES}, que a sessão não abre por conta própria; fora da "
            "linha 'Questões abertas' do CONTEXT, ninguém a pergunta ao dono."
        )

# 3. Achado grave ABERTO há mais de 14 dias. `CRÍTICO`/`ALTO` que ninguém fecha vira
# paisagem: continua no registro, para de ser lido, e o portão segue verde porque achado
# aberto é estado legítimo. O prazo é o que torna "legítimo" uma coisa datada.
# Este bloco lê o QA_REG, não o DECISIONS: desde `D-50` é lá que os `QA-NN` moram, e
# procurar a tabela no arquivo errado faria a checagem reclamar para sempre.
PRAZO_ACHADO = 14
GRAVE = ("CRÍTICO", "CRITICO", "ALTO")


def celulas_md(linha):
    """Células de uma linha de tabela. Separa por barra NÃO escapada: a célula pode
    conter `\\|` (wikilink com apelido, `[[d_qa\\|QA]]`), e um `split("|")` cru
    desalinharia as colunas justamente nas linhas mais bem documentadas."""
    return [c.strip() for c in re.split(r"(?<!\\)\|", linha.strip())[1:-1]]


if texto_qa:
    linhas_qa = texto_qa.splitlines()
    cabecalho = next((celulas_md(l) for l in linhas_qa if re.match(r"^\|\s*#\s*\|", l)), [])
    # As colunas vêm do CABEÇALHO, não de posição fixa: acrescentar uma coluna à tabela
    # é edição legítima, e uma posição cravada faria a checagem ler a coluna errada em
    # silêncio — que é o defeito, não a coluna a mais.
    i_data, i_sev, i_fech = (
        next((i for i, c in enumerate(cabecalho) if chave in c.lower()), None)
        for chave in ("data", "sev", "fechado")
    )
    if None in (i_data, i_sev, i_fech):
        avisos.append(
            f"{QA_REG}: tabela sem a coluna Data, Sev. ou 'Fechado em' — o aviso de achado "
            "grave vencido NÃO rodou. Checagem que emudece é pior que checagem ausente, "
            "porque o verde continua saindo."
        )
    else:
        vencidos = []
        for linha in linhas_qa:
            if not re.match(r"^\|\s*QA-\d+\s*\|", linha):
                continue
            cel = celulas_md(linha)
            if len(cel) <= max(i_data, i_sev, i_fech):
                continue
            fechado = cel[i_fech].strip("_* ")
            if fechado and "aberto" not in fechado.lower():
                continue  # `✔ T-15 2026-08-08` é linha fechada; `_(aberto)_` e vazio, não
            if not any(g in cel[i_sev].upper() for g in GRAVE):
                continue
            m = re.search(r"\d{4}-\d{2}-\d{2}", cel[i_data])
            if not m:
                continue
            try:
                dias = (date.today() - date.fromisoformat(m.group(0))).days
            except ValueError:
                continue
            if dias > PRAZO_ACHADO:
                vencidos.append(f"{cel[0]} ({cel[i_sev].split('·')[0].strip()}, {dias} dias)")
        if vencidos:
            avisos.append(
                f"Achado grave aberto há mais de {PRAZO_ACHADO} dias: " + ", ".join(vencidos)
                + " — feche, rebaixe a severidade com o motivo, ou vire tarefa no BACKLOG. "
                "Severidade que não expira deixa de significar urgência."
            )

# 4. Sessão sem skill declarada no changelog. Qual agente conduziu a sessão é o dado que
# torna o histórico auditável: sem ele, "o que essa sessão seguiu?" só se responde
# relendo o diff, e a retrospectiva não consegue comparar sessão com sessão. Campo NOVO —
# as entradas antigas vão falar, e a resposta certa é adotá-lo da próxima em diante,
# nunca reescrever o histórico para calar o aviso.
ENTRADAS_CONFERIDAS = 3
texto_cl = corpo.get(raiz / CHANGELOG, "")
if texto_cl:
    entradas = re.split(r"^## ", texto_cl, flags=re.M)[1:ENTRADAS_CONFERIDAS + 1]
    sem_skill = [e.splitlines()[0].strip()[:44] for e in entradas if not re.search(r"\*\*Skill", e)]
    if sem_skill:
        avisos.append(
            f"{len(sem_skill)} das {len(entradas)} entradas mais recentes de {CHANGELOG} sem "
            "`- **Skill:** <nome>`: " + " · ".join(sem_skill)
            + " — adote o campo a partir da próxima entrada; não reescreva o histórico."
        )

placeholders = re.findall(r"<[A-Za-zÀ-ú][^<>\n]{2,60}>", texto_ctx)
if placeholders:
    amostra = ", ".join(dict.fromkeys(placeholders[:3]))
    avisos.append(
        f"{CONTEXTO} ainda tem {len(placeholders)} placeholder(s) (ex.: {amostra}). "
        "Rode a Fase 0 (b_process/skills/context-bootstrap) antes de pedir código."
    )
for nome in (PLANO, DECISOES, QA_REG, BACKLOG):
    arq = raiz / nome
    if arq.exists() and re.search(r"^status:\s*rascunho\s*$", arq.read_text(encoding="utf-8"), re.M):
        avisos.append(f"{nome} ainda está em 'status: rascunho' (template não preenchido).")

if avisos:
    print("AVISOS:")
    for a in avisos:
        print(" -", a)
    print()
if ESTRITO:
    falhas.extend(avisos)

if falhas:
    print("FALHOU:")
    for f in falhas:
        print(" -", f)
    print(f"\n{len(falhas)} problema(s). Nada avança até fechar — é para isso que o portão existe.")
    sys.exit(1)

alcance = alcance_hist or "SEM histórico (não foi verificado — veja o aviso acima)"
print(
    "OK: orçamento, fonte única, WIP, skills, links, gitignore, IDs e sincronia de estado.\n"
    f"    Segredos: árvore versionada + {alcance}."
    + ("" if COMPLETO and alcance_hist else " Antes de entregar, rode com --historico-completo.")
)
