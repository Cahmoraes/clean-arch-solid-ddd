# PRD: Formas e Tipografia Retrô Replaced

## Visão Geral

O frontend já usa a paleta e a arte em pixel inspiradas no jogo Replaced, mas mantém a linguagem de forma de um SaaS moderno: cantos arredondados, pills e círculos. O Replaced é retro-futurista (anos 80 alternativos, computadores antigos, TVs de tubo, rádios, HUD de painel), com traços retos. Esta feature troca a forma, a tipografia de destaque e a textura da interface para aproximá-la dessa identidade, sem mudar paleta, layout nem as garantias de acessibilidade já entregues.

Serve a todos os usuários do frontend (aluno e administrador), nos temas escuro e claro.

Spec de design: `../specs/replaced-retro-shapes-design.md`.

## Objetivos

- Nenhum elemento retangular com canto arredondado e nenhum elemento circular em `apps/frontend/src`, verificado por teste automatizado (zero ocorrências fora da allowlist).
- Cantos chanfrados visíveis em navegadores com suporte (Chrome/Edge 139+) e cantos retos nos demais.
- Fonte de terminal nos papéis de destaque (títulos, rótulos, botões, números, badges), sem texto nessa fonte abaixo de 15px.
- Zero violações novas de acessibilidade (axe) nos temas escuro e claro; anel de foco visível em todo controle focável.
- `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passando.

## Histórias de Usuário

- **US-01** — Como usuário do app, eu quero que botões, campos, cards, modais, menus e badges tenham cantos chanfrados (ou retos quando meu navegador não suporta) para que a interface pareça hardware e HUD dos anos 80, coerente com o Replaced · **UI:** sim
- **US-02** — Como usuário do app, eu quero que avatares, indicadores de status, spinners, radios, switches e skeletons sejam quadrados para que nenhum elemento redondo quebre a identidade retrô · **UI:** sim
- **US-03** — Como usuário do app, eu quero títulos, rótulos, botões, números de destaque e badges numa fonte de terminal antigo, com o texto corrido continuando legível, para que a tipografia remeta a computadores antigos sem prejudicar a leitura · **UI:** sim
- **US-04** — Como usuário no tema escuro, eu quero uma textura de linhas de TV de tubo nas superfícies de destaque, sem ela cobrir o texto, para que o app lembre um monitor CRT · **UI:** sim
- **US-05** — Como usuário digitando num campo, eu quero um cursor em bloco na cor de destaque para que o campo lembre um terminal · **UI:** sim
- **US-06** — Como usuário de teclado ou tecnologia assistiva, eu quero continuar vendo o anel de foco e ter o mesmo contraste de antes para que a mudança visual não reduza a acessibilidade · **UI:** sim
- **US-07** — Como desenvolvedor do projeto, eu quero que a forma seja controlada por tokens centrais e protegida por testes para que novos componentes não reintroduzam arredondamento · **UI:** não

## Funcionalidades Principais

### Cantos chanfrados controlados por tokens

Todos os containers e controles retangulares passam a ter canto chanfrado, em cinco tamanhos (2, 4, 6, 10 e 12px, do menor controle ao maior container). Onde o navegador não suporta o chanfro, o canto é reto. Importa porque é a mudança de maior impacto na identidade e precisa ser uniforme.

- **FR-001** (US-01, US-07) — O sistema deve definir o formato de canto exclusivamente pelos tokens de raio do tema, onde cada token representa o tamanho do chanfro.
- **FR-002** (US-01) — O sistema deve exibir cantos chanfrados (`corner-shape: bevel`) em navegadores com suporte e cantos retos (tamanho 0) nos navegadores sem suporte.
- **FR-003** (US-01, US-07) — Todo uso de arredondamento fora dos tokens (classes com valor arbitrário) em componentes, features e páginas deve ser substituído por um token de tamanho equivalente.
- **FR-004** (US-02) — Elementos hoje circulares (avatar, indicador de status, spinner, radio, thumb do switch, skeleton circular) devem ser exibidos quadrados; elementos com menos de 12px de lado ficam com canto reto, sem chanfro.

### Tipografia de terminal

A fonte VT323 (bitmap de terminal) substitui a fonte de display atual nos papéis de destaque. Inter continua no texto corrido, nos campos e nas tabelas.

- **FR-005** (US-03) — O sistema deve usar a fonte VT323 em títulos (h1–h3, títulos de card e de modal), eyebrows e rótulos de seção, botões (em maiúsculas), números de KPI e badges.
- **FR-006** (US-03) — Os textos em VT323 devem ter tamanho aproximadamente 1,25× o tamanho atual do mesmo papel e nunca menos que 15px.
- **FR-007** (US-03) — Texto corrido, valores digitados em campos e conteúdo de tabelas devem continuar em Inter.
- **FR-008** (US-03) — Se a VT323 não carregar ou não tiver um glifo, o texto deve aparecer numa fonte monoespaçada de fallback, sem sumir nem ficar invisível.

### Textura de CRT

Linhas horizontais finas (scanlines) atrás do conteúdo de quatro superfícies de destaque.

- **FR-009** (US-04) — O sistema deve exibir scanlines apenas na cena pixel, no hero do dashboard, nos cards de KPI e na sidebar, e somente no tema escuro.
- **FR-010** (US-04, US-06) — As scanlines devem ficar atrás do conteúdo, sem cobrir texto, e ser estáticas (sem animação).

### Cursor de terminal

- **FR-011** (US-05) — Os campos de texto devem exibir o cursor na cor de destaque e, em navegadores com suporte, em formato de bloco; nos demais, o cursor nativo fino na cor de destaque.

### Acessibilidade preservada

- **FR-012** (US-06) — Todo controle focável deve continuar exibindo o anel de foco duplo completo, sem ser cortado pelo formato do canto.
- **FR-013** (US-06) — Os contrastes mínimos da feature anterior continuam valendo (4,5:1 para texto, 3:1 para componentes), medidos sem a scanline; glow continua proibido em texto.
- **FR-014** (US-06) — As verificações axe nos temas escuro e claro não devem apresentar violações novas.

### Proteção contra regressão

- **FR-015** (US-07) — Um teste automatizado deve falhar se surgir arredondamento total, arredondamento com valor arbitrário ou declaração de formato de canto fora do arquivo de tema em `apps/frontend/src`, respeitando uma allowlist explícita.
- **FR-016** (US-07) — Um teste automatizado deve falhar se a textura de scanlines for aplicada fora das quatro superfícies permitidas.
- **FR-017** (US-07) — O teste de tokens do tema deve exigir VT323 como fonte de display, os cinco tokens de raio e o bloco de ativação condicional do chanfro.
- **FR-018** (US-07) — A documentação do frontend (`apps/frontend/AGENTS.md`) deve descrever o sistema visual real: paleta atual, fontes, tokens de chanfro e as regras desta feature.

## Experiência do Usuário

A jornada não muda: mesmas telas, mesmo layout, mesma navegação. Muda o acabamento de todos os elementos:

- **Forma:** cortes diagonais nos cantos de botões, campos, cards, modais, menus, tabs e badges; avatares e indicadores quadrados.
- **Tipografia:** títulos e rótulos com cara de terminal DEC; botões em maiúsculas; números de destaque grandes e pixelados.
- **Textura:** no tema escuro, as superfícies de destaque ganham linhas finas de TV de tubo; no tema claro, não.
- **Campo em foco:** cursor em bloco ciano.

Norte visual aprovado no companion (variantes B · Chanfrado e T2 · VT323): `../specs/mockups/replaced-retro-shapes-visual.md`.

Acessibilidade: o anel de foco, os contrastes, o respeito a `prefers-reduced-motion` e o controle "Pausar animações" da feature anterior continuam. Nenhum efeito novo é animado, então nenhum novo controle de pausa é necessário.

## Restrições Técnicas de Alto Nível

Características priorizadas na spec:

- **Acessibilidade:** axe sem violações nos temas escuro e claro; anel de foco duplo visível em todo controle focável; contraste 4,5:1 medido sem scanline.
- **Consistência visual:** zero arredondamento total e zero arredondamento com valor arbitrário em `src/`, exceto allowlist.
- **Manutenibilidade:** o formato do canto é mudado num único arquivo de tema; nenhum componente declara o formato por conta própria.

Outras restrições:
- O chanfro depende de propriedade CSS experimental (Chrome/Edge 139+). É preciso validar cedo, antes da migração em massa, que o anel de foco e as bordas acompanham o formato; se não acompanharem, a abordagem é revista.
- Paleta, layout e estrutura do shell da feature `replaced-visual-redesign` são mantidos.

## Fora de Escopo

- **Mudança de paleta:** mantida da feature anterior.
- **Mudança de layout de páginas ou do shell:** mantidos.
- **Chanfro em Firefox e Safari:** esses navegadores mostram canto reto até suportarem a propriedade; alternativas que recortam o elemento foram rejeitadas por cortarem o anel de foco.
- **Fonte de terminal em texto corrido, campos e tabelas:** prejudica a leitura em tamanho pequeno.
- **Brilho de fósforo ou glow em texto:** proibido pela feature anterior.
- **Efeitos animados de CRT** (flicker, rolagem, curvatura): não pedidos; exigiriam controle de pausa e limite de intermitência.
- **Scanlines no tema claro:** linha escura sobre fundo claro vira sujeira visual.
- **Globo WebGL do clima:** fora do sistema de tokens; permanece exceção.
