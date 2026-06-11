# PRD - Frontend Web App (GymPass-like)

## Visão Geral

O backend deste monorepo (Clean Architecture + DDD) já expõe uma API HTTP completa e documentada via OpenAPI 3.0 cobrindo autenticação, gestão de usuários, academias, check-ins e assinaturas. Atualmente, porém, **não existe interface de usuário** que consuma essas funcionalidades — `apps/frontend` contém apenas um Next.js recém-instalado, sem rotas nem telas.

Esta PRD define os requisitos de uma **aplicação web responsiva** que cobre 100% das rotas funcionais do backend, permitindo que membros (clientes finais), administradores e visitantes não autenticados utilizem o produto através de uma interface visual coerente, acessível e fiel ao design system descrito em `apps/frontend/DESIGN.md` (estética minimalista inspirada em Ollama).

O valor entregue é tornar o backend efetivamente utilizável por usuários humanos, fechando o ciclo produto e habilitando demonstrações, testes de aceitação e evolução guiada por feedback de uso real.

## Objetivos

- **Cobertura funcional**: 100% das rotas do backend (17 endpoints funcionais, excluindo `/health-check` e o webhook Stripe) acessíveis através de telas do frontend.
- **Fidelidade visual**: aderência estrita ao `DESIGN.md` (paleta monocromática, SF Pro Rounded, geometria pill-shaped, zero gradientes, zero cores cromáticas exceto foco de teclado).
- **Suporte multidispositivo**: experiência funcional e legível em viewports de 320px (mobile) a 1920px (desktop).
- **Onboarding mensurável**: visitante consegue se cadastrar, ativar a conta, autenticar e realizar o primeiro check-in sem ajuda externa.
- **Segurança de sessão**: tokens de autenticação são renovados de forma transparente; usuário não é deslogado abruptamente durante uso ativo.
- **Acessibilidade básica**: navegação por teclado, foco visível, marcação semântica e textos alternativos em imagens significativas.

## Histórias de Usuário

### Visitante não autenticado

- Como visitante, quero ver uma **landing page** que explique o produto para que eu decida se vale a pena me cadastrar.
- Como visitante, quero **me cadastrar** com nome, e-mail e senha para criar minha conta.
- Como visitante, quero **ativar minha conta** através de um link/token recebido para concluir o cadastro.
- Como visitante, quero **fazer login** com e-mail e senha para acessar a área autenticada.
- Como visitante que esqueceu a senha, quero **alterar minha senha** para recuperar o acesso.

### Membro (cliente final autenticado)

- Como membro, quero ver e **editar meu perfil** para manter meus dados atualizados.
- Como membro, quero **alterar minha senha** quando autenticado para reforçar minha segurança.
- Como membro, quero **buscar academias por nome** para encontrar onde treinar.
- Como membro, quero ver **detalhes de uma academia** (nome, descrição, telefone, localização) para decidir se quero ir.
- Como membro, quero **realizar check-in** em uma academia para registrar minha presença.
- Como membro, quero ver meu **histórico de check-ins** para acompanhar minha frequência.
- Como membro, quero ver **métricas pessoais** (ex: total de check-ins do mês) para medir minha consistência.
- Como membro, quero **assinar o plano premium** (fluxo Stripe fictício, sem cobrança real) para experimentar a funcionalidade.
- Como membro, quero **sair da minha conta** para proteger minha sessão em dispositivos compartilhados.
- Como membro ativo, quero que minha sessão **se renove automaticamente** para que eu não seja deslogado durante o uso.

### Administrador

- Como admin, quero **listar todos os usuários** para fins de moderação e suporte.
- Como admin, quero **cadastrar uma nova academia** para expandir a oferta na plataforma.
- Como admin, quero **validar um check-in** pendente para confirmar a presença de um membro.

## Funcionalidades Principais

### F1. Autenticação e gestão de sessão

**O que faz**: cadastro, ativação, login, logout, alteração de senha e renovação transparente de token.
**Por que importa**: porta de entrada do produto; sem isso, nenhuma funcionalidade autenticada é acessível.

**Requisitos funcionais:**

1. RF-01: A aplicação deve oferecer tela pública de **cadastro** com campos nome, e-mail e senha, com validação de formato e força mínima de senha alinhada ao backend.
2. RF-02: A aplicação deve oferecer tela/fluxo de **ativação de conta** que aceite o token e exiba feedback de sucesso ou erro.
3. RF-03: A aplicação deve oferecer tela pública de **login** (e-mail + senha) com mensagens claras de erro para credenciais inválidas.
4. RF-04: A aplicação deve oferecer ação de **logout** disponível em qualquer tela autenticada.
5. RF-05: A aplicação deve oferecer tela autenticada de **alteração de senha** (senha atual + nova senha + confirmação).
6. RF-06: A sessão deve ser **renovada automaticamente** antes da expiração do access token, sem intervenção do usuário.
7. RF-07: Em caso de falha definitiva de autenticação (refresh inválido), o usuário deve ser redirecionado à tela de login com mensagem informativa.
8. RF-08: Rotas autenticadas não devem ser acessíveis a visitantes; tentativas devem redirecionar para login.

### F2. Perfil e métricas do usuário

**O que faz**: exibe dados do usuário autenticado e suas métricas de uso.
**Por que importa**: cria senso de progresso e personalização.

**Requisitos funcionais:**

9. RF-09: A aplicação deve exibir o **perfil do usuário autenticado** (`/users/me`) com seus dados principais.
10. RF-10: A aplicação deve permitir **editar** os dados editáveis do perfil suportados pelo backend.
11. RF-11: A aplicação deve exibir as **métricas pessoais** retornadas por `/users/me/metrics` (ex: total de check-ins).
12. RF-12: A aplicação deve permitir consultar o **perfil público de outro usuário** por ID quando essa navegação for relevante (ex: a partir de um check-in administrativo).

### F3. Academias

**O que faz**: busca, visualização e cadastro de academias.
**Por que importa**: define onde os check-ins ocorrem; é o catálogo central do produto.

**Requisitos funcionais:**

13. RF-13: A aplicação deve oferecer tela de **busca de academias por nome** com listagem paginada dos resultados.
14. RF-14: A aplicação deve exibir uma **tela de detalhes** de academia com todos os dados retornados pelo backend.
15. RF-15: A aplicação deve oferecer tela de **cadastro de academia** acessível apenas a administradores.

### F4. Check-ins

**O que faz**: criação, listagem e validação de check-ins.
**Por que importa**: é a ação principal de valor do produto.

**Requisitos funcionais:**

16. RF-16: A aplicação deve permitir ao membro **realizar um check-in** em uma academia listada/detalhada.
17. RF-17: A aplicação deve exibir o **histórico de check-ins do usuário autenticado** com paginação.
18. RF-18: A aplicação deve permitir ao admin **validar um check-in** existente, exibindo confirmação visual do resultado.

### F5. Assinatura (Stripe fictício)

**O que faz**: inicia um fluxo de assinatura Stripe em modo de demonstração (sem cobrança real).
**Por que importa**: exercita o endpoint disponível e prepara a UX do upgrade futuro.

**Requisitos funcionais:**

19. RF-19: A aplicação deve oferecer tela de **assinatura premium** que dispare a criação da subscription Stripe e exiba o resultado retornado.
20. RF-20: A tela deve **comunicar de forma clara que se trata de um fluxo demonstrativo**, sem cobrança real.

### F6. Administração

**O que faz**: área restrita a administradores.
**Por que importa**: viabiliza moderação e expansão de catálogo.

**Requisitos funcionais:**

21. RF-21: A aplicação deve oferecer um **dashboard administrativo** com listagem paginada de usuários (`GET /users`).
22. RF-22: Funcionalidades administrativas (cadastrar academia, validar check-in, listar usuários) devem ser **visíveis e acessíveis apenas a usuários com perfil ADMIN**.

### F7. Tratamento de erros e feedback

**O que faz**: garante que todo estado (carregando, vazio, erro, sucesso) seja comunicado.
**Por que importa**: define a percepção de qualidade do produto.

**Requisitos funcionais:**

23. RF-23: Toda operação assíncrona deve exibir estado de **carregamento** visível.
24. RF-24: Toda falha de rede ou erro do backend deve ser apresentada ao usuário em **linguagem clara**, evitando jargão técnico.
25. RF-25: Toda lista deve ter um **estado vazio** explicitando ausência de dados e, quando aplicável, próxima ação sugerida.

## Experiência do Usuário

### Personas e necessidades

- **Visitante**: precisa de clareza sobre o produto e baixo atrito para se cadastrar.
- **Membro**: precisa de fluxo curto entre abrir o app, buscar academia e fazer check-in.
- **Admin**: precisa de listas eficientes e ações de validação rápidas.

### Fluxos principais

1. **Onboarding**: Landing → Cadastro → Ativação → Login → Tela inicial autenticada.
2. **Check-in**: Login → Buscar academia → Detalhes → Confirmar check-in → Confirmação visual.
3. **Acompanhamento**: Login → Perfil/Métricas → Histórico de check-ins.
4. **Administração**: Login (admin) → Dashboard → (Listar usuários | Cadastrar academia | Validar check-in).

### UI/UX

- **Aderência estrita ao `DESIGN.md`**: paleta exclusivamente em escala de cinza, SF Pro Rounded para títulos, sistema binário de border-radius (12px containers / 9999px elementos interativos), zero sombras, zero gradientes, zero cores cromáticas (exceto o anel azul de foco do Tailwind para acessibilidade de teclado).
- **Layout responsivo** funcional de 320px a 1920px, com navegação adaptada para mobile (ex: menu colapsável) e desktop.
- **Hierarquia tipográfica** conforme tabela de tipografia do `DESIGN.md`.
- **Estados visuais** consistentes para loading, vazio, erro e sucesso em todas as telas.

### Acessibilidade

- Foco de teclado **sempre visível** (anel azul nativo do Tailwind preservado).
- Marcação **semântica** (headings hierárquicos, `<button>` para ações, `<a>` para navegação, `<form>`/`<label>` em formulários).
- **Texto alternativo** em imagens significativas; imagens decorativas marcadas como tal.
- Contraste de cor adequado entre texto e fundo dentro da paleta monocromática definida.

## Restrições Técnicas de Alto Nível

- **Integração obrigatória** com a API do backend descrita em `apps/backend/docs/openapi-spec.json`.
- **Reuso obrigatório** dos tipos gerados disponibilizados em `packages/api-types` para garantir consistência de contrato entre frontend e backend.
- **Plataforma já decidida**: Next.js (já instalado em `apps/frontend`).
- **Monorepo turbo**: o frontend deve respeitar a estrutura e scripts do Turborepo existente.
- A **estratégia de autenticação** (cookies httpOnly vs tokens em memória vs híbrido) e a **estratégia de renderização** (SSR/CSR/híbrido) ficam a cargo da Tech Spec, desde que cumpram RF-06 a RF-08.
- O fluxo Stripe utilizará apenas o endpoint `POST /subscriptions` já existente; **não há integração com Stripe Checkout/Elements em produção**.

## Fora de Escopo

- **Pagamentos reais via Stripe**: o fluxo de assinatura é demonstrativo (fictício), conforme implementado no backend.
- **PWA / instalação como app**.
- **Internacionalização (i18n)**: a aplicação será entregue em um único idioma.
- **Notificações push** (web push, mobile push).
- **Mapa interativo** de academias (apenas busca textual e listagem).
- **Modo escuro (dark mode)**: a paleta do `DESIGN.md` é monocromática clara por definição.
- **Webhook Stripe (`/webhook/stripe`)**: endpoint server-to-server, não consumido pelo frontend.
- **`/health-check`**: endpoint operacional, não exposto na UI.
- **App nativo mobile** (iOS/Android): apenas web responsivo.
- **Recuperação de senha por e-mail (forgot password)** com envio de e-mail real: o backend expõe `change-password` (autenticado) e `activate` (por token), mas não há endpoint de "esqueci minha senha" não autenticado — esse fluxo está fora desta entrega.
- **Decisões de implementação técnica** (biblioteca de formulários, fetch client, gestão de estado, estratégia de cache, testes E2E) — pertencem à Tech Spec.
