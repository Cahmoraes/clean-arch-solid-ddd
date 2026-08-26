---
created_at: "2026-08-26T15:08:46-03:00"
updated_at: "2026-08-26T15:08:46-03:00"
---

# PRD: Acessibilidade WCAG 2.2 em todo o frontend

## Visão Geral

Usuários que dependem de leitor de tela, navegação só por teclado, ou de uma configuração de fonte maior no navegador/SO enfrentam barreiras hoje em várias telas do `apps/frontend` (academias, check-ins, admin, assinatura, perfil, formulários) e na navegação estrutural do app (shell, indicador de foco). Uma auditoria real contra WCAG 2.2 (skill `wcag-audit-patterns`) mapeou 25 itens de critério e 59 ocorrências distribuídas entre componentes de UI compartilhados, features individuais, o shell e o design system. Este PRD formaliza as correções que fecham essas barreiras, generalizando um padrão já validado em produção (`contato-acessibilidade`) para toda a aplicação.

## Objetivos

- Fechar os achados de rótulo/nome acessível em todos os campos de formulário do app (critérios `3.3.2`, `2.4.6`, `2.5.3`, `4.1.2`).
- Tornar o indicador de foco visível com contraste ≥3:1 em qualquer fundo e tema (critérios `2.4.7`, `1.4.11`) — hoje falha em ~1.3:1 no tema claro.
- Fechar as duas dívidas de acessibilidade deferidas duas vezes por features anteriores: skip-link (`2.4.1`) e `font-size` fixo em px (`1.4.4`).
- Garantir nome acessível em todo ícone funcional/botão-ícone e imagem auditados (critério `1.1.1`).
- Métrica de sucesso: as 59 ocorrências auditadas terminam fechadas por correção ou registradas como risco aceito explícito — nenhuma fica sem dono. `apps/frontend/e2e/accessibility.spec.ts` (axe-core, tags `wcag2a/aa`) passa sem falhas `critical`/`serious` nas rotas cobertas por esta feature.

## Histórias de Usuário

- **US-01** — Como usuário de leitor de tela, eu quero que todo campo de formulário tenha um rótulo associado programaticamente para que eu saiba o que preencher em qualquer tela do app · **UI:** sim
- **US-02** — Como usuário que navega só por teclado, eu quero um indicador de foco visível e com contraste suficiente em qualquer fundo/tema para que eu sempre saiba onde estou na página · **UI:** sim
- **US-03** — Como usuário que navega só por teclado, eu quero pular o cabeçalho/menu repetitivo direto para o conteúdo principal para que eu não precise tabular por dezenas de links em toda página · **UI:** sim
- **US-04** — Como usuário com fonte maior configurada no navegador/SO por baixa visão, eu quero que o texto base do app respeite essa preferência para que eu consiga ler sem depender só do zoom · **UI:** sim
- **US-05** — Como usuário de leitor de tela, eu quero que botões-ícone e imagens funcionais (upload, zoom, alternância de visualização, ações de academia/check-in) anunciem seu propósito para que eu consiga operar essas telas sem enxergar os ícones · **UI:** sim
- **US-06** — Como usuário de leitor de tela, eu quero que títulos de cartões (academias, plano de assinatura, etc.) sejam expostos como cabeçalhos navegáveis para que eu possa pular entre seções usando atalhos do leitor de tela · **UI:** sim
- **US-07** — Como usuário que navega só por teclado, eu quero que todo link de paginação tenha destino real para que eu nunca caia num elemento morto ao tabular pela lista · **UI:** sim

## Funcionalidades Principais

**Migração e correção de campos de formulário** — consolida `<input>` crus espalhados por features nos componentes compartilhados `Input`/`Label`/`FormField`/`FieldShell`, garantindo rótulo programático e indicação de obrigatoriedade consistentes.
- **FR-001** (US-01) — Todo campo de formulário hoje implementado com `<input>` cru (upload de imagem de academia, busca de check-ins, busca administrativa, command palette, CNPJ/localização de academia, seleção de plano) deve usar os componentes compartilhados `Input`/`Label`/`FormField`/`FieldShell`, com rótulo associado programaticamente (`<label htmlFor>`, `aria-label` ou equivalente).
- **FR-002** (US-01) — Todo campo obrigatório deve carregar `aria-required="true"` mais texto oculto para leitor de tela indicando obrigatoriedade, sem adicionar símbolo ou legenda visível (mantém o padrão visual já validado).

**Indicador de foco consistente e com contraste adequado** — resolve a falha de contraste do anel de foco atual, hoje abaixo do mínimo em qualquer fundo claro do produto.
- **FR-003** (US-02) — O indicador de foco global e os indicadores locais de botão, campo de texto e checkbox devem manter contraste ≥3:1 contra o fundo em que aparecem, em ambos os temas (claro e escuro).

**Navegação estrutural** — fecha os dois achados de camada de shell/design system deferidos por features anteriores.
- **FR-004** (US-03) — Cada layout de shell da aplicação (área pública e área autenticada) deve expor um mecanismo de "pular para o conteúdo principal" que fica invisível até receber foco de teclado.
- **FR-005** (US-04) — O tamanho de fonte base do texto do corpo da aplicação deve ser expresso numa unidade relativa (não fixa em pixels), sem alterar o tamanho visual exibido por padrão.

**Nome acessível em controles e imagens** — fecha os achados de ícone/imagem funcional sem nome acessível encontrados na auditoria.
- **FR-006** (US-05) — Todo controle interativo identificado apenas por ícone (alternância de visualização em cards/lista, upload de arquivo, e os demais listados nos relatórios de auditoria) deve expor um nome acessível (`aria-label` ou equivalente) descrevendo sua ação.
- **FR-007** (US-05) — Todo ícone puramente decorativo identificado na auditoria sem marcação deve ser marcado como decorativo (`aria-hidden`) para não ser anunciado por leitores de tela.
- **FR-008** (US-05) — Todo alvo interativo somente-ícone identificado abaixo do tamanho mínimo de toque na auditoria deve atingir ao menos 24×24px de área clicável.

**Semântica de navegação em componentes compartilhados**
- **FR-009** (US-06) — O componente de título de cartão (`CardTitle`) deve renderizar um elemento de cabeçalho semântico por padrão, permitindo que o consumidor escolha um nível diferente quando a hierarquia da página exigir.
- **FR-010** (US-07) — O componente de link de paginação deve exigir um destino (`href`) real para todo item renderizado.

## Experiência do Usuário

Nenhuma mudança de fluxo ou navegação visível para um usuário sem tecnologia assistiva além do indicador de foco (FR-003), que passa a usar uma técnica de "anel duplo" (contorno escuro com um respiro na cor de fundo) em vez do anel verde translúcido atual — validada visualmente com o usuário via mockup comparativo (ver spec, seção Especificação Visual, e `specs/mockups/acessibilidade-frontend-visual.md`). O skip-link (FR-004) fica invisível fora do foco de teclado, sem alterar o layout percebido por mouse/toque. As demais mudanças (rótulos, `aria-label`, `aria-hidden`, `font-size` relativo) são transparentes visualmente — perceptíveis apenas por tecnologia assistiva ou por preferências de acessibilidade do navegador/SO.

## Restrições Técnicas de Alto Nível

Características arquiteturais priorizadas (herdadas do design spec, `Características Arquiteturais`):

| Característica | Critério mensurável |
|---|---|
| Acessibilidade | As 59 ocorrências auditadas fecham por correção ou viram risco aceito explícito; nenhum achado sem dono |
| Consistência | Padrão de indicador de obrigatoriedade e de foco idêntico em todos os formulários/controles após a migração |
| Manutenibilidade | Um novo campo de formulário criado com `FormField`/`FieldShell` herda conformidade sem trabalho extra |

- Nenhuma mudança de contrato de API ou de lógica de negócio de domínio — escopo é exclusivamente frontend (markup, atributos ARIA, CSS, tipos de props).
- Testes de acessibilidade automatizados existentes (`apps/frontend/e2e/accessibility.spec.ts`, `axe-core`) devem continuar passando e ganham cobertura das rotas afetadas.

## Fora de Escopo

- **`aria-label` obrigatório por tipo em `Button size="icon"`** — avaliado e descartado deliberadamente (ver design spec, D5): forçar isso via TypeScript quebraria compilação em usos hoje corretos apenas por convenção. Fica documentado (JSDoc + `AGENTS.md` de UI) como responsabilidade de revisão de código, não como verificação automática.
- **Símbolo/legenda visível de campo obrigatório (asterisco `*` + "campos obrigatórios")** — decisão visual da feature `contato-acessibilidade` preservada deliberadamente (ver design spec, D6); o traço sutil sem símbolo continua sendo o padrão.
- **Demais 46 critérios da matriz WCAG 2.2** não relacionados a inputs, imagens, botões, foco, skip-link ou `font-size` — fora do escopo desta auditoria (idioma da página, cabeçalhos de página, timeouts de sessão, mídia temporizada, etc.).
- **Verificações de runtime** (contraste renderizado exato, reflow em 320px, medição de alvo de toque no navegador real) — listadas nos relatórios de auditoria como pendências de QA manual, não como requisitos funcionais desta feature.
