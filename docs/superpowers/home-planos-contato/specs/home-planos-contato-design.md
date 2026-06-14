---
created_at: "2026-06-14T11:10:27-03:00"
updated_at: "2026-06-14T11:10:27-03:00"
---

# Design Spec — Home: Seção de Planos + Contato

## Visão Geral

Enriquecer a **página pública inicial** (`/`) com duas novas seções abaixo do hero existente:

1. **Seção de Planos** — exibe os planos disponíveis (dados vindos do backend/Stripe) com layout hero: plano anual em destaque com badge "Melhor valor" + plano mensal compacto abaixo.
2. **Seção de Contato** — formulário com campos nome, e-mail e mensagem que dispara envio de e-mail para `contato@volt.com` via nodemailer no backend.

A tela interna `/assinatura` permanece **inalterada**.

---

## Características Arquiteturais

**Priorizadas (top 4):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Performance | Landing page é o primeiro ponto de contato; loading state aumenta abandono | HTML dos planos entregue no primeiro byte (RSC + ISR); sem spinner visível ao usuário |
| Responsividade | Produto deve funcionar em smartphones | Layout sem scroll horizontal em viewport ≥ 320px; cards de planos empilhados verticalmente em mobile; formulário de contato em coluna única abaixo de `md` |
| Maintainability | Planos aparecem em dois contextos com necessidades visuais distintas | Componentes da home (`PlansSectionHero`) são independentes da tela interna — zero acoplamento |
| Reliability | Formulário não pode silenciar falhas de envio | Nodemailer com retry 3× (1s entre tentativas); toast de sucesso **e** mensagem de erro inline no formulário |

**Consideradas, não priorizadas:** Security/LGPD (mitigado com validação server-side e ausência de persistência de dados pessoais), Extensibilidade para Stripe Products API (decisão D2 documenta o caminho).

---

## Decisões Arquiteturais

### D1. RSC + ISR para busca de planos na home pública

- **Contexto:** A home precisa exibir planos sem loading state. Alternativas: RSC com ISR, Client Component com TanStack Query, planos estáticos no frontend.
- **Decisão:** React Server Component com `fetch('/plans', { next: { revalidate: 3600 } })`.
- **Justificativa técnica:** ISR entrega HTML completo no primeiro byte; o cache é mantido pelo Next.js sem custo de re-fetch a cada visita; revalidação manual disponível via `revalidatePath('/')` quando necessário.
- **Justificativa de negócio:** Planos mudam raramente — 1h de cache é aceitável. Elimina spinner em página de conversão.
- **Trade-offs aceitos:** Planos podem estar desatualizados por até 1h sem revalidação manual; dois estilos de componente na mesma página (RSC para planos + CC para formulário).

### D2. `GET /plans` retorna DEMO_PLANS do backend (preparado para Stripe Products)

- **Contexto:** Planos hoje são hardcoded no frontend como `DEMO_PLANS`. O usuário quer que venham do backend/Stripe.
- **Decisão:** Mover `DEMO_PLANS` para o backend e expô-los via `GET /plans`. Endpoint projetado para substituição futura por Stripe Products API sem mudança de contrato.
- **Justificativa técnica:** Frontend deixa de ser fonte de verdade sobre preços; contrato de resposta estável (`id`, `name`, `priceId`, `priceLabel`, `tagline`, `features[]`).
- **Justificativa de negócio:** Um único ponto de atualização de preços — sem deploy de frontend para mudar valores.
- **Trade-offs aceitos:** Nova dependência de rede no servidor (RSC → backend) vs. zero latência com dados estáticos; failover (se `/plans` cair, a home não renderiza planos) — mitigado com `try/catch` e fallback de planos hardcoded no RSC.

### D3. Componentes de planos da home independentes da tela interna

- **Contexto:** `PlanCard` existe embutido em `assinatura/page.tsx`. Poderíamos extraí-lo para compartilhamento.
- **Decisão:** Criar `PlansSectionHero` e seus sub-componentes como implementação nova, independente. `assinatura/page.tsx` permanece inalterado.
- **Justificativa técnica:** Os dois contextos têm layouts e comportamentos distintos: a home exibe planos para conversão (hero, sem radio button, CTA externo); a tela interna exibe para seleção (radio, estado de loading, integração com Stripe checkout).
- **Justificativa de negócio:** Zero risco de regressão na tela de assinatura, que é caminho crítico de pagamento.
- **Trade-offs aceitos:** Dois componentes visuais para "card de plano" no codebase — inconsistência visual futura possível se preços/features divergirem.

---

## Arquitetura e Fluxo de Dados

### Fluxo principal

```
Visitante acessa /
  ↓
Next.js RSC (PublicHome)
  → fetch("GET /plans") com revalidate: 3600
  → [cache HIT] → renderiza PlansSectionHero com dados em cache
  → [cache MISS] → backend retorna DEMO_PLANS → cacheia → renderiza

Visitante preenche ContactForm (Client Component)
  ↓
Zod valida client-side (nome obrigatório, email válido, mensagem obrigatória)
  ↓
useSendContact dispara POST /contact
  ↓
Backend: valida payload → SendContactEmailUseCase → MailerGateway (nodemailer)
  → [sucesso] → 200 OK → toast de sucesso + reset do formulário
  → [falha] → 4xx/5xx → mensagem de erro inline no formulário
```

### Fallback de planos

Se `GET /plans` falhar no RSC, renderiza seção de planos com `DEMO_PLANS` hardcoded no próprio RSC (mesmos dados do backend). A home nunca fica em branco por falha de endpoint.

---

## Componentes

### Frontend

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `PublicHome` | RSC (existe, modificado) | Busca planos via fetch ISR e compõe a página com as novas seções |
| `PlansSectionHero` | RSC (novo) | Renderiza seção de planos: heading + `PlanCardHero` + `PlanCardSecondary` |
| `PlanCardHero` | RSC (novo) | Exibe plano destaque com badge, preço, features e CTA primário |
| `PlanCardSecondary` | RSC (novo) | Exibe plano secundário em linha compacta com CTA outline |
| `ContactSection` | RSC (novo) | Wrapper com heading, subtítulo e layout 2 colunas (info + form) |
| `ContactForm` | Client Component (novo) | react-hook-form + Zod; chama `useSendContact`; gerencia estados loading/success/error |
| `useSendContact` | Hook (novo) | `useMutation` → `POST /contact`; retorna `{ mutate, isPending, isSuccess, isError }` |

### Backend

| Componente | Responsabilidade |
|---|---|
| `GetPlansController` | Responde `GET /plans`; retorna array de planos no shape `DemoPlan[]` |
| `SendContactEmailController` | Responde `POST /contact`; valida payload; delega ao use case |
| `SendContactEmailUseCase` | Constrói e envia e-mail para `contato@volt.com` via `MailerGateway` |

---

## Endpoints

### `GET /plans`

**Response 200:**
```json
[
  {
    "id": "premium-mensal",
    "name": "Premium Mensal",
    "priceId": "price_xxx",
    "priceLabel": "R$ 49,90/mês",
    "tagline": "Sem fidelidade",
    "features": ["Check-in ilimitado", "Mais de 200 academias", "App mobile incluso"]
  },
  {
    "id": "premium-anual",
    "name": "Premium Anual",
    "priceId": "price_yyy",
    "priceLabel": "R$ 479,00/ano",
    "tagline": "Economia de R$ 118,80",
    "features": ["Check-in ilimitado", "Mais de 200 academias", "App mobile incluso"]
  }
]
```

### `POST /contact`

**Request body:**
```json
{ "nome": "string (obrigatório)", "email": "string email válido", "mensagem": "string (obrigatório)" }
```

**Responses:** `200 OK` (email enviado) | `400 Bad Request` (payload inválido) | `500 Internal Server Error` (falha no mailer após retries)

---

## Estrutura de Diretórios

```
apps/frontend/src/
  app/(public)/
    page.tsx                              ← modificado: busca planos via RSC + ISR
  features/
    subscriptions/
      components/
        plans-section-hero.tsx            ← novo: seção completa (hero + secundário)
        plan-card-hero.tsx                ← novo: card destaque (badge, preço, features, CTA)
        plan-card-secondary.tsx           ← novo: card compacto em linha
    contact/
      schemas/
        index.ts                          ← Zod: ContactFormSchema { nome, email, mensagem }
      api/
        use-send-contact.ts               ← useMutation → POST /contact
      components/
        contact-section.tsx               ← wrapper RSC com layout 2 colunas
        contact-form.tsx                  ← Client Component (react-hook-form)

apps/backend/src/
  subscriptions/
    infra/http/
      get-plans.controller.ts             ← GET /plans
  contact/
    application/use-cases/
      send-contact-email/
        send-contact-email.use-case.ts    ← usa MailerGateway
    infra/http/
      send-contact-email.controller.ts    ← POST /contact
    infra/ioc/
      contact.module.ts                   ← registro Inversify
```

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Regressão em `/assinatura` por mudança acidental em componentes de planos | 3 | 1 | 3 🟡 | Componentes da home são novos e independentes; testes unitários de `PlanCardHero` não tocam `assinatura/page.tsx` |
| ISR entrega planos desatualizados | 1 | 2 | 2 🟢 | `revalidate: 3600` aceitável; `revalidatePath('/')` disponível |
| Formulário de contato explorado como spam relay | 2 | 2 | 4 🟡 | Rate limiting via Fastify; validação server-side rigorosa; sem armazenamento de dados |
| LGPD — dados pessoais (nome, email) trafegam no formulário | 2 | 1 | 2 🟢 | Dados não persistidos; apenas transmitidos por e-mail; sem log com PII |
| Nodemailer sem SMTP em dev não entrega e-mail | 1 | 3 | 3 🟡 | Comportamento esperado (`createTestAccount()`); documentar no README do backend |
| `GET /plans` indisponível na build/renderização RSC | 2 | 1 | 2 🟢 | Fallback com `DEMO_PLANS` hardcoded no RSC via `try/catch` |

---

## Testes

| O que testar | Tipo | Ferramenta |
|---|---|---|
| `PlanCardHero` renderiza nome, preço, features e CTA | Unit | Vitest + Testing Library |
| `PlanCardSecondary` renderiza compacto com CTA outline | Unit | Vitest + Testing Library |
| `ContactFormSchema` valida campos obrigatórios e formato de email | Unit | Vitest (schema Zod isolado) |
| `ContactForm` exibe loading durante envio | Unit | Mock de `useSendContact` |
| `ContactForm` exibe toast de sucesso e reseta campos | Unit | Mock de `useSendContact` |
| `ContactForm` exibe erro inline quando `isError = true` | Unit | Mock de `useSendContact` |
| `GET /plans` retorna array com shape `DemoPlan[]` | Integration | business-flow-test |
| `POST /contact` com payload válido chama `MailerGateway` | Integration | business-flow-test com mock do mailer |
| `POST /contact` com payload inválido retorna 400 | Integration | business-flow-test |
