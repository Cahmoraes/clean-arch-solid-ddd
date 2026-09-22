# Especificação Visual — Cadastro de Planos (Admin)

## Decisão

Layout em **grid de cards** aprovado pelo usuário via preview no companion visual (2026-09-22). Alternativa de tabela/lista foi oferecida e não escolhida.

## Fonte de design original

Nenhuma — layout definido a partir dos tokens reais do projeto (Tailwind v4 `@theme` em `apps/frontend/src/app/globals.css`) e dos padrões já existentes nas telas admin (`academias`, `usuarios`) e nos cards de plano da tela `/assinatura` (`plan-card-hero.tsx`, `plan-card-secondary.tsx`).

## Decisões visuais (norte, não pixel-final)

- **Layout:** grid responsivo (`repeat(auto-fill, minmax(300px, 1fr))`) de cards de plano, um "add card" tracejado ao final para criar novo plano.
- **Cabeçalho da página:** padrão `PageHeader` — eyebrow "Admin", título "Planos de assinatura", subtítulo, botão primário "Novo plano" no canto superior direito.
- **Card de plano:** `rounded-xl`/`rounded-[22px]`, nome (`font-display`), badge de status (Ativo = tom success/`*-soft`, Inativo = tom neutro/muted) no canto superior direito, preço grande em `font-display` + período pequeno, tagline em `text-muted-foreground`, lista de features com ícone check-em-círculo (mesmo padrão dos cards públicos), rodapé com ações "Editar" (outline) e "Inativar"/"Reativar" (ghost).
- **Card inativo:** opacidade reduzida (~0.55) para diferenciação visual imediata na grid, sem escondê-lo da lista.
- **Formulário (criar/editar):** não desenhado como mockup — reutiliza o padrão já existente de `Dialog` + `react-hook-form` + `zod` das outras telas admin (ex. `academias/nova`), com campos: nome, preço (numérico), periodicidade (select mensal/anual), tagline, features (lista editável), status ativo/inativo.

## Núcleo HTML de referência (grid de cards)

```html
<div class="plan-card">
  <div class="card-top">
    <h3 class="plan-name">Pro</h3>
    <span class="badge badge-active"><span class="badge-dot"></span>Ativo</span>
  </div>
  <p class="price">R$ 89,90 <small>/mês</small></p>
  <p class="tagline">Para quem treina em mais de um lugar</p>
  <ul class="features">
    <li><span class="check">✓</span>Acesso ao app</li>
    <li><span class="check">✓</span>Unidades ilimitadas</li>
    <li><span class="check">✓</span>Suporte prioritário</li>
  </ul>
  <div class="card-actions">
    <button class="btn btn-outline">Editar</button>
    <button class="btn btn-ghost">Inativar</button>
  </div>
</div>
```

## Tokens aplicados

- Cor de destaque: `#39e58c` (accent/primary do tema)
- Tipografia: Space Grotesk (nome, preço), Inter (corpo)
- Radius: `22px` (card), `8px` (botões/inputs)
- Badge de status: `*-soft` background + cor de texto correspondente ao tom (success/neutro)

## Fidelidade

Mockup é um *norte* de layout e hierarquia — a fidelidade final (componentes shadcn/ui exatos, espaçamento pixel-perfect) é construída na implementação, reaproveitando os componentes já existentes (`PageContainer`, `PageHeader`, `StatusBadge`, `Dialog`) em vez de recriar estilos ad hoc.
