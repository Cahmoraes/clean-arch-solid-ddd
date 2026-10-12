# Botão Google customizado — artefato visual curado

Direção visual do botão "Continuar com Google" que substitui o `GoogleLogin` oficial nas 3 telas.

**Fonte de design original:** nenhuma ferramenta de design; comparativo aprovado no preview local (visual companion) contra o botão oficial atual, nos temas dark e light.
_Fidelidade:_ norte, não pixel-final. A implementação final usa os tokens do tema real e o `Button` do design system.

## Decisões visuais

- **Rótulo único e neutro:** "Continuar com Google" em login, cadastro e confirmação de senha — sem prop de texto por tela.
- **Logo G oficial:** SVG multicolorido (gradiente padrão do Google) em 18px, alinhado à esquerda, com gap de 10px do rótulo. Sobre o botão, sempre em fundo branco (diretriz de marca).
- **Forma:** `rectangular` com chanfro do design system (`rounded-md` → `corner-shape: bevel` de `globals.css`). Proibido `rounded-full`/`pill` (guarda `src/test/rounded-residue.test.ts`).
- **Dimensões:** altura 40px (igual ao `Button size="md"`), largura total do container com máximo de 400px.
- **Tipografia:** `font-display` (VT323) em caixa alta com `tracking-[0.06em]`, tamanho ≈19px — mesma classe tipográfica dos demais botões do app, via `Button` (nunca fonte do Google).
- **Cores por tema (tokens do `Button variant="outline"`):**
  - dark/sunset: `bg-card` (`#0d1b2e`), texto `card-foreground` (`#dbe9f7`), borda `border` do tema.
  - light: `bg-card` (`#ffffff`), texto `#0a1424`, borda `#d5dfea`.
- **Estados:** `disabled`/`isPending` reaproveitam o comportamento nativo do `Button` (`opacity-50`, `cursor-not-allowed`), em vez do `pointer-events-none` do container atual.

## Tokens aplicados

```css
--font-display: "VT323", ui-monospace, monospace;
--color-card: #ffffff;              /* light */
--color-card: #0d1b2e;              /* dark */
--color-card-foreground: #0a1424;   /* light */
--color-card-foreground: #dbe9f7;   /* dark */
--color-border: #d5dfea;            /* light */
--radius-md: 6px;                   /* chanfro, 0px sem suporte a corner-shape */
```

## Markup de referência

```tsx
<Button
  type="button"
  variant="outline"
  className="w-full max-w-[400px] gap-2.5"
  onClick={() => login()}
  disabled={disabled || isPending}
  data-testid="google-sign-in-button"
>
  <GoogleGIcon className="h-5 w-5" aria-hidden="true" />
  Continuar com Google
</Button>
```

O logo G entra como componente próprio em `components/ui/` (ou `features/auth/components/`), embutido do bundle oficial do Google — nunca redesenhado, monocromizado ou esticado.