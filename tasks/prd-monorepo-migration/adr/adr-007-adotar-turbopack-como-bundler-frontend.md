ADR007 — Adotar Turbopack como Bundler Padrão do Frontend Next.js

- Status: Aceito
- Data: 02/05/2026
- Autor: Time de Arquitetura

---

## Decisão

Adotaremos o **Turbopack** como bundler de desenvolvimento do frontend Next.js, conforme habilitado
por padrão ao usar `next dev --turbopack` no Next.js 15. Para builds de produção (`next build`)
o comportamento padrão do Next.js será mantido (Webpack, até estabilização completa do Turbopack
para produção).

> ⚠️ **Nota de terminologia:** Turbopack (bundler JavaScript do Next.js) é distinto do Turborepo
> (orquestrador de monorepo — ver ADR-001). Ambos são produtos da Vercel, mas com propósitos
> completamente diferentes.

## Contexto

O Next.js 15 introduziu o Turbopack como opção de bundler para desenvolvimento, e a partir do
Next.js 15.0 ele é utilizado por padrão quando `create-next-app` configura o projeto. Turbopack
é escrito em Rust e é o sucessor planejado do Webpack no ecossistema Next.js, com performance de
HMR (Hot Module Replacement) significativamente superior.

No contexto deste projeto, a adoção do Turbopack é uma consequência direta da escolha do
Next.js 15 (ADR-006). Registramos esta decisão separadamente pois ela tem implicações de
compatibilidade com plugins de Webpack existentes.

Situação na data desta ADR (maio/2026): Turbopack está em `stable` para desenvolvimento e
disponível para builds de produção como opt-in.

## Opções Consideradas

- **Opção 1 — Webpack** (bundler legado do Next.js)
  - Prós: estável e maduro; compatível com todos os plugins de Webpack existentes; comportamento conhecido
  - Contras: significativamente mais lento que Turbopack em HMR; `next dev --webpack` é a flag para forçar o uso; tendência de deprecação no longo prazo

- **Opção 2 — Turbopack** *(SELECIONADA)*
  - Prós: HMR até 10x mais rápido em projetos grandes (segundo benchmarks Vercel); default no `create-next-app` no Next.js 15; alinhado com o roadmap do Next.js; escrito em Rust (mesma filosofia que Biome e Turborepo adotados no projeto)
  - Contras: ainda não suporta 100% dos plugins de Webpack customizados; em mai/2026 ainda pode haver edge cases não cobertos; plugins de Webpack específicos devem ser verificados para compatibilidade

## Consequências

- ✅ Positivo: ciclo de desenvolvimento mais rápido — HMR mais ágil em projetos que crescem
- ✅ Positivo: zero configuração adicional — é o padrão do `create-next-app` no Next.js 15
- ✅ Positivo: alinhado com o roadmap do Next.js — sem risco de deprecação no médio prazo
- ✅ Positivo: consistência filosófica com outras ferramentas Rust adotadas (Biome, Turborepo)
- ❌ Negativo: se forem necessários plugins de Webpack customizados no futuro, compatibilidade deve ser verificada antes de adicionar
- ❌ Negativo: erros de configuração do Turbopack podem ser mais difíceis de diagnosticar por documentação ainda em maturação

## Recomendações

- Tech Spec de migração para monorepo (02/05/2026) — Turbopack é consequência implícita da adoção do Next.js 15; documentado nesta ADR para rastreabilidade; equipe deve verificar compatibilidade de qualquer plugin Webpack antes de adicioná-lo ao frontend
