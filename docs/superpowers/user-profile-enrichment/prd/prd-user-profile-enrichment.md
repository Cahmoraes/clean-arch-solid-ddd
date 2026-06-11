---
created_at: "2026-05-20T19:47:06-03:00"
updated_at: "2026-05-20T19:47:06-03:00"
---

# PRD: Enriquecimento do Perfil do Usuário

## Visão Geral

A tela `/perfil` atualmente exibe apenas nome, e-mail, ID e total de check-ins. Isso não oferece contexto suficiente para que o usuário entenda sua situação na plataforma nem para manter seus dados atualizados. Esta feature expõe informações já disponíveis no backend (data de cadastro e status da conta) e adiciona a capacidade de editar o nome via modal — entregando uma experiência de perfil mais completa e funcional sem alterações no esquema do banco de dados.

## Objetivos

- Exibir todos os dados relevantes do usuário já presentes no backend na tela `/perfil`
- Permitir que o usuário atualize seu nome diretamente na página de perfil
- Centralizar o acesso às ações de conta (edição de nome e gerenciamento de senha) em um único ponto de entrada (modal "Editar perfil")
- Zero regressões nas funcionalidades existentes (badge de admin, link de senha, métricas)

## Histórias de Usuário

- **US-001** — Como usuário autenticado, eu quero ver minha data de cadastro na página de perfil para saber há quanto tempo tenho conta na plataforma.
- **US-002** — Como usuário autenticado, eu quero ver o status da minha conta em destaque para entender imediatamente se ela está ativa, inativa ou suspensa.
- **US-003** — Como usuário autenticado, eu quero ver meu total de check-ins em evidência para acompanhar meu engajamento com a plataforma.
- **US-004** — Como usuário autenticado, eu quero editar meu nome na página de perfil para manter minhas informações pessoais atualizadas.
- **US-005** — Como usuário autenticado, eu quero acessar a troca de senha a partir do modal de edição de perfil para centralizar as ações de conta num único lugar.

## Funcionalidades Principais

### F-1: Exibição de dados enriquecidos

Redesenho da tela `/perfil` com layout de cartão compacto exibindo todas as informações relevantes do usuário num único componente.

**Requisitos funcionais:**

- **RF-001** — A tela `/perfil` deve exibir: nome, e-mail, ID (truncado), status da conta (badge colorido), data de cadastro (formatada em pt-BR) e total de check-ins.
- **RF-002** — O status deve ser representado visualmente: `ACTIVE` = "Ativo" (verde), `INACTIVE` = "Inativo" (cinza), `SUSPENDED` = "Suspenso" (vermelho).
- **RF-003** — O avatar deve exibir as iniciais geradas a partir do nome do usuário (ex.: "João da Silva" → "JD").
- **RF-004** — O badge de role (Admin/Membro) deve permanecer visível no cabeçalho do cartão, conforme comportamento já existente.
- **RF-005** — O endpoint `GET /users/me` deve retornar os campos `createdAt` (ISO 8601) e `status` além dos campos já existentes.

### F-2: Modal de edição de perfil

Ao clicar em "Editar perfil", um modal é aberto permitindo atualizar o nome e acessar o gerenciamento de senha.

**Requisitos funcionais:**

- **RF-006** — A tela `/perfil` deve exibir um botão "Editar perfil" que abre um modal de edição.
- **RF-007** — O modal deve conter um campo de texto para o nome, pré-populado com o valor atual, com validação mínima de 2 caracteres.
- **RF-008** — O modal deve exibir um item de acesso à senha com label dinâmico: "Definir senha" se `hasPassword === false`, "Alterar senha" se `hasPassword === true`. O clique navega para `/perfil/senha`.
- **RF-009** — Ao salvar com sucesso, o modal deve fechar e a tela deve refletir o nome atualizado imediatamente, sem necessidade de reload.
- **RF-010** — O endpoint `PATCH /users/me` deve aceitar `{ name: string }` e retornar o nome atualizado. Deve retornar erro 404 se o usuário não for encontrado.

## Experiência do Usuário

**Fluxo principal — visualização:**
1. Usuário acessa `/perfil`
2. Cartão carrega com skeleton enquanto os dados são buscados
3. Exibe: avatar com iniciais, nome, e-mail, badges de role e status, grid com ID / data de cadastro / check-ins
4. Botão "Editar perfil" visível no rodapé do cartão

**Fluxo principal — edição de nome:**
1. Usuário clica em "Editar perfil"
2. Modal abre com campo nome pré-preenchido e item de acesso à senha
3. Usuário edita o nome e clica em "Salvar"
4. Botão "Salvar" entra em estado de loading durante a requisição
5. Em sucesso: modal fecha, nome atualizado aparece no cartão sem reload
6. Em erro: mensagem de erro exibida no modal, campo mantém foco

**Acessibilidade:**
- Contraste de cores adequado para badges de status
- Modal com foco gerenciado (focus trap) e fechável via tecla Esc
- Botão "Salvar" desabilitado durante loading para evitar dupla submissão

## Restrições Técnicas de Alto Nível

- Nenhuma alteração no esquema do banco de dados (sem migrations)
- Os campos `createdAt` e `status` já existem na entidade `User` e na tabela Prisma — apenas precisam ser expostos na API
- Os tipos compartilhados (`@repo/api-types`) devem ser regenerados após as mudanças no backend via `pnpm generate:types`
- A autenticação do endpoint `PATCH /users/me` segue o padrão JWT já existente no projeto

## Fora de Escopo

- Upload ou alteração de foto de perfil
- Adição de novos campos ao banco (telefone, endereço, bio, etc.)
- Edição de e-mail ou role
- Enriquecimento da tela pública `/perfil/[userId]`
- Notificações ou confirmação por e-mail ao alterar o nome
