---
created_at: "2026-08-02T19:00:42-03:00"
updated_at: "2026-08-02T19:00:42-03:00"
---

# Design — Restyle da seção "Fale Conosco" (home)

## Visão Geral

A seção "Fale Conosco" da home (apps/frontend) hoje renderiza, no desktop, duas colunas: à esquerda as informações de contato (texto de apoio + pill mailto `contato@volt.com`) e à direita o formulário de contato. Esta feature reestiliza a seção para que **o formulário ocupe a linha inteira** na versão desktop, seguindo a **opção A** aprovada no brainstorming:

- Form em 100% da largura do container da landing (`max-w-6xl`).
- Informação de contato migra para **2 cards abaixo do form** (E-mail `contato@volt.com` + Resposta em até 24h), com ícones lucide-react.
- Campos **Nome + E-mail lado a lado** no desktop (`sm:grid-cols-2`); Mensagem e botão em linha cheia.
- Mobile: 1 coluna empilhada (≥320px), cards de contato em 1 coluna.

A lógica de envio (react-hook-form + zod + TanStack Query `useSendContact`) é **inalterada**. Esta feature é derivada da feature anterior `home-planos-contato` (que fixou o layout 2-colunas em D2); este restyle supera aquela decisão de apresentação.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | Form é o canal principal de contato da landing; preenchimento rápido e legível | Nome+E-mail lado a lado em ≥768px; form não exige scroll extra na dobra |
| Acessibilidade | Conformidade WCAG em campos de formulário | Campos com `autocomplete` (name/email); erro com `role="alert"`; foco visível (já no `FormField`) |
| Manutenibilidade | Mudança de apresentação não deve afetar o contrato de envio | Zero alterações em `use-send-contact` e no schema Zod; testes de envio passam sem mudança de expectativa |

**Consideradas, não priorizadas:** performance (seção RSC estática, sem impacto); disponibilidade (API `/contact` existente, inalterada).

## Especificação Visual

**Artefato curado:** `mockups/fale-conosco-restyle-visual.md` (prosa + core HTML/JSX, relativo a este spec)

**Fonte de design original:** Nenhuma; layout definido via mockup do companion (opção A, campo "Nome + E-mail lado a lado").

**Decisões visuais (norte, não pixel-final):**
- Layout: form em linha cheia no desktop; 2 cards de contato em grid abaixo do form (2 colunas desktop, 1 mobile); `h2` + subtítulo centralizados.
- Campos: Nome + E-mail em `sm:grid-cols-2`; Mensagem e botão full-width.
- Cards de contato: seguem o padrão de card da landing (radius `xl` 22px, `border-border`, `bg-card`), com ícone + label (uppercase, `text-muted-foreground`) + valor.
- Tokens: primária `--color-primary` (#39e58c) com texto quase-preto no botão; inputs/buttons radius 14px (`rounded-md`); tipografia Space Grotesk (display) / Inter (body).
- Fidelidade: o mockup é um *norte*; a fidelidade final é construída na task de implementação.

## Estrutura de Componentes

- `src/features/contact/components/contact-section.tsx` (RSC server-safe): remove wrapper `max-w-xl mx-auto` e o grid `md:grid-cols-2` com a coluna esquerda antiga. Passa a usar a largura da landing; `h2` + subtítulo centralizados; `<ContactForm />` em linha cheia; abaixo, grid de 2 cards de contato (ícones `Mail` e `Clock` de lucide-react) **inline na section** — sem componente novo.
- `src/features/contact/components/contact-form.tsx` (client): campos Nome + E-mail em `sm:grid-cols-2`; Mensagem e botão full-width; adiciona `autocomplete="name"` / `autocomplete="email"`. Lógica de envio intacta.
- Nenhum componente compartilhado novo em `src/components/ui/`.

## Decisões Arquiteturais

### D1. Form em linha cheia em vez de duas colunas

- **Contexto:** Seção atual no desktop usa grid `md:grid-cols-2` (info à esquerda, form à direita) num wrapper estreito (`max-w-xl`).
- **Decisão:** Form ocupa 100% da largura do container da landing; informação de contato vira 2 cards abaixo do form.
- **Justificativa técnica:** Aproveita melhor a largura útil (`max-w-6xl`); Nome+E-mail lado a lado reduz a altura do form; alinha a boas práticas de seção de contato (form como CTA principal, info em cards abaixo).
- **Justificativa de negócio:** Mais espaço para a mensagem e menos atrito de preenchimento; a promessa de resposta em 24h junto ao form reduz hesitação.
- **Trade-offs aceitos:** Abandona a hierarquia "contato ao lado do form"; introduz novo conteúdo (card "Resposta em até 24h").

### D2. Cards de contato inline na section (sem componente novo)

- **Contexto:** Dois cards estáticos (e-mail + resposta em 24h), renderizáveis em RSC (lucide-react funciona server-side).
- **Decisão:** Markup inline em `contact-section.tsx`.
- **Justificativa técnica:** YAGNI — um bloco usado uma única vez não justifica extração.
- **Trade-offs aceitos:** Se os cards crescerem (telefone, redes, endereço), reavaliar a extração (gatilho de revisão registrado).

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Seção sem teste hoje; restyle pode regredir sem cobertura | 2 | 3 | 6 🔴 | Novo `contact-section.test.tsx` no plano |
| Testes existentes de `contact-form` quebram ao adicionar grid/classes | 2 | 2 | 4 🟡 | Manter `data-testid` atuais; ajustar asserts de layout sem mudar comportamento de envio |
| Grid 2 colunas vazando para telas pequenas (regressão mobile) | 2 | 2 | 4 🟡 | Mobile-first `sm:grid-cols-2`; cobertura em 320px |

## Testes

- **`contact-section.test.tsx` (novo):** renderiza heading "Fale conosco", o formulário e os 2 cards de contato (e-mail + resposta em 24h).
- **`contact-form.test.tsx`:** mantém os 5 testes; ajustar asserts de layout se necessário; comportamento de envio inalterado.
- **`use-send-contact.test.tsx`:** inalterado.
