---
created_at: "2026-08-23T12:28:36-03:00"
updated_at: "2026-08-23T12:28:36-03:00"
---

# Design — Acessibilidade da seção "Fale Conosco" (home)

## Visão Geral

A seção "Fale Conosco" da home (`apps/frontend`) foi auditada contra WCAG 2.2 (skill `wcag-audit-patterns`). A auditoria encontrou 3 itens (5 ocorrências): indicação de campo obrigatório ausente (3.3.2, escopo do componente), skip-link ausente (2.4.1, escopo do shell) e `font-size` fixo em px no CSS global (1.4.4, escopo do design system) — além de itens pendentes de runtime (contraste, reflow em 320px, alvo de toque, contraste do foco).

**Escopo desta feature: só o componente de contato.** O usuário decidiu explicitamente deixar de fora o skip-link do shell e o token global de `font-size` — cada um pertence a uma camada diferente (shell / design system) e deve ser corrigido separadamente.

Esta feature adiciona, ao componente já existente (`contact-section.tsx` + `contact-form.tsx`, herdado de `home-planos-contato` → `fale-conosco-restyle` → `contact-width`):

- Indicador sutil de campo obrigatório (traço sob o rótulo, sem asterisco/frase) nos 3 campos obrigatórios, com `aria-required` + texto oculto para leitor de tela.
- Anel de foco reforçado (contraste 3:1) em inputs, textarea, botão e cards de contato.
- Cards de contato (e-mail, resposta em 24h) tornam-se elementos focáveis/clicáveis por inteiro, corrigindo o alvo de toque pequeno (2.5.8).

A lógica de envio (react-hook-form + zod + `useSendContact`) é **inalterada**.

## Características Arquiteturais

**Priorizadas (top 2):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Acessibilidade | Objetivo direto da feature — conformidade WCAG 2.2 no formulário de contato | 3.3.2, 2.4.7, 1.4.11 e 2.5.8 resolvidos (achados da auditoria fecham); `pnpm test:run` cobre os novos atributos/estados |
| Consistência visual | Indicador de obrigatoriedade não pode parecer erro/alerta nem quebrar a identidade VOLT | Traço usa `--color-primary` (verde da marca), não `--color-destructive`; radius/tipografia inalterados |

**Consideradas, não priorizadas:** performance (seção estática, sem impacto); disponibilidade (endpoint `/contact` inalterado).

## Especificação Visual

**Artefato curado:** `mockups/contato-acessibilidade-visual.md` (prosa + core JSX, relativo a este spec)

**Fonte de design original:** Nenhuma; layout definido via mockup do companion (opção C + variante "traço" do indicador de obrigatoriedade).

**Decisões visuais (norte, não pixel-final):**
- Indicador: traço de 2px sob o rótulo, cor `--color-primary`, nos 3 campos obrigatórios; sem asterisco/frase visível.
- Foco: anel `focus-visible` com contraste elevado (perto de opacidade total) em inputs, textarea, botão e cards de contato.
- Cards de contato: o card inteiro (não só o texto `mailto:`) vira o elemento focável/clicável, com contorno de foco visível.
- Tokens: sem mudança de radius/tipografia/cor de superfície — reaproveita os tokens já em uso na seção.
- Fidelidade: o mockup é um *norte*; a fidelidade final (opacidade exata do anel, contraste medido) é construída na task de implementação.

## Estrutura de Componentes

- `src/features/contact/components/contact-form.tsx` (client): rótulos de Nome/Email/Mensagem ganham `aria-required="true"` no input associado + `<span className="sr-only">(obrigatório)</span>` + indicador visual (traço) dentro do `<label>`. Se o mesmo padrão de rótulo já é centralizado em `FormField`/`FieldShell` (`src/components/ui/`), o indicador é adicionado lá para evitar duplicação; caso contrário, fica inline em `contact-form.tsx`.
- `src/features/contact/components/contact-section.tsx` (RSC): os 2 cards de contato (e-mail, resposta em 24h) passam a envolver todo o conteúdo num elemento focável (`<a href="mailto:...">` no card de e-mail; elemento focável equivalente no card de resposta, mesmo sem link, para manter o padrão de foco visível e consistência de teclado) com classes de `focus-visible` reforçadas.
- CSS/tokens: nenhuma mudança em `globals.css` (fora de escopo) — o reforço do anel de foco é feito via classes utilitárias no próprio componente (`focus-visible:ring-2 focus-visible:ring-primary` com opacidade elevada), não no token global `ring/50`.
- Nenhum componente novo.

## Decisões Arquiteturais

### D1. Indicador de obrigatoriedade sutil (traço) em vez de asterisco + frase

- **Contexto:** o critério 3.3.2 exige indicação de campo obrigatório, mas o usuário rejeitou o padrão comum (asterisco `*` + frase "campos obrigatórios") por ser visualmente pesado para o redesign pretendido.
- **Decisão:** traço curto de 2px na cor `--color-primary` sob o rótulo, combinado com `aria-required="true"` + texto `sr-only` "(obrigatório)".
- **Justificativa técnica:** o traço sozinho (indicação só de cor/forma) não satisfaz 3.3.2/1.4.1 para leitor de tela nem para quem não distingue a cor — por isso o par `aria-required` + texto oculto carrega a semântica; o traço é só o reforço visual para quem enxerga.
- **Justificativa de negócio:** mantém a identidade visual "clean" da seção (evita asterisco vermelho, associado a erro) sem abrir mão da conformidade.
- **Trade-offs aceitos:** o indicador visual é mais discreto que um asterisco — usuários acostumados com o padrão `*` podem não reconhecê-lo de imediato; mitigado pelo texto oculto, que garante a informação chega via AT independentemente da percepção visual.

### D2. Cards de contato viram elementos focáveis inteiros

- **Contexto:** o alvo de toque atual (2.5.8) é só o texto/link `mailto:` dentro do card, abaixo do mínimo recomendado de 24×24px.
- **Decisão:** o card inteiro (e-mail e resposta-em-24h) vira o elemento focável/clicável, com foco visível no contorno do card.
- **Justificativa técnica:** aumenta a área de alvo sem alterar o layout/grid existente; reaproveita a estrutura de card já estilizada.
- **Trade-offs aceitos:** o card "Resposta em 24h" não tem link real (é informativo) — vira focável só para manter consistência de foco visual entre os dois cards; se isso for julgado confuso em QA, a alternativa é tornar só o card de e-mail focável (revisitar se o teste de usabilidade apontar problema).

### D3. Escopo restrito ao componente — skip-link e token global ficam de fora

- **Contexto:** a auditoria encontrou achados em 3 camadas (módulo, shell, design system); o usuário decidiu fechar o escopo desta feature no módulo.
- **Decisão:** 2.4.1 (skip-link, `public-shell.tsx`) e 1.4.4 (`font-size` fixo, `globals.css`) não são tratados aqui.
- **Justificativa técnica:** cada achado pertence a uma camada com dono/ciclo de revisão diferente do componente de contato.
- **Justificativa de negócio:** reduz o blast radius da mudança a um único componente já conhecido, evitando reabrir decisões de shell/design-system fora do pedido original.
- **Trade-offs aceitos:** a página segue sem skip-link e com o token de fonte fixo em px até que uma feature separada trate desses achados — registrado como risco abaixo, não como pendência silenciosa.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Achados fora de escopo (skip-link, font-size global) ficam sem dono definido | 2 | 2 | 4 🟡 | Registrar como follow-up explícito após esta feature (não é tarefa desta feature) |
| Anel de foco reforçado quebra o visual em outros estados (hover, disabled) não cobertos pelo mockup | 1 | 2 | 2 🟢 | Validar manualmente os estados hover/disabled na task de implementação |
| Card "Resposta em 24h" focável sem ação real pode confundir navegação por teclado | 2 | 2 | 4 🟡 | QA manual de navegação por Tab; revisitar D2 se o comportamento parecer confuso |

## Testes

- **`contact-form.test.tsx`:** novos casos — os 3 campos têm `aria-required="true"`; o texto oculto "(obrigatório)" está presente no DOM (mesmo sem estar visível); testes de envio existentes continuam passando sem mudança de comportamento.
- **`contact-section.test.tsx`:** os cards de e-mail e resposta em 24h são alcançáveis via Tab (`tabIndex`/elemento focável) e possuem indicador de foco (classe `focus-visible` presente).
- **Verificação manual/QA (fora do runner automatizado):** contraste do traço e do anel de foco (≥3:1) contra o fundo claro e escuro; reflow em 320px sem scroll horizontal.
