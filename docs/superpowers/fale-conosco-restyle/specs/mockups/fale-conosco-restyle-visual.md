# Fale Conosco — Artefato Visual (norte de implementação)

> Artefato curado a partir dos mockups aprovados no brainstorming (opção A + campos lado a lado). É um *norte*, não a tela pixel-final.

## Design intent

- **Layout:** form ocupa 100% da largura do container da landing (`max-w-6xl`) no desktop; `h2` + subtítulo centralizados.
- **Info de contato:** grid de 2 cards abaixo do form — (1) E-mail `contato@volt.com`, (2) Resposta em até 24h. 2 colunas no desktop, 1 no mobile.
- **Campos:** Nome + E-mail lado a lado no desktop (`sm:grid-cols-2`); Mensagem e botão em linha cheia. Mobile: 1 coluna empilhada.
- **Botão:** full-width, variante primary.
- **Cards de contato:** ícone (lucide `Mail`/`Clock`) + label uppercase + valor, seguindo o padrão de card da landing (radius `xl`, `border-border`, `bg-card`).

## Core JSX (estrutura do layout — implementar com tokens/classes do projeto)

```tsx
// contact-section.tsx — disposição (norte)
<section>
  <div className="flex flex-col items-center text-center">
    <h2>Fale conosco</h2>
    <p>Dúvidas sobre planos, conta ou cobrança</p>
  </div>
  <ContactForm />
  <div className="grid gap-4 sm:grid-cols-2">
    <Card>Mail · E-mail — contato@volt.com</Card>
    <Card>Clock · Resposta — Em até 24h</Card>
  </div>
</section>
```

## Design tokens aplicados (do tema VOLT em `globals.css`)

- Primária: `--color-primary` (#39e58c); texto do botão: quase-preto (`primary-foreground`).
- Radius: inputs/buttons `rounded-md` (14px); cards `rounded-xl` (22px).
- Superfícies: `bg-card`, `border-border`, `text-muted-foreground`.
- Tipografia: Space Grotesk (display, weight 600, tracking -0.02em) / Inter (body).
- Dark é o tema padrão (bg `#080808`, fg `#f6f6f4`).

## Fonte de design original

Nenhuma — layout definido via mockup do companion (opção A, campos lado a lado).

## Fidelidade

Artefato é direção, não pixel-final. Fidelidade final construída na task de implementação.
