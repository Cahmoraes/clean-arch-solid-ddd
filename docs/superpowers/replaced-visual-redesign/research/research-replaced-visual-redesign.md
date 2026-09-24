# Research: Replaced Visual Redesign

## Question & Scope

Como traduzir a estética do jogo Replaced (Sad Cat Studios) para uma UI minimalista e moderna do frontend (Next.js 16, Tailwind v4, shadcn, temas escuro e claro), usando a direção "Noite neon" e a abordagem "retheme por tokens + componente `PixelScene`" (arte pixel em SVG/CSS procedural apenas em login, hero do dashboard e estados vazios). A pesquisa informa: paleta e tokens, regras de acessibilidade (contraste, movimento), técnica e custo de performance das cenas, e os riscos de legibilidade. Bom o bastante: decisões de design que o spec possa fechar sem redescobrir isso.

Segunda passada: não necessária (ver Open Questions).

## Key Findings

### Linguagem visual de Replaced

- **Não existe paleta oficial publicada.** Nenhuma fonte de desenvolvedor, art book ou devlog alcançada traz hex, matizes dominantes ou pixel scale. Grade: **Established** (como ausência de evidência nas fontes consultadas). Consequência: a paleta "magenta/ciano sobre azul-petróleo" é **decisão de design nossa**, não fato do jogo.
- **A iluminação é decisão narrativa por cena, não paleta fixa.** O diretor afirma que ajusta a luz para elevar o tom emocional da cena; a equipe construiu um pipeline de render próprio (Unity SRP) com até 60 luzes em tempo real. Grade: **Probable** (uma fonte primária, entrevista, 2026-04-20, mais uma entrevista independente sobre o pipeline customizado).
- **As descrições de imprensa citam faixa, não um par dominante:** skylines neon, cidades deterioradas, campo e instalações metálicas frias, paleta "suja" com brilhos suaves. Referências declaradas: *Upgrade* e *Blade Runner 2049*. Grade: **Probable**. A leitura de que 2049 puxa para laranja/âmbar contra verde-azulado é **Unverified** (blog de colorista, sem confirmação específica de Replaced).
- **Volumetria, bloom, névoa, chuva, dithering, resolução nativa e tipografia de UI:** sem fonte primária. **Unverified**; tratar como hipóteses de estilo.

### Tradução para UI minimalista

- **Consenso de prática: neon com parcimônia.** Fundos quase pretos, ciano ou magenta usados com moderação; neon-em-escuro tem risco de fadiga e é melhor em ferramentas de dev, jogos e portfólios do que em contextos densos. Grade: **Probable** (fonte secundária de prática de design, sem data; o próprio texto desaconselha uso corporativo/saúde).
- **O glow não conta para contraste.** Texto e bordas precisam passar contraste sozinhos; glow deve ser decorativo, em formas e bordas, nunca em texto. Grade: **Probable** (duas fontes secundárias independentes: guia de neon acessível e artigo de dark mode inclusivo da Smashing, 2025-04-15).
- **Primitivas de pixel art estão documentadas.** `image-rendering: pixelated` e `shape-rendering: crispEdges` são baseline e suportadas (MDN). `crispEdges` é permissivo ("pode"), não garantia; a propriedade CSS sobrepõe o atributo SVG. Grade: **Established** (MDN e compat data).
- **Pixel art via `box-shadow` só funciona em tamanhos pequenos** (256 sombras é desprezível; dezenas de milhares travam). Para skyline/hero, usar `<rect>` SVG em coordenadas inteiras dentro de um `viewBox` pequeno escalado por fator inteiro. Grade: **Probable** (CSS-Tricks 2016 mais resumo de guia; ambos secundários).
- **Dithering por `repeating-conic-gradient`** com célula de 4px ou 8px é viável, mas precisa de escala inteira para não borrar. Grade: **Unverified** (só trecho de busca; suporte do recurso é Established em MDN).

### Acessibilidade

- **Texto:** 4.5:1 (AA), texto grande 3:1; **componentes e gráficos não decorativos:** 3:1. Grade: **Established** (W3C WCAG 2.2, SC 1.4.3 e 1.4.11).
- **Razões calculadas** (cálculo próprio com a fórmula de luminância relativa; conferir na implementação): `#ff3ea5` sobre `#0a1424` = 5.70; `#3ee0ff` sobre `#0a1424` = 11.69. Sobre claro `#f3f6fa`: magenta 2.99 (falha) e ciano 1.46 (falha). Variantes escurecidas que passam no claro: `#cc0077` (5.05) e `#00708a` (5.26). Grade: **Probable** (fórmula Established; valores são cálculo do investigador, sem segunda verificação).
- **Movimento:** SC 2.2.2 (nível A) exige mecanismo de pausar/parar conteúdo em movimento automático por mais de 5s; SC 2.3.1 limita a 3 flashes por segundo. Chuva, feixes e flicker em loop caem na 2.2.2. Grade: **Established** (W3C).
- **`prefers-reduced-motion: reduce`** deve parar chuva, feixes e flicker (manter só glow estático). O ajuste do SO sozinho não satisfaz a 2.2.2; recomenda-se também um controle manual. Grade: **Probable** (MDN e web.dev primários; a parte da 2.2.2 é raciocínio do investigador sobre o texto W3C).
- **Glow em texto causa halation** (borrão ao redor dos caracteres), pior para quem tem astigmatismo; verificadores de contraste ignoram `text-shadow`. Grade: **Probable** (Smashing 2025 e blog 2025 independentes).

### Performance

- **Somente `transform` e `opacity` são compositor-only.** Animar `box-shadow`, `top/left`, `width/height` dispara layout ou paint. Grade: **Established** (web.dev, primário, mais MDN).
- **Cada camada promovida custa memória de GPU;** `will-change` deve ser usado com parcimônia. Grade: **Established** (MDN e web.dev).
- **Suporte de navegadores** (MDN BCD): `image-rendering: pixelated` (Firefox 93+), `shape-rendering: crispEdges`, `mask-image` sem prefixo (Chrome 120+, Safari 15.4+; SVG `<mask>` referenciado de elemento não-SVG não funciona no Safari) e `repeating-conic-gradient` (todos os modernos). Grade: **Established**.
- **Custo de blur, drop-shadow, máscara e mix-blend-mode em cenas animadas** e o padrão de pausar fora da tela com IntersectionObserver: **Unverified** (conhecimento do investigador, sem fonte). Medir em navegador real.
- **Hidratação no Next.js:** valores dependentes de tempo ou `Math.random()` no render causam mismatch; usar constantes pré-computadas ou PRNG com semente. Grade: **Probable** (doc do Next lista as causas; o caso de `Math.random()` é inferência).
- **Testes:** o happy-dom é limitado (cascata de CSS, IntersectionObserver). Testar estrutura, atributos e saída determinística no Vitest; comportamento visual e de paint só no Playwright. Grade: **Unverified** (uma fonte secundária de baixa confiança; consistente com o setup do repo).

## Sources

- [Replaced (video game)](https://en.wikipedia.org/wiki/Replaced_(video_game)) — secondary (referência), 2026 — data de lançamento, referências (*Upgrade*, *Blade Runner 2049*)
- [Bonus Action, entrevista do diretor](https://bonus-action.com/feature/replaceds-director-taught-himself-everything-from-scratch-to-make-the-most-beautiful-pixel-art-game-of-the-year-i-just-got-a-keen-eye-on-things/) — primary (declaração do desenvolvedor), 2026-04-20 — iluminação por cena, pipeline com até 60 luzes
- [GamingBolt, entrevista](https://gamingbolt.com/replaced-interview-inspirations-for-art-style-ranged-and-melee-combat-exploration-and-more) — primary (entrevista), 2026-03-25 — SRP customizado, alvos de resolução
- [TheGamer, entrevista Igor Gritsay](https://www.thegamer.com/replaced-preview-interview-igor-gritsay-influences-2d-3d-blend/) — primary (entrevista), 2026-02-09 — sprites animados à mão, mistura 2D/3D
- [Gaming Trend, review](https://gamingtrend.com/reviews/replaced-review/) — secondary (imprensa), 2026-04-14 — faixa de ambientes
- [Game Rant, review](https://gamerant.com/replaced-review/) — secondary (imprensa), 2026-04-14 — paleta "suja", brilhos suaves
- [Stellae, Cyberpunk UI](https://www.stellae.design/en/learn/cyberpunk-ui-design) — secondary (prática), sem data — neon com parcimônia, fadiga
- [Smashing, Inclusive Dark Mode](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/) — secondary (prática), 2025-04-15 — halation, evitar saturação e preto puro
- [NN/G, Dark Mode](https://www.nngroup.com/articles/dark-mode-users-issues/) — primary-ish (pesquisa), 2023-08-27 — sem diferença significativa de fadiga; riscos de cores saturadas
- [CSS-Tricks, Fun Times With CSS Pixel Art](https://css-tricks.com/fun-times-css-pixel-art/) — secondary, 2016-08-30 — limites do `box-shadow`
- [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering) — primary, 2026-09 — `pixelated`, baseline
- [MDN shape-rendering](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/shape-rendering) — primary — `crispEdges`
- [W3C WCAG 2.2, SC 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum) — primary, 2024-12-12 — contraste de texto
- [W3C Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) — primary, 2026-06-15 — contraste não textual
- [W3C Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) — primary — pausar, parar, ocultar
- [W3C Understanding SC 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) — primary — limite de flashes
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) — primary, 2026-06-10 — movimento reduzido
- [web.dev, compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count) — primary, 2015-03-20 (antigo) — `transform`/`opacity`, custo de camadas
- [web.dev, High-performance CSS animations](https://web.dev/articles/animations-guide) — primary, 2020-10-06 — mesmo tema
- [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) — primary — uso parcimonioso
- [MDN mask-image / repeating-conic-gradient (compat data)](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-image) — primary — suporte
- [Next.js, hydration mismatch](https://nextjs.org/docs/messages/react-hydration-error) — primary — causas de mismatch
- [PkgPulse, happy-dom vs jsdom](https://www.pkgpulse.com/guides/happy-dom-vs-jsdom-2026) — secondary, baixa confiança — limites do happy-dom

## Open Questions

- **Paleta real do jogo não verificada.** Sem amostragem de screenshots oficiais, "magenta/ciano sobre azul-petróleo" permanece escolha de design. Não bloqueia: a direção "Noite neon" já foi escolhida pelo usuário como leitura própria.
- **Custo de blur, máscara, `mix-blend-mode` e dithering em cenas animadas** (Unverified). Deve virar critério medível (trace no Chrome DevTools/Playwright) no spec, não suposição.
- **Padrão de pausa offscreen** com IntersectionObserver: Unverified. Definir na implementação e testar com mock.
- **Segunda passada não necessária:** nenhuma afirmação que muda a recomendação ficou como Unverified de forma que pese na decisão; as lacunas restantes são medições de implementação, não fatos pesquisáveis. Nenhuma limitação de ferramenta de busca foi atingida, mas o site oficial do estúdio e a página de arte no ArtStation não puderam ser abertos.

## Recommendation / Implications for design

**Direção:** manter "Noite neon" com retheme por tokens e `PixelScene` em SVG procedural, restrito a login, hero do dashboard e estados vazios. A pesquisa sustenta isso, com as restrições abaixo.

**Regras que o spec deve fixar** (todas apoiadas em fontes Established/Probable):
1. Texto e bordas passam AA por conta própria; glow é decorativo, nunca em texto. Corpo de texto em off-white, fundo em cinza-azulado escuro, sem preto puro nem saturação alta.
2. No tema claro ("dia de neblina"), acentos escurecidos: magenta próximo de `#cc0077` e ciano próximo de `#00708a`, a validar por cálculo na implementação (os neons puros falham AA no claro).
3. Movimento: só `transform` e `opacity`; `prefers-reduced-motion: reduce` desliga chuva, feixes e flicker; controle manual para pausar; nenhum flicker acima de 3 flashes por segundo; sem animar de `opacity:0` com fill-mode persistente (regra herdada do volt-redesign).
4. `PixelScene`: SVG com `<rect>` em coordenadas inteiras, `viewBox` pequeno escalado por fator inteiro, `shape-rendering: crispEdges`; sem `box-shadow` em massa; valores determinísticos (sem `Math.random()` no render) para evitar mismatch de hidratação.
5. Testes: Vitest valida estrutura, atributos e saída determinística; verificação visual, contraste e paint em Playwright (axe já existe em `accessibility.spec.ts`).

**Forks que o spec precisa fechar:**
- **Legibilidade em telas densas (Contested):** há evidência de que neon e modo escuro podem prejudicar leitura de texto pequeno, e nenhuma evidência de melhora de desempenho em dashboards. Peso: a arte fica fora das telas densas (só login, hero e estados vazios), então o risco é contido; manter isso como regra explícita e não expandir a arte sem nova decisão.
- **Fidelidade ao jogo vs. paleta própria:** como não há paleta oficial, o spec deve declarar que a paleta é interpretação, não cópia.
- **Custo de performance:** definir orçamento (por exemplo, sem quadros não compositor em trace) como critério de aceite, já que o custo de blur/máscara é Unverified.

**Suposições em que isto se apoia:** o design segue a abordagem 1 já aprovada; o VOLT deixa de ser a base visual, mas tokens semânticos, estrutura de shell, acessibilidade e responsivo permanecem.
