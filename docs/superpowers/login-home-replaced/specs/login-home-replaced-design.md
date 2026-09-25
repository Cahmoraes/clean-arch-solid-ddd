# Login e Home Replaced: Design

- **Norte visual:** `mockups/login-home-replaced-visual.md`

## Visão Geral

O login (`/login`) e a home pública (`/`) são a cara externa do VOLT. Hoje eles usam a identidade "Noite neon" de forma estática, e a home ainda carrega textos da identidade antiga ("Demo monocromática", "Inspirado em Ollama"). Esta feature dá às duas telas uma sensação cinematográfica inspirada no jogo Replaced, com cinco entregas:

- boot de terminal na entrada;
- rastro de pixels que segue o mouse;
- hover pixelado nos CTAs;
- cenas próprias por tela;
- textos reescritos.

Além disso, o app ganha um terceiro tema global, **Pôr do sol**, com o contraste quente do jogo.

O público é quem chega ao produto (visitante na home, aluno no login). A feature dá certo se a identidade Replaced fica evidente no primeiro segundo, sem piorar o LCP, sem trabalho de CPU em repouso e com acessibilidade AA mantida.

**Entendimento confirmado com o usuário:**
- login imersivo e home sutil;
- direção A (split evoluído, grade de 2 colunas mantida);
- tema quente global no `ThemeToggle` e selecionável no header público;
- cena noturna no login e pôr do sol na home, ambas seguindo o tema escolhido;
- boot uma vez por sessão;
- sem nova dependência.

## Escopo

**Dentro**
- Tema `sunset` (Pôr do sol) em `globals.css`, no `ThemeProvider` e no `ThemeToggle`, que passa de binário para 3 estados.
- `ThemeToggle` e `MotionToggle` ("Pausar animações") no header do `PublicShell`.
- `MotionToggle` novo, com pausa persistida. Ele é consumido por `useSceneMotion` e já é esperado por `e2e/scene-performance.spec.ts`, mas nunca foi implementado.
- `PixelScene`: nova cena `sunset` e camada de sol/céu em faixas via tokens.
- `PixelTrail`: canvas com o rastro de pixels ao passar o mouse, no hero do login e da home.
- Boot de terminal (CSS em `steps()`) nos heros, uma vez por sessão.
- Utilitário `pixel-hover` para os CTAs.
- Textos novos: hero do login, eyebrow do formulário, hero e cards de features da home.

**Fora de escopo**
- Layout das demais telas públicas (cadastro, ativar, recuperar e redefinir senha, clima). Features anteriores já as deixaram fora, e elas herdam o tema pelos tokens.
- Seções Planos e Contato da home: recebem só os tokens, sem mudança de estrutura (`home-planos-contato`).
- Animações CRT de flicker, rolagem ou curvatura, rejeitadas em `replaced-retro-shapes`.
- Globo WebGL do clima no tema quente: continua com as cores atuais (arquivo allowlisted).
- Nova fonte ou nova lib de animação.

## Características Arquiteturais

| Característica | Preocupação de domínio | Critério mensurável | Escopo |
|---|---|---|---|
| Performance percebida | Login é tarefa; o efeito não pode atrasar a entrada | H1 e formulário visíveis no primeiro frame (sem `opacity:0` nem clip total). Em repouso, 0 eventos `Layout` e no máximo 5 `Paint` em 3s (`scene-performance.spec.ts`). `PixelTrail` sem rAF ativo quando o rastro some | login, home |
| Acessibilidade | Movimento contínuo e contraste do novo tema | Pares de texto do tema `sunset` com AA (4.5:1 texto, 3:1 UI). `prefers-reduced-motion` ou pausa ativa desligam boot, rastro e cenas. Controle de pausa visível (WCAG 2.2.2) | global, login, home |
| Leveza do bundle | Pedido explícito: não degradar o sistema | Nenhuma dependência nova; `PixelTrail` em Canvas2D puro, carregado só nas duas telas | login, home |

**Consideradas, não priorizadas:** extensibilidade para mais temas (sem pedido; a solução acomoda um 4º tema, mas não o generaliza).

## Arquitetura e Fluxo

O `ThemeProvider` do `next-themes` (0.4.6, `attribute="class"`) passa a declarar `themes={["light","dark","sunset"]}`. O `next-themes` aplica **uma** classe por tema, porque `classList.add` recebe um único valor. Por isso o `sunset` não pode ser "`dark` + outra classe". A solução é ter uma classe `.sunset` própria em `globals.css` e ampliar os seletores que hoje dependem de `.dark` para aceitar as duas:

- `@custom-variant dark (&:is(.dark *, .sunset *))`;
- as scanlines (`.dark .crt-scanlines::before` passa a incluir `.sunset`);
- o `THEMES` de `chart.tsx`, que ganha a chave `sunset: ".sunset"`, com cor por série em cada `ChartConfig`.

As cenas já leem só tokens CSS, então mudam de tema sozinhas. O movimento tem uma única fonte: `useSceneMotion` retorna `paused = reducedMotion || !visible || userPaused`. O `userPaused` vem de um store externo em `localStorage` (`volt:scene-motion-paused`), escrito pelo `MotionToggle`. Cenas e rastro (React) leem o `paused` direto. Os efeitos puramente CSS (boot, `pixel-hover`) precisam de um espelho no DOM: o store mantém `data-motion-paused` no `<html>`, e o script de boot (D3) já o aplica antes do paint. O CSS desliga esses efeitos quando esse atributo existe ou quando `prefers-reduced-motion: reduce` está ativo.

## Componentes

| Componente | Possui | Oculta | Interface |
|---|---|---|---|
| Tema `sunset` (`globals.css`) | Tokens quentes, incluindo sidebar e tokens de cena | Os seletores que antes eram só `.dark` | Classe `.sunset` no `<html>` |
| `ThemeToggle` | Escolha entre os 3 temas | O mapeamento tema → ícone e rótulo | `role="radiogroup"` com 3 botões-ícone pixel (`aria-checked`); `compact` alterna em ciclo com `aria-label` do próximo tema |
| `motion-preference` (store) + `MotionToggle` | A pausa escolhida pelo usuário | Persistência em `localStorage` e sincronização entre abas (`storage`) | `useMotionPreference()`; botão "Pausar/Retomar animações" com `aria-pressed` |
| `useSceneMotion` | A decisão final de pausar | As três fontes (media query, IntersectionObserver, preferência) | `{ paused }` (sem mudança de assinatura) |
| `PixelScene` | Cenas `login`, `hero`, `empty` e a nova `sunset` | Geometria SVG, dither e sol em faixas | Prop `scene` ganha `"sunset"` |
| `PixelTrail` | O rastro de pixels | Grade, decaimento, ciclo de rAF, leitura das cores do tema via `getComputedStyle` (sem literais) | `<PixelTrail />` absoluto dentro de um pai `relative`; `aria-hidden` |
| Boot (`data-boot` + script de sessão) | Se a entrada já tocou nesta sessão | Flag `sessionStorage` `volt:boot-played` e os atributos `data-boot-played`/`data-motion-paused` no `<html>`, aplicados antes do paint | Atributo `data-boot` nos blocos do hero |
| `pixel-hover` (utilitário CSS) | O hover pixelado dos CTAs | Keyframes em `steps(3)` | Classe `pixel-hover` |

## Especificação Visual

**Artefato curado:** `mockups/login-home-replaced-visual.md`

**Fonte de design original:** nenhuma; o layout foi definido pelo mockup do companion (direção A).

**Decisões visuais (norte, não pixel-final):**
- Login: grade de 2 colunas e hero compacto no mobile (≤860px) mantidos. A cena `login` fica atrás do copy e o formulário em card sólido. O `PixelTrail` fica só na coluna da cena.
- Home: hero à esquerda sobre a cena `sunset` com a skyline a ~60% de opacidade. CTA primário sólido e secundário com contorno `accent`, ambos com `pixel-hover`.
- Boot: eyebrow digitado, pulso de brilho no H1 e estatísticas escalonadas, em até ~600ms no total.
- Tokens do Pôr do sol: tabela do artefato, ajustável para cumprir AA.

**Fidelidade:** o mockup é um norte; a fidelidade final vem dos componentes reais.

### Textos

| Local | Atual | Novo |
|---|---|---|
| Login, eyebrow do hero | (nenhum) | `> VOLT // ONLINE` |
| Login, H1 do hero (desktop e mobile) | Treine onde **você** estiver. | Sua cidade inteira é **sua academia**. |
| Login, eyebrow do formulário | Acesse sua conta | Acesso autorizado |
| Login, botão | Entrar | `> Entrar` |
| Home, badge | Demo monocromática | `> REDE VOLT ONLINE` |
| Home, H1 | Acesso a academias, sem fricção. | Qualquer academia. Um **check-in**. |
| Home, descrição | (texto com "Inspirado em Ollama") | Um plano, centenas de academias parceiras. Chegou, fez check-in, treinou. |
| Home, CTAs | Criar conta / Entrar | `> Começar agora` (`/cadastro`) / Já tenho conta (`/login`) |
| Home, features | 3 cards atuais | **Encontre**: academias parceiras perto de você, no mapa. **Faça check-in**: validação na hora, sem catraca de papel. **Mantenha a sequência**: acompanhe dias, semanas e metas. |

Os `data-testid` (`cta-signup`, `cta-login`, `login-submit`, `login-hero-mobile`) e os rótulos dos campos permanecem.

## Fronteiras e Contratos

**Significados:**
- `theme`: string gravada pelo `next-themes` (`"light" | "dark" | "sunset" | "system"`). Um valor desconhecido cai no `defaultTheme="dark"`.
- `volt:scene-motion-paused` (`localStorage`): `"true"` significa pausado; ausente ou qualquer outro valor significa animar. É uma preferência por navegador, sem backend.
- `volt:boot-played` (`sessionStorage`): presença significa que o boot já tocou nesta aba. Some ao fechar a aba.
- A pausa é um **toggle**: cada clique inverte o estado, e o botão reflete o estado atual em `aria-pressed`.

## Falhas e Erros

| Falha | Detecção | Comportamento | O que o usuário vê |
|---|---|---|---|
| `localStorage`/`sessionStorage` bloqueado (modo privado, política) | `try/catch` no acesso | Pausa vale só em memória; o boot toca a cada carregamento | Tudo funciona, sem persistência |
| Canvas 2D indisponível | `getContext("2d")` nulo | `PixelTrail` não renderiza nada | Cena sem rastro |
| Erro de render na cena | `PixelSceneBoundary` existente | `SceneFallback` | Superfície lisa |
| Dispositivo de toque | `(pointer: coarse)` | `PixelTrail` não registra listeners | Sem rastro, sem custo |

## Decisões Arquiteturais

### D1. Vamos criar o tema como classe própria `.sunset` e ampliar os seletores `dark` para `.dark, .sunset`

- **Contexto:** o `next-themes` 0.4.6 aplica uma classe por tema. Alternativas: `attribute="data-theme"` com `dark` + variante (rejeitada: reescreve todos os seletores `.dark` e o `THEMES` do Recharts); tema quente só nas cenas (rejeitada pelo usuário, que quer tema global).
- **Decisão:** vamos criar a classe `.sunset` com o conjunto completo de tokens, e fazer a variante `dark`, as scanlines e o `THEMES` do chart aceitarem a nova classe.
- **Justificativa:** técnica, é a menor mudança que preserva o `attribute="class"`. De negócio, o usuário escolhe o clima do app inteiro.
- **Consequências:** ganha tema global sem refatorar o sistema de temas. Em troca, todo `ChartConfig` precisa de uma cor para `sunset`, e todo seletor `.dark` novo precisa lembrar do `.sunset`.
- **Conformidade:** teste que parseia `globals.css` e exige que `.sunset` declare os mesmos tokens `--color-*` que `.dark`. O `tsc` falha se algum `ChartConfig` ficar sem `sunset`.

### D2. Vamos implementar o rastro em Canvas2D próprio, sem biblioteca

- **Contexto:** alternativas eram react-bits `PixelTransition` (grade de divs, mais nós no DOM), `hover-effects-canvas` (dependência nova para um efeito pequeno) e WebGL/pixi (custo de GPU e bundle desproporcional).
- **Decisão:** vamos implementar o `PixelTrail` com células de 10px, decaimento de alfa e no máximo ~150 células vivas. O rAF só roda enquanto há células; DPR limitado a 2; cores lidas dos tokens a cada troca de tema.
- **Justificativa:** técnica, custo zero em repouso e nenhuma dependência. De negócio, atende ao "não pode degradar o sistema".
- **Consequências:** ganha controle total e zero bytes de dependência. Em troca, o time mantém um componente de canvas, que precisa de teste de ciclo de vida do rAF.
- **Conformidade:** teste unitário garante que, sem `pointermove`, nenhum rAF fica agendado, e que com `paused` não há desenho. O `scene-performance.spec.ts` continua passando.

### D3. Vamos marcar o boot antes do paint com um script inline no layout público

- **Contexto:** ler `sessionStorage` depois da hidratação faria o boot tocar sempre no primeiro frame. Tocar o boot em toda visita (alternativa mais simples) foi rejeitado porque o usuário escolheu "uma vez por sessão".
- **Decisão:** vamos usar um script inline mínimo no layout `(public)` (que envolve login e home no `PublicShell`). Ele adiciona `data-boot-played` ao `<html>` quando a flag de sessão existe, e `data-motion-paused` quando a pausa está salva. O CSS só anima `[data-boot]` quando os dois atributos estão ausentes e não há `prefers-reduced-motion: reduce`. Ao fim da animação (`animationend`), a flag é gravada.
- **Justificativa:** técnica, sem piscar e sem mismatch de hidratação (atributo no `<html>`, fora da árvore React). De negócio, a entrada impressiona uma vez e depois some.
- **Consequências:** ganha boot único sem flash. Em troca, é mais um script inline antes do paint, que precisa ser mínimo e defensivo com `try/catch`.
- **Conformidade:** teste e2e: o primeiro carregamento tem animações `[data-boot]` rodando; o recarregamento na mesma aba tem zero.

**Decisões locais (reversíveis):**

| Decisão | Padrão escolhido | Gatilho para rever |
|---|---|---|
| Posição dos toggles públicos | Header do `PublicShell`, à direita da navegação | Header quebrar em telas ≤360px |
| Sidebar no Pôr do sol | Tokens de sidebar quentes e escuros | Feedback de contraste |
| `enableSystem` | Mantido (sistema resolve para claro ou escuro) | Pedido de "sistema = pôr do sol" |
| Ícones do `ThemeToggle` | Do módulo `pixel-icons` vendorizado; sem ícone de pôr do sol, desenhar um no mesmo módulo | nenhum |

## Riscos

| Risco | Onde | Impacto | Prob. | Score | Mitigação |
|---|---|---|---|---|---|
| Tokens do Pôr do sol reprovam contraste AA | tema global | 2 | 2 | 4 🟡 | Teste de contraste dos pares principais sobre os tokens de `globals.css` |
| Algum `.dark` esquecido deixa o tema quente com visual de claro | globals, componentes | 2 | 2 | 4 🟡 | Grep na task de tema e teste de paridade de tokens (D1) |
| Script de boot causa mismatch ou flash | layout público | 2 | 1 | 2 🟢 | Atributo no `<html>` com `suppressHydrationWarning`, que já existe no layout |
| Os testes existentes dos textos quebram | `login-volt.test.tsx`, `page.test.tsx`, `public-shell.test.tsx`, `theme-toggle.test.tsx` | 1 | 3 | 3 🟡 | Atualizar as asserções junto com o texto, na mesma task |

## Testes

Runners: Vitest com Testing Library (`pnpm --filter frontend test -- --run`) e Playwright (`pnpm --filter frontend e2e`). Convenções: `test` (nunca `it`) e descrições em PT-BR.

- `ThemeToggle`: seleciona cada um dos 3 temas; o `compact` percorre dark → sunset → light → dark; `aria-checked`/`aria-label` corretos.
- Paridade de tokens: `.sunset` declara todo `--color-*` de `.dark`.
- `MotionToggle` e o store: alterna, persiste, reidrata do `localStorage`, tolera storage bloqueado; `useSceneMotion` pausa com a preferência.
- `PixelTrail`: sem rAF em repouso; desenha após `pointermove`; não registra listeners com `pointer: coarse`, reduced motion ou pausa.
- `PixelScene`: renderiza `data-scene="sunset"`.
- Textos novos no login e na home (desktop e mobile); `data-testid` preservados; `PublicShell` passa a exibir os dois toggles.
- Guards existentes continuam verdes: sem literais de cor fora da allowlist, escopo das scanlines inalterado, sem `lucide`, sem `rounded-*`.
- E2E: `scene-performance.spec.ts` passa com o `MotionToggle` real; boot toca uma vez por sessão (D3).
