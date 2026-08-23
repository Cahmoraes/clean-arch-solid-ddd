# Fale Conosco — Acessibilidade — Artefato Visual (norte de implementação)

> Artefato curado a partir dos mockups aprovados no brainstorming (opção C + indicador "traço"). É um *norte*, não a tela pixel-final.

## Design intent

- **Indicador de obrigatoriedade:** traço curto (2px, `--color-primary`) sob o rótulo dos 3 campos obrigatórios (Nome, Email, Mensagem) — sem asterisco, sem frase "campos obrigatórios". Acompanhado de `aria-required="true"` no input e um texto `sr-only` ("(obrigatório)") dentro do `<label>`, só para leitor de tela.
- **Foco reforçado:** anel de foco (`focus-visible`) com opacidade/contraste elevados (de `ring/50` para praticamente opaco) em inputs, textarea, botão de envio e nos cards de contato — garante contraste mínimo 3:1 do indicador de foco contra o fundo.
- **Cards de contato focáveis:** os cards de "E-mail" e "Resposta em 24h" passam a ser, eles próprios, elementos focáveis/clicáveis (`tabindex="0"` + contorno de foco visível no card inteiro), em vez de só o texto do link `mailto:` interno ser o alvo. Resolve o alvo de toque pequeno (critério 2.5.8).

## Core JSX (estrutura — implementar com tokens/classes do projeto)

```tsx
// contact-form.tsx — rótulo com indicador sutil (norte)
<label htmlFor="nome">
  Nome
  <span className="sr-only">(obrigatório)</span>
  <span aria-hidden className="block h-0.5 w-3.5 rounded-full bg-primary mt-1" />
</label>
<input id="nome" aria-required="true" {...register("nome")} />
```

```tsx
// contact-section.tsx — card de contato focável (norte)
<a
  href="mailto:contato@volt.com"
  className="info-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  <Mail className="size-4 text-accent" aria-hidden />
  <div>
    <span className="label">Email</span>
    <span className="value">contato@volt.com</span>
  </div>
</a>
```

O card vira o próprio elemento focável (envolvendo todo o conteúdo do `Card`, não só o texto), preservando o link `mailto:` já existente.

## Design tokens aplicados

- Indicador: `--color-primary` (#39e58c), mesma cor da marca — não usa `--color-destructive` (vermelho), decisão deliberada para manter tom "sutil" em vez de "alerta".
- Foco: `box-shadow`/`ring` a partir de `--color-primary` com opacidade alta (perto de 100%, contra os ~50% atuais) — contraste-alvo 3:1 (critérios 2.4.7 + 1.4.11).
- Radius/superfícies/tipografia: inalterados — segue os tokens já em uso em `contact-section.tsx`/`contact-form.tsx` (radius `md` 14px nos cards, Space Grotesk/Inter).

## Fora de escopo (decisão explícita do usuário)

- Skip-link do shell (`public-shell.tsx`, critério 2.4.1) — camada shell, não é o componente de contato.
- `font-size` fixo em px no CSS global (`globals.css`, critério 1.4.4) — token global de design system, não específico da seção de contato.

## Fonte de design original

Nenhuma — layout definido via mockup do companion (opção C + variante "traço" do indicador de obrigatoriedade).

## Fidelidade

Artefato é direção, não pixel-final. Fidelidade final (valores exatos de contraste/opacidade do anel de foco) construída e validada na task de implementação.
