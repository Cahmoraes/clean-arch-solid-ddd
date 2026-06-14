---
created_at: "2026-06-14T11:13:34-03:00"
updated_at: "2026-06-14T11:13:34-03:00"
---

# PRD: Home — Seção de Planos e Contato

## Visão Geral

A página pública inicial (`/`) da plataforma Volt serve como primeiro ponto de contato de potenciais clientes. Atualmente exibe apenas o hero e três cards de features. Este PRD define os requisitos para adicionar duas seções que aumentam a capacidade de conversão e atendimento:

1. **Seção de Planos** — exibe os planos disponíveis (dados do backend) para que o visitante entenda opções e preços sem precisar criar conta.
2. **Seção de Contato** — formulário simples que encaminha mensagens de visitantes para a equipe da Volt via e-mail.

A tela interna de assinatura (`/assinatura`) permanece fora de escopo e sem alterações.

---

## Objetivos

- Permitir que visitantes não autenticados compreendam os planos e preços da Volt antes de se cadastrarem.
- Reduzir a barreira de dúvidas pré-conversão ao oferecer canal de contato direto na página inicial.
- Garantir experiência adequada em dispositivos móveis (viewport ≥ 320px sem scroll horizontal).
- Entregar planos sem loading state visível (HTML pronto no primeiro byte via RSC + ISR).

**Critério de sucesso:** página inicial exibe planos e formulário de contato funcional em desktop e mobile, com e-mail recebido em `contato@volt.com` após submissão válida do formulário.

---

## Histórias de Usuário

- **US-01** — Como visitante não autenticado, eu quero visualizar os planos disponíveis na página inicial para que eu entenda as opções e preços antes de decidir me cadastrar.
- **US-02** — Como visitante não autenticado, eu quero identificar visualmente qual plano oferece melhor custo-benefício para que eu tome uma decisão de compra informada.
- **US-03** — Como visitante não autenticado, eu quero enviar uma mensagem de contato sem precisar criar uma conta para que eu possa tirar dúvidas antes de assinar.
- **US-04** — Como visitante não autenticado, eu quero receber confirmação visual ao enviar o formulário de contato para que eu saiba que minha mensagem foi recebida com sucesso.
- **US-05** — Como visitante não autenticado usando smartphone, eu quero que os planos e o formulário de contato sejam legíveis e utilizáveis no meu dispositivo para que eu possa interagir sem dificuldade.
- **US-06** — Como membro da equipe Volt, eu quero receber as mensagens de contato no e-mail `contato@volt.com` para que eu possa responder dúvidas de potenciais clientes.

---

## Funcionalidades Principais

### 1. Seção de Planos

Exibe abaixo do hero existente os planos disponíveis retornados pelo backend, com layout que destaca o plano de maior valor.

**Requisitos funcionais:**

- **FR-001** — A seção de planos deve exibir todos os planos retornados pelo endpoint `GET /plans`.
- **FR-002** — O plano anual deve ser apresentado como plano hero: card amplo com badge "Melhor valor", nome, preço formatado, tagline e lista de features com ícone de confirmação, seguido de CTA primário.
- **FR-003** — O plano mensal deve ser apresentado como plano secundário: linha compacta com nome, preço e CTA outline, posicionado abaixo do card hero.
- **FR-004** — Os planos devem ser renderizados pelo servidor; o visitante não deve ver estado de carregamento (spinner) ao acessar a página.
- **FR-005** — Se a busca de planos do backend falhar, a seção deve exibir planos de fallback predefinidos sem expor mensagem de erro ao visitante.
- **FR-006** — Cada plano deve exibir: nome, preço formatado (ex.: "R$ 479,00/ano"), tagline e lista de features.
- **FR-007** — O CTA de cada plano deve direcionar o visitante para a rota de cadastro (`/cadastro`).

### 2. Seção de Contato

Exibe abaixo da seção de planos um formulário de contato com layout de duas colunas em desktop (informações à esquerda, formulário à direita) e coluna única em mobile.

**Requisitos funcionais:**

- **FR-008** — A seção de contato deve ser exibida imediatamente abaixo da seção de planos na página inicial.
- **FR-009** — O formulário deve conter exatamente três campos: nome (texto, obrigatório), e-mail (email, obrigatório), mensagem (textarea, obrigatório).
- **FR-010** — O campo e-mail deve ser validado no cliente para formato de e-mail válido antes do envio ao backend.
- **FR-011** — Durante o envio, o botão de submissão deve exibir estado de carregamento (desabilitado + indicador visual) para evitar duplo envio.
- **FR-012** — Após envio bem-sucedido, deve ser exibido toast de confirmação e todos os campos do formulário devem ser redefinidos para o estado inicial.
- **FR-013** — Em caso de falha no envio, deve ser exibida mensagem de erro inline no formulário; o erro não deve ser silenciado.
- **FR-014** — O backend deve encaminhar o conteúdo do formulário (nome, e-mail, mensagem) para `contato@volt.com` via nodemailer.
- **FR-015** — O backend deve validar o payload recebido e retornar HTTP 400 para dados ausentes ou inválidos.

### 3. Responsividade

**Requisitos funcionais:**

- **FR-016** — Em viewports abaixo de `md` (< 768px), os cards de planos devem ser empilhados verticalmente (hero acima, secundário abaixo).
- **FR-017** — Em viewports abaixo de `md` (< 768px), a seção de contato deve exibir informações e formulário em coluna única.
- **FR-018** — A página inicial não deve apresentar scroll horizontal em nenhum viewport ≥ 320px.

---

## Experiência do Usuário

### Jornada principal — visitante visualiza planos

1. Visitante acessa `/` e rola a página após o hero.
2. Vê a seção de planos com o plano anual em destaque (badge "Melhor valor", card amplo com preço e features).
3. Vê o plano mensal compacto abaixo com opção de assinar.
4. Clica em qualquer CTA e é direcionado para `/cadastro`.

### Jornada principal — visitante envia contato

1. Visitante rola até a seção de contato abaixo dos planos.
2. Preenche nome, e-mail e mensagem.
3. Clica em "Enviar mensagem"; o botão entra em estado de loading.
4. Vê toast de sucesso e os campos são limpos — ou vê mensagem de erro inline se o envio falhar.

### Considerações de UX

- Não há autenticação necessária para nenhuma das duas seções.
- O formulário não armazena dados — apenas transmite via e-mail.
- Em mobile, o conteúdo informativo da seção de contato (texto e e-mail `contato@volt.com`) aparece antes do formulário para contextualizar o visitante.

---

## Restrições Técnicas de Alto Nível

| Restrição | Origem |
|---|---|
| Planos renderizados sem loading state — HTML pronto no primeiro byte | Característica priorizada: Performance |
| Layout responsivo sem scroll horizontal em viewport ≥ 320px | Característica priorizada: Responsividade |
| Componentes da home independentes da tela interna `/assinatura` | Característica priorizada: Maintainability (Decisão D3) |
| E-mail de contato enviado via nodemailer com retry automático (3×) | Característica priorizada: Reliability |
| Dados do formulário não persistidos em banco — apenas transmitidos por e-mail | Compliance LGPD |
| Backend valida payload antes de processar envio | Segurança — prevenção de relay abuse |
| Integração com backend existente: `GET /plans` e `POST /contact` (endpoints novos) | Integração obrigatória |

---

## Fora de Escopo

- Alterações na tela interna de assinatura (`/assinatura`) ou no componente de planos existente nela.
- Integração direta com Stripe Products API para busca dinâmica de planos (planejada como evolução de D2 — atualmente backend expõe DEMO_PLANS).
- Armazenamento das mensagens de contato em banco de dados.
- Sistema de tickets ou CRM para gerenciar mensagens recebidas.
- Autenticação ou CAPTCHA no formulário de contato.
- Internacionalização (i18n) ou suporte a múltiplos idiomas.
- Página de contato separada (`/contato`) — o formulário fica na home pública.
- Notificação de confirmação por e-mail para quem enviou o formulário.
