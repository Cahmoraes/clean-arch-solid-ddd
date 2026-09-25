# Login e Home `/`: norte visual

## Intenção de design

A direção aprovada é a **A (split evoluído)**. O login mantém a grade de 2 colunas atual: à esquerda a cena imersiva com o copy; à direita o formulário, em um card sólido. A home `/` mantém o hero atual com a cena por trás, porém mais discreta: a cidade fica em opacidade reduzida e o pôr do sol aparece suave. O efeito deve ser cinematográfico sem atrapalhar a leitura, porque o formulário e o H1 são as peças principais.

- **Login (imersivo):** cena `login` (cidade à noite) com o céu cheio, sol pixelado em listras, janelas âmbar e ciano, scanlines (só no tema escuro/pôr do sol) e o rastro de pixels ao passar o mouse. Por cima dela: eyebrow de terminal, H1 com a palavra-chave em `primary` com glow, e as estatísticas em âmbar/`primary`.
- **Home (sutil):** cena `sunset` (pôr do sol sobre a cidade), com o gradiente em faixas dithered, a skyline a ~60% de opacidade e o mesmo rastro de pixels. CTA primário sólido e CTA secundário com contorno em `accent`.
- **Boot:** o eyebrow aparece "digitado", o H1 recebe um pulso de brilho e as estatísticas entram escalonadas. Tudo em `steps()`, com menos de ~600ms no total, uma vez por sessão. O H1 e o formulário ficam visíveis desde o primeiro frame, só com variação de brilho.
- **Hover pixel nos CTAs:** borda e brilho que "acendem" em degraus (`steps(3)`), só com CSS.

## Tokens aplicados

| Papel | Neon (escuro) | Pôr do sol (novo) |
|---|---|---|
| background | `#0a1424` | `#170b10` |
| card/surface | `#0d1b2e` | `#221019` |
| border | `#1c3150` | `#3d1d27` |
| primary (texto escuro sobre ele) | `#ff3ea5` | `#ffb454` |
| accent | `#3ee0ff` | `#ff5e7a` |
| foreground | `#e8eef7` | `#fbeee2` |
| muted-foreground | `#8aa0bd` | `#c49a8a` |
| sol da cena | `#ffb454` | `#ffd9a0` |

Os valores do Pôr do sol são o ponto de partida. Cada par texto/fundo precisa passar em contraste AA (4.5:1 texto, 3:1 UI), e o implementador pode ajustá-los para isso. Fontes: VT323 (`font-display`) em eyebrow, H1, botões e estatísticas; Inter no corpo. Cantos com o chanfro dos tokens `corner-shape` existentes.

## HTML central (do mockup aprovado)

```html
<!-- Login: coluna da cena -->
<aside class="relative overflow-hidden">
  <PixelScene scene="login" animated />      <!-- céu, sol, skyline, janelas -->
  <PixelTrail />                             <!-- canvas absoluto, aria-hidden -->
  <div class="hero-copy" data-boot>
    <p class="eyebrow">&gt; VOLT // ONLINE</p>
    <h1>Sua cidade inteira é <em>sua academia</em>.</h1>
    <ul class="stats"><!-- LOGIN_STATS --></ul>
  </div>
</aside>
<!-- Login: coluna do formulário (inalterada na estrutura) -->
<section class="card">
  <p class="eyebrow">Acesso autorizado</p>
  <h1>Entrar</h1>
  <!-- FormField e-mail, senha, "Esqueceu sua senha?", botão "> Entrar", Google -->
</section>

<!-- Home / -->
<section class="hero relative overflow-hidden">
  <PixelScene scene="sunset" animated />
  <PixelTrail />
  <div data-boot>
    <p class="eyebrow">&gt; REDE VOLT ONLINE</p>
    <h1>Qualquer academia. Um <em>check-in</em>.</h1>
    <p>Um plano, centenas de academias parceiras. Chegou, fez check-in, treinou.</p>
    <a data-testid="cta-signup" class="btn pixel-hover">&gt; Começar agora</a>
    <a data-testid="cta-login" class="btn-outline pixel-hover">Já tenho conta</a>
  </div>
</section>
```

## Fonte de design original

Nenhuma. O layout foi definido pelo mockup do companion (`login-home-direcoes.html`, direção A) sobre a identidade já aprovada em `replaced-visual-redesign` e `replaced-retro-shapes`.

## Fidelidade

Este documento é um norte, não a tela pixel-final. A fidelidade final é construída na implementação, a partir dos componentes reais (`PixelScene`, `FormField`, `PublicShell`).
