# PRD: Replaced Visual Redesign

## Visão Geral

O frontend do VOLT passa a ter uma identidade visual mais moderna e minimalista, inspirada na estética do jogo Replaced (noite retrofuturista azul-petróleo, neon magenta e ciano, luz volumétrica, pixel art). A paleta é uma interpretação da estética, não uma cópia: o jogo não publica paleta oficial.

Serve a membros e administradores do app. Importa porque o visual atual (verde neon sobre preto) será substituído por uma linguagem coesa, sem perder legibilidade, acessibilidade nem as funções existentes. A arte pixel aparece só em pontos de destaque; o restante da interface permanece limpo e denso.

Referências: spec `../specs/replaced-visual-redesign-design.md`, pesquisa `../research/research-replaced-visual-redesign.md` e mockups em `../specs/mockups/`.

## Objetivos

- Todas as telas públicas e autenticadas usam a nova paleta nos temas escuro (padrão) e claro.
- Contraste WCAG 2.2 AA nos dois temas: texto 4.5:1 (texto grande 3:1) e componentes 3:1, medidos sem contar glow; axe sem violações novas.
- Nenhuma animação decorativa impede o uso: todas pausáveis, e desligadas sob movimento reduzido do sistema.
- Cenas animadas sem quadros de layout ou paint por quadro em uma medição real de navegador.
- Nenhuma função existente das telas de Usuários, Check-ins e Academias é perdida.
- Gate final verde: `pnpm biome:fix`, `pnpm tsc:check`, testes e `pnpm build` sem problemas.

## Histórias de Usuário

- **US-01** — Como membro ou administrador, eu quero ver o app inteiro na nova identidade visual (Noite neon), nos temas escuro e claro, para que a experiência seja moderna e coesa · **UI:** sim
- **US-02** — Como usuário, eu quero textos e controles legíveis com bom contraste nos dois temas, para que o visual neon não prejudique a leitura · **UI:** sim
- **US-03** — Como membro, eu quero ver a arte pixel no login, no topo do dashboard, nos estados vazios e nas capas de academia sem imagem, para que o app tenha personalidade sem poluir as telas de trabalho · **UI:** sim
- **US-04** — Como usuário sensível a movimento, eu quero pausar as animações e ter o app respeitando o movimento reduzido do sistema, para que a arte animada não me incomode · **UI:** sim
- **US-05** — Como administrador, eu quero usar as telas de Usuários, Check-ins e Academias na nova direção visual mantendo todas as funções, para que a renovação não atrapalhe meu trabalho · **UI:** sim
- **US-06** — Como mantenedor, eu quero que a renovação chegue por ondas, com testes e acessibilidade verificados, para que o app siga estável e confiável em cada entrega · **UI:** não

## Funcionalidades Principais

### Identidade visual e temas

O que faz: aplica a paleta Noite neon a todo o app. Por que importa: coesão e modernidade sem alterar o layout das páginas. Em alto nível: os valores de cor dos dois temas mudam e os componentes herdam.

- **FR-001** (US-01) — O sistema deve exibir o tema escuro, padrão, com fundo azul-petróleo, magenta como cor primária de ação, ciano como acento secundário (foco, seleção, rótulos) e texto em off-white frio.
- **FR-002** (US-01) — O sistema deve exibir o tema claro "dia de neblina", com fundo frio claro e acentos escurecidos, e manter a alternância entre os temas existente.
- **FR-003** (US-01) — O sistema deve manter a barra lateral escura nos dois temas, manter o nome VOLT e exibir a marca redesenhada em estilo pixel.
- **FR-004** (US-01, US-05) — O sistema deve aplicar a nova paleta a todas as telas públicas e autenticadas, incluindo as de administração, sem alterar o layout das páginas nem a estrutura do shell.

### Legibilidade e acessibilidade

- **FR-005** (US-02) — O sistema deve garantir contraste mínimo de 4.5:1 para texto (3:1 para texto grande) e 3:1 para componentes e bordas relevantes, nos dois temas, medido sem considerar glow.
- **FR-006** (US-02) — O sistema deve usar glow apenas em bordas e formas, nunca em texto.
- **FR-007** (US-02) — O sistema deve preservar os indicadores de foco visíveis e os alvos de toque mínimos já existentes.

### Arte pixel

O que faz: exibe cenas decorativas (skyline, feixes de luz, janelas, dither) em superfícies de destaque. Por que importa: entrega a atmosfera do jogo sem afetar telas densas.

- **FR-008** (US-03) — O sistema deve exibir a arte pixel no login, no topo do dashboard e nos estados vazios.
- **FR-009** (US-03) — O sistema deve usar a arte pixel como capa de card de academia sem imagem; quando há imagem, a imagem prevalece.
- **FR-010** (US-03) — O sistema deve tratar a arte como decorativa: leitores de tela a ignoram, e ela não aparece em outras telas além das superfícies listadas.
- **FR-011** (US-03) — O sistema deve, se uma cena falhar ao ser exibida, mostrar a tela normalmente com fundo liso no lugar da arte.

### Movimento

- **FR-012** (US-04) — O sistema deve animar as cenas com movimento sutil (deriva dos feixes e cintilar das janelas).
- **FR-013** (US-04) — O sistema deve oferecer o controle "Pausar animações", acessível por teclado e leitor de tela, ao lado do alternador de tema nos dois shells, e lembrar a escolha no navegador; se a escolha não puder ser lida ou gravada, as cenas animam e o controle funciona na sessão.
- **FR-014** (US-04) — O sistema deve exibir as cenas estáticas quando o sistema do usuário pede movimento reduzido, sem exigir nenhuma ação.
- **FR-015** (US-04) — O sistema deve pausar a animação de cenas que não estão visíveis na tela.
- **FR-016** (US-04) — O sistema deve evitar qualquer intermitência de brilho acima de 3 vezes por segundo.

### Telas internas

- **FR-017** (US-05) — A tela de Usuários deve manter filtros segmentados com contagem, busca, lista com faixa lateral de status, seleção em lote e painel de detalhes com abas, na nova direção visual.
- **FR-018** (US-05) — A tela de Check-ins deve manter filtro por status com contagem, busca por academia, ordenação, itens com chip de status e ações de aprovar e rejeitar para administradores, na nova direção visual.
- **FR-019** (US-05) — A tela de Academias deve manter busca, alternância entre cards e lista, cards com badge de status, cadastrar e editar para administradores, e paginação, na nova direção visual.
- **FR-020** (US-05) — O sistema deve manter as cores semânticas de status (verde, âmbar, vermelho) nos badges e chips, sem neon.

### Qualidade e entrega

- **FR-021** (US-06) — O sistema deve manter todos os testes existentes passando, com os testes acoplados a valores visuais atualizados, e o gate final verde.
- **FR-022** (US-06) — O sistema deve passar na verificação automática de acessibilidade (axe) nos dois temas nas telas de cada onda.
- **FR-023** (US-06) — O sistema deve exibir as cenas animadas sem quadros de layout ou paint por quadro, conferido por medição em navegador real.
- **FR-024** (US-06) — O sistema deve ser entregue em três ondas, cada uma deixando o app funcional e o gate verde: (1) paleta, shell e marca; (2) arte, login, dashboard, estados vazios e capas de academia; (3) demais telas, incluindo administração, e verificações de contraste e desempenho.

## Experiência do Usuário

Visão: noite azul-petróleo com neon usado com parcimônia; texto sempre legível; arte só como destaque. Decisões visuais (norte, não pixel-final):

- Escuro: fundo azul-petróleo, primary magenta com texto escuro, ciano para foco e seleção, off-white frio para texto.
- Claro "dia de neblina": fundo frio claro, acentos escurecidos para passar AA.
- Barra lateral escura nos dois temas.
- Arte: skyline em duas camadas, feixes de luz, dither, janelas acesas, movimento sutil.
- Telas internas: mesmo layout atual, com seleção e filtro ativo em ciano e ações primárias em magenta.

Acessibilidade: WCAG 2.2 AA, controle de pausa acessível, movimento reduzido respeitado. Mockups curados: `../specs/mockups/replaced-visual-redesign-visual.md`, `...-usuarios-visual.md`, `...-checkins-visual.md` e `...-academias-visual.md`.

## Restrições Técnicas de Alto Nível

Características priorizadas (da spec):

- **Acessibilidade:** texto 4.5:1 e componentes 3:1 nos dois temas, axe sem violações novas, glow nunca em texto.
- **Desempenho de renderização:** cenas sem quadros de layout ou paint por quadro em medição real.
- **Manutenibilidade:** componentes usam apenas valores semânticos de cor; nenhuma cor literal nova em componente.

Outras: apenas frontend, sem novas dependências, sem alterações de backend ou API; gate final obrigatório do repositório.

## Fora de Escopo

- Redesign de layout de página e mudança de estrutura do shell (mantidos como estão).
- Nova fonte pixel; as fontes atuais permanecem.
- Backend, API e novas dependências.
- Arte raster (PNG) e pipeline de assets externos.
- Pixel art como fundo geral da interface ou em telas densas além das listadas.
- Sincronização da preferência de pausa entre dispositivos (vale por navegador).
- Cópia fiel da paleta ou dos assets do jogo Replaced.
