# Especificação Visual — Consulta de Clima (`/clima`)

Aprovado via preview local (visual companion) em 2026-08-12. Opção escolhida: **hero + linha de estatísticas** (temperatura atual em destaque, mínima/máxima como tiles secundários), entre duas variantes comparadas.

## Intenção de design

- Container de formulário e de resultado compartilham a mesma coluna centralizada, largura máxima `420px` (`max-w-md`), reaproveitando o shell de página pública já usado em `recuperar-senha`.
- Temperatura atual é o elemento de maior peso visual da tela: fonte monoespaçada grande (`font-mono`, ~56px), acima de qualquer outro dado.
- Mínima e máxima aparecem como dois tiles secundários lado a lado, abaixo do valor principal — hierarquia clara entre "o número que importa" e os complementares.
- Sem sombra pesada; bordas sutis (`1px solid var(--color-border)`) delimitam os cards, consistente com a elevação leve (`shadow-sm`) do `Card` do design system.

## Componentes reaproveitados

- `Input` + `Button` (form-field.tsx / input.tsx / button.tsx) para o formulário de busca.
- `Card` como contêiner do resultado.
- Tiles de mínima/máxima seguem o padrão visual de `StatCard` (ícone/label + valor grande em fonte monoespaçada), mas simplificados (sem ícone) para caber lado a lado sob o valor principal.
- `EmptyState` (já existente) para o estado antes da primeira busca.

## Núcleo do HTML (representativo, não literal)

```html
<section class="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
  <header>
    <h1 class="font-display text-3xl font-medium tracking-tight">Consulta de clima</h1>
    <p class="text-sm text-muted-foreground">Digite o nome de uma cidade para ver a temperatura atual.</p>
  </header>

  <form class="flex gap-2">
    <Input placeholder="Ex: São Paulo" />
    <Button type="submit">Consultar</Button>
  </form>

  <Card class="flex flex-col gap-5 p-5">
    <p class="text-sm text-muted-foreground">São Paulo, BR</p>
    <p class="font-mono text-5xl font-semibold leading-none">24°C</p>
    <div class="grid grid-cols-2 gap-2.5">
      <div class="rounded-[10px] border border-border p-3">
        <p class="text-[11px] text-muted-foreground">Mínima</p>
        <p class="font-mono text-xl font-semibold">18°C</p>
      </div>
      <div class="rounded-[10px] border border-border p-3">
        <p class="text-[11px] text-muted-foreground">Máxima</p>
        <p class="font-mono text-xl font-semibold">27°C</p>
      </div>
    </div>
  </Card>
</section>
```

## Tokens de design aplicados

- Cor primária: `#39e58c` (verde VOLT) — usado no botão de submit e em destaques.
- Fundo: `#080808` (tema dark, padrão do app) / card `#161616`.
- Texto: `#f6f6f4` (foreground) / `#a3a39c` (muted).
- Fonte de destaque numérico: mono (`var(--font-jetbrains-mono)`), mesma convenção do `StatCard`.
- Fonte de título: display (`var(--font-space-grotesk)`).
- Raio: `8px` em inputs/botões (`rounded-md`), `12px` no card de resultado (`rounded-xl`).

## Origem do design

Nenhum artefato de design externo (Figma/wireframe) — mockup gerado no preview local do visual companion a partir dos tokens reais do tema VOLT, comparando duas variantes de layout (hero+linha vs. três cards equivalentes); a opção "hero + linha" foi selecionada pelo usuário.

## Nota de fidelidade

Este artefato é uma direção (norte) de layout e hierarquia, não a tela final em pixel-perfect. A fidelidade final é construída na implementação, reaproveitando os componentes reais listados acima.
