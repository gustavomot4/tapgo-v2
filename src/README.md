# TAP GO v2 — código

README técnico. A documentação do projeto (contexto, plano, decisões, roteiro) mora em
`../77777777_TAPGO_Project_DOCs/`; aqui fica só o que é preciso para **rodar e desenvolver**.

## Rodar

```
npm install          # dependências (só dev: TypeScript + Vitest + Vite)
npm test             # suíte, uma vez
npm run typecheck    # tsc --noEmit
npx vite             # sobe em http://localhost:5173/tapgo-v2/ (o `base` vale no dev também)
npm run build        # build em dist/ + o número do bundle lido da saída
npx vite preview     # serve o dist/ já construído — é aqui que 404 de `base` aparece
```

**O `dev` engana, o `preview` não.** O portão de M9 é sobre o que quebra *só em produção*:
caminho de asset errado passa no `npx vite` e falha no ar. Antes de empurrar para o `main`,
confira no `preview`.

## Estrutura

```
src/                  ← é o `root` do Vite (D-12); o build sai em ../dist
├── index.html        M9 — a porta: é a presença dela aqui que define o `root`
├── main.ts           M9 — sonda de E-1; sai de cena quando M7 chegar (T-10)
├── vite-env.d.ts     tipos de ambiente do Vite
├── assets/           imagens e sons — todo arquivo com linha em `licenciamento.md`
├── core/             M1 — tipos compartilhados e gerador com semente
├── tests/            1 arquivo de teste por módulo
└── scripts/          utilitários rodados à mão ou pelo `npm run build`
```
