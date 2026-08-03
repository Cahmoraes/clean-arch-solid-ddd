---
created_at: "2026-08-03T14:41:09-03:00"
updated_at: "2026-08-03T14:41:09-03:00"
---

# Ajuste de largura da seção de contato

## Visão Geral

Reduzir a largura da seção de contato na landing pública para que fique igual à largura máxima da seção "Escolha seu plano" (`PlansSectionHero`). A alteração é local e puramente visual.

## Características Arquiteturais

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Usabilidade | Formulários muito largos dificultam leitura e preenchimento | Seção de contato limitada a `max-w-xl`, igual à seção de planos |
| Consistência visual | Alinhar a medida tipográfica/bloco com a seção imediatamente anterior | Largura máxima idêntica à de `PlansSectionHero` |

**Consideradas, não priorizadas:** performance, segurança, escalabilidade (nenhuma mudança comportamental ou de dados).

## Especificação Visual

**Artefato curado:** `mockups/contact-width-visual.md`

A seção de contato passa a ter a mesma largura máxima da seção de planos:

- **Section root:** `className="mx-auto w-full max-w-xl"`
- **Referência:** `PlansSectionHero` já usa `className="mx-auto w-full max-w-xl"`
- **Escopo:** todo o bloco de contato (título, formulário, cards de e-mail/horário) é limitado; nenhum outro componente é alterado.

## Estrutura de Componentes

```
apps/frontend/src/features/contact/components/contact-section.tsx
  └── <section>            [adicionar max-w-xl]
        ├── heading + text
        ├── <ContactForm />
        └── info cards (e-mail, resposta)
```

## Decisões Arquiteturais

### D1. Aplicar `max-w-xl` na raiz da seção, não apenas no formulário

- **Contexto:** alternativa era restringir só o `<ContactForm />`, deixando título e cards com largura total.
- **Decisão:** aplicar a largura máxima na `<section>` raiz do `ContactSection`.
- **Justificativa técnica:** um único ponto de mudança; mantém heading, formulário e cards alinhados na mesma medida.
- **Justificativa de negócio:** cria um bloco visual coeso na landing, espelhando a seção de planos.
- **Trade-offs aceitos:** os cards de e-mail/horário ficam mais estreitos, mas são conteúdo secundário e a coesão visual pesa mais.

## Riscos

| Risco | Impacto | Probabilidade | Score | Mitigação |
|---|---|---|---|---|
| Testes de snapshot quebrarem por mudança de classe | 1 | 2 | 2 🟢 | Rodar `pnpm test -- --run` e atualizar snapshots se necessário |
| Comportamento responsivo indesejado em telas pequenas | 1 | 1 | 1 🟢 | `w-full` preserva 100% abaixo de `max-w-xl`; validar visualmente |

## Testes

- **Unitários existentes:** `apps/frontend/src/features/contact/components/contact-section.test.tsx` deve continuar passando.
- **Validação visual:** conferir na landing que a seção de contato tem a mesma largura da seção de planos.
- **Lint/format:** `pnpm lint:fix` deve passar sem issues.

## Tarefas

1. Alterar `className` da `<section>` em `contact-section.tsx` para incluir `max-w-xl`.
2. Rodar testes, lint e build do frontend.
3. Validar visualmente a landing.
