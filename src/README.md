# TAP GO v2 — código

README técnico. A documentação do projeto (contexto, plano, decisões, roteiro) mora em
`../77777777_TAPGO_Project_DOCs/`; aqui fica só o que é preciso para **rodar e desenvolver**.

## Rodar

```
npm install          # dependências (só dev: TypeScript + Vitest)
npm test             # suíte, uma vez
npm run typecheck    # tsc --noEmit
<subir a aplicação>  # lacuna: chega com T-05 (esqueleto de M9)
```

## Estrutura

```
src/
├── core/         M1 — tipos compartilhados e gerador com semente
├── tests/        1 arquivo de teste por módulo
└── scripts/      utilitários avulsos, rodados à mão
```
