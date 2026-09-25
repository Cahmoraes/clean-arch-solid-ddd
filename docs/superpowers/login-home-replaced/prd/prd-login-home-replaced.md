# PRD: Login e Home Replaced

- **Spec:** `../specs/login-home-replaced-design.md`
- **Norte visual:** `../specs/mockups/login-home-replaced-visual.md`

## Visão Geral

O login e a home pública (`/`) são o primeiro contato com o VOLT. Hoje as duas telas usam a identidade "Noite neon" de forma estática, e a home ainda exibe textos da identidade antiga ("Demo monocromática", "Inspirado em Ollama"). Esta feature transforma as duas telas em uma experiência cinematográfica inspirada no jogo Replaced, com:

- entrada animada de terminal;
- rastro de pixels que segue o mouse;
- hover pixelado nos CTAs;
- cenas próprias por tela;
- textos reescritos.

O app também ganha um terceiro tema global, **Pôr do sol**, com o contraste quente do jogo. Tudo isso precisa ser leve: nenhum efeito pode atrasar o acesso nem consumir CPU em repouso, e quem prefere menos movimento precisa conseguir desligá-lo.

## Objetivos

- A identidade Replaced fica evidente no primeiro segundo nas duas telas.
- O título e o formulário ficam visíveis desde o primeiro frame, sem atraso de LCP por causa de animação.
- Em repouso, as cenas não geram eventos de `Layout` e geram no máximo 5 `Paint` em 3s. O rastro não executa trabalho quando ninguém mexe o mouse.
- Nenhuma dependência nova no frontend.
- O tema Pôr do sol cumpre contraste WCAG AA (4.5:1 para texto, 3:1 para componentes de UI).
- Todo movimento contínuo pode ser pausado (WCAG 2.2.2) e respeita `prefers-reduced-motion`.

## Histórias de Usuário

- **US-01** — Como visitante da home, eu quero ver uma apresentação com a atmosfera do Replaced e textos claros sobre o produto para que eu entenda rápido o que o VOLT oferece e como começar
- **US-02** — Como aluno que vai entrar, eu quero um login imersivo que não atrapalhe o preenchimento para que eu acesse minha conta sem esperar animações
- **US-03** — Como visitante com mouse, eu quero que pixels reajam ao cursor nas cenas para que a tela pareça viva e interativa
- **US-04** — Como visitante, eu quero uma entrada de "terminal ligando" na primeira visita da sessão para que a abertura impressione sem se repetir a cada recarga
- **US-05** — Como usuário, eu quero escolher entre os temas Neon, Neblina e Pôr do sol, tanto na área pública quanto dentro do app, para que o VOLT tenha o clima que eu prefiro
- **US-06** — Como usuário sensível a movimento, eu quero pausar as animações e ter minha preferência de sistema respeitada para que eu use as telas com conforto

## Funcionalidades Principais

### Tema Pôr do sol e seletor de tema

O app passa a oferecer três temas, escolhidos por um seletor presente nas áreas pública e autenticada. Isso importa porque a escolha vale para o app inteiro, e não só para as duas telas redesenhadas.

- **FR-001** (US-05) — O sistema deve oferecer três temas: Neon (escuro, padrão), Neblina (claro) e Pôr do sol (quente). A escolha deve persistir entre visitas no mesmo navegador.
- **FR-002** (US-05) — O sistema deve exibir o seletor de tema no header público e no shell autenticado. Na versão completa, os três temas aparecem como opções, e o selecionado é anunciado a leitores de tela. Na versão compacta, cada clique avança o ciclo Neon → Pôr do sol → Neblina → Neon, e o rótulo acessível nomeia o próximo tema.
- **FR-003** (US-05) — O tema Pôr do sol deve aplicar a paleta quente em todo o app (superfícies, sidebar, gráficos, cenas pixel, scanlines) com os mesmos tokens de cor definidos para o tema Neon, e todos os pares texto/fundo devem cumprir AA. Exceção declarada: o globo do clima mantém as cores atuais.
- **FR-004** (US-05) — Um valor de tema salvo desconhecido deve resultar no tema Neon.

### Login imersivo

- **FR-005** (US-02) — O login deve manter a grade de 2 colunas no desktop e o hero compacto acima do formulário em telas de até 860px. A coluna da cena mostra a cidade à noite, com sol pixelado em faixas e janelas acesas.
- **FR-006** (US-02) — O login deve exibir os textos novos:
  - eyebrow do hero: `> VOLT // ONLINE`;
  - título (desktop e mobile): "Sua cidade inteira é **sua academia**.";
  - eyebrow do formulário: "Acesso autorizado";
  - botão: `> Entrar`.

  As estatísticas, os rótulos dos campos, o link de recuperação, o login com Google e os identificadores de teste existentes permanecem.

### Home pública

- **FR-007** (US-01) — O hero da home deve exibir, sobre uma cena de pôr do sol sutil (skyline em opacidade reduzida):
  - badge `> REDE VOLT ONLINE`;
  - título "Qualquer academia. Um **check-in**.";
  - descrição "Um plano, centenas de academias parceiras. Chegou, fez check-in, treinou.";
  - CTAs `> Começar agora` (para `/cadastro`) e "Já tenho conta" (para `/login`).
- **FR-008** (US-01) — A home não deve conter os textos "Demo monocromática" nem "Inspirado em Ollama". Os três cards de features devem ser:
  - "Encontre": academias parceiras perto de você, no mapa;
  - "Faça check-in": validação na hora, sem catraca de papel;
  - "Mantenha a sequência": acompanhe dias, semanas e metas.
- **FR-009** (US-01) — As seções Planos e Contato devem manter estrutura e conteúdo, variando apenas pelas cores do tema ativo.

### Efeitos visuais

- **FR-010** (US-03) — Ao mover o mouse sobre a área de cena do login e do hero da home, o sistema deve desenhar um rastro de pixels nas cores do tema ativo, que se dissolve sozinho em menos de 1s. Com o mouse parado ou fora da área, nenhum trabalho de animação deve ocorrer.
- **FR-011** (US-03) — Em dispositivos de toque (ponteiro grosso), o rastro não deve ser ativado.
- **FR-012** (US-01, US-02) — Os CTAs principais do login e da home devem ter um hover pixelado (borda e brilho que acendem em degraus).
- **FR-013** (US-04) — Na primeira carga de login ou home em uma aba, o hero deve executar a entrada de terminal (eyebrow digitado, pulso de brilho no título, estatísticas escalonadas) em até 600ms. Recarregar na mesma aba não repete a entrada; uma aba nova, ou a mesma aba depois de fechada, repete.
- **FR-014** (US-02, US-04) — O título e o formulário devem estar visíveis e interativos desde o primeiro frame. A entrada nunca oculta esses elementos nem bloqueia digitação ou clique.

### Controle de movimento

- **FR-015** (US-06) — O header público deve exibir o botão "Pausar animações" / "Retomar animações" com estado pressionado acessível. A pausa interrompe cenas, rastro, entrada de terminal e hover pixelado, e persiste entre visitas no mesmo navegador.
- **FR-016** (US-06) — Com `prefers-reduced-motion: reduce` ativo no sistema, os mesmos efeitos do FR-015 devem ficar desligados, qualquer que seja o estado do botão.
- **FR-017** (US-03, US-06) — Cenas e rastro fora da área visível da tela devem ficar parados.
- **FR-018** (US-04, US-05, US-06) — Se o armazenamento do navegador estiver bloqueado, as telas devem funcionar normalmente, sem persistência: o tema e a pausa valem só naquela página, e a entrada toca a cada carga.

## Experiência do Usuário

**Visitante na home:** abre `/` e vê o hero sobre a cena de pôr do sol. A entrada de terminal acontece uma vez. Ao passar o mouse, pixels acendem e se dissolvem. Os CTAs levam a cadastro ou login.

**Aluno no login:** vê a cidade à noite ao lado do formulário, que já está pronto para digitar. A entrada roda por cima sem bloquear nada.

**Tema e pausa:** os dois controles ficam no header público. O seletor de tema também existe dentro do app.

**Decisões visuais** (norte em `../specs/mockups/login-home-replaced-visual.md`):
- direção A, split evoluído;
- login imersivo, home sutil;
- VT323 para eyebrows, títulos, botões e estatísticas;
- cantos chanfrados;
- ícones pixel-art.

**Acessibilidade:** AA nos três temas; seletor e botão de pausa operáveis por teclado e com nome acessível; elementos decorativos (cena, rastro) ocultos para leitores de tela; nenhum efeito pisca mais de 3 vezes por segundo.

## Restrições Técnicas de Alto Nível

- **Performance percebida:** título e formulário visíveis no primeiro frame. Em repouso, 0 `Layout` e no máximo 5 `Paint` em 3s na cena do login. Rastro sem trabalho em repouso.
- **Acessibilidade:** AA no tema Pôr do sol; pausa visível (WCAG 2.2.2); `prefers-reduced-motion` respeitado.
- **Leveza do bundle:** nenhuma dependência nova; os efeitos são carregados apenas nas duas telas.
- **Convenções do repositório que continuam valendo:**
  - sem cores literais fora da allowlist;
  - scanlines só nas superfícies permitidas;
  - ícones apenas do conjunto pixel-art;
  - sem cantos arredondados fora dos tokens de chanfro.
- **Dados:** as preferências de tema, pausa e entrada ficam só no navegador; nada é enviado ao backend.

## Fora de Escopo

- **Layout das demais telas públicas** (cadastro, ativar, recuperar e redefinir senha, clima): features anteriores já as deixaram fora. Elas apenas herdam o tema pelas cores.
- **Estrutura das seções Planos e Contato:** pertence à feature `home-planos-contato`.
- **Efeitos CRT de flicker, rolagem ou curvatura:** rejeitados em `replaced-retro-shapes` por exigirem limite de intermitência.
- **Tema Pôr do sol no globo WebGL do clima:** arquivo com cores próprias allowlisted, sem pedido.
- **Opção "sistema = Pôr do sol":** o modo sistema continua resolvendo para Neon ou Neblina.
- **Botão de pausa dentro do app autenticado:** o pedido cobre as telas externas. A preferência salva no header público também pausa as cenas internas (a fonte de pausa é única), mas o app não ganha um botão próprio.
- **Nova fonte ou nova biblioteca de animação.**
