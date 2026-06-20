---
created_at: "2026-06-20T12:46:07-03:00"
updated_at: "2026-06-20T12:46:07-03:00"
---

# PRD: Edição de dados de usuários pelo administrador

## Visão Geral

Administradores da plataforma não conseguem editar os dados de usuários: ao clicar em um
usuário na rota `admin/usuarios`, o painel exibe "Você não tem permissão para realizar
esta ação." (HTTP 403). Isso impede tarefas administrativas básicas (corrigir um nome,
atualizar um email, ajustar status ou papel de um usuário).

Esta feature dá aos administradores a capacidade de editar dados de usuários, governada
por uma hierarquia de permissões clara que protege os próprios administradores: um admin
comum não pode alterar dados de outros administradores; o admin root (`admin@admin.com`) é
o único que pode editar todos e alterar papéis (role). Cada usuário continua editando os
próprios dados normalmente.

A feature beneficia administradores (operação diária de gestão) e a segurança da
plataforma (regra de autorização explícita, validada no backend, fechando uma lacuna atual
em que qualquer usuário autenticado pode editar o perfil de outro).

## Objetivos

- Permitir que administradores editem nome, email, status e role de usuários, respeitando
  a matriz de autorização.
- Garantir que **100% das combinações proibidas** da matriz sejam rejeitadas pelo backend
  (HTTP 403), independentemente do comportamento do frontend.
- Centralizar a regra de autorização em **um único ponto** de domínio (sem duplicação
  entre use cases).
- Eliminar a lacuna atual em que um usuário pode editar o perfil de outro sem ser o dono
  nem administrador.
- Não regredir as proteções existentes: super admin imune a alteração de status/role e
  prevenção de auto-rebaixamento.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero editar o nome e o email de um membro para que eu
  possa corrigir cadastros incorretos.
- **US-02** — Como administrador, eu quero alterar o status (ativar/suspender) de um membro
  para que eu possa gerenciar o acesso dele à plataforma.
- **US-03** — Como administrador root, eu quero editar os dados de qualquer usuário,
  incluindo outros administradores, para que eu tenha controle total da gestão de contas.
- **US-04** — Como administrador root, eu quero promover um membro a administrador ou
  rebaixar um administrador para que eu seja o único responsável por definir quem tem
  poderes administrativos.
- **US-05** — Como administrador comum, eu quero ser impedido de editar dados de outros
  administradores para que a hierarquia administrativa seja preservada.
- **US-06** — Como usuário comum, eu quero continuar editando meus próprios dados (nome e
  email) para que eu mantenha meu cadastro atualizado.
- **US-07** — Como administrador, eu quero ver no painel apenas os campos que tenho
  permissão de alterar para um usuário específico para que eu saiba claramente o que posso
  fazer.
- **US-08** — Como qualquer administrador, eu quero que o administrador root (admin@admin)
  nunca tenha seu status ou role alterados por ninguém para que a conta raiz permaneça
  protegida.

## Funcionalidades Principais

### F1. Edição inline de dados de usuário no painel admin

- **O que faz:** torna a aba "Detalhes" do painel de usuário editável (botão "Editar" →
  campos viram inputs → "Salvar"/"Cancelar"), permitindo alterar nome, email, status e
  role conforme a permissão do administrador atual.
- **Por que importa:** entrega a tarefa administrativa central de forma direta, num único
  lugar.
- **Como funciona (alto nível):** o painel decide quais campos exibir como editáveis com
  base na permissão; ao salvar, envia apenas os campos alterados.

Requisitos funcionais:
- **FR-001** O painel deve permitir alternar a aba Detalhes entre modo leitura e modo
  edição. *(US-01, US-07)*
- **FR-002** Em modo edição, o sistema deve apresentar como editáveis somente os campos que
  o administrador atual tem permissão de alterar para aquele usuário-alvo. *(US-05, US-07)*
- **FR-003** Ao salvar, o sistema deve aplicar apenas os campos efetivamente alterados.
  *(US-01, US-02)*
- **FR-004** O sistema deve confirmar o sucesso da edição e atualizar a visualização do
  usuário (lista e painel). *(US-01)*

### F2. Autorização de edição (quem pode editar quem)

- **O que faz:** aplica a matriz de autorização em toda alteração de dados de usuário.
- **Por que importa:** é o coração da feature; protege dados e a hierarquia admin/root.
- **Como funciona (alto nível):** o backend é a fonte da verdade e rejeita qualquer
  alteração que viole a regra, retornando 403.

Requisitos funcionais:
- **FR-005** O sistema deve permitir que um administrador comum edite nome, email e status
  de usuários com papel de membro. *(US-01, US-02)*
- **FR-006** O sistema deve impedir que um administrador comum altere quaisquer dados de
  outro administrador ou do root. *(US-05)*
- **FR-007** O sistema deve permitir que o administrador root edite nome, email, status e
  role de qualquer usuário, incluindo administradores. *(US-03, US-04)*
- **FR-008** O sistema deve permitir alteração de role (promover/rebaixar) exclusivamente
  pelo administrador root. *(US-04)*
- **FR-009** O sistema deve impedir que o status ou o role do administrador root sejam
  alterados por qualquer ator. *(US-08)*
- **FR-010** O sistema deve impedir que qualquer ator (incluindo administradores) edite os
  próprios dados pelo painel admin; a edição dos próprios dados ocorre pelo perfil próprio.
  *(US-06)*
- **FR-011** O sistema deve permitir que um usuário edite o próprio nome e email pelo fluxo
  de perfil próprio. *(US-06)*
- **FR-012** O backend deve rejeitar (HTTP 403) toda alteração que viole a matriz de
  autorização, independentemente do que o frontend apresente. *(US-05, US-08)*

## Experiência do Usuário

1. O administrador acessa `admin/usuarios` e clica em um usuário; o painel abre na aba
   Detalhes.
2. Se o administrador tem permissão de editar aquele usuário, o botão "Editar" aparece; ao
   acioná-lo, os campos permitidos viram inputs.
3. O administrador altera os campos e clica em "Salvar"; em caso de violação de regra (ou
   email inválido/duplicado), uma mensagem clara é exibida inline.
4. Em caso de sucesso, o painel volta ao modo leitura e a lista reflete a mudança.
5. Para usuários sem permissão sobre o alvo, o botão "Editar" não é oferecido / campos
   permanecem somente leitura.
6. Acessibilidade: campos editáveis com rótulos associados, foco visível e mensagens de
   erro associadas aos campos.

## Restrições Técnicas de Alto Nível

Características arquiteturais priorizadas (da spec aprovada), que são as restrições de alto
nível desta PRD:

- **Security / Authorization (prioritária):** o backend é a fonte da verdade; toda
  combinação proibida da matriz deve ser rejeitada (403). Dados pessoais de usuários sob
  LGPD.
- **Maintainability:** a regra de autorização deve existir em exatamente um componente; uso
  dos fluxos de alteração já existentes (sem reescrever lógica testada).
- **Testability:** a regra deve ser verificável sem I/O; conformidade com as fitness /
  dependency rules do projeto.

Demais restrições:
- Autenticação obrigatória (JWT) em todos os fluxos de edição.
- Preservar as proteções existentes do super admin e a prevenção de auto-rebaixamento.

## Fora de Escopo

- Edição em massa (bulk edit) de múltiplos usuários.
- Auto-edição de status ou role pelo próprio usuário no painel admin.
- Novos campos de usuário além de nome, email, status e role.
- Auditoria/log de quem editou o quê (possível feature futura).
- Mudanças no mecanismo de autenticação ou no `RouteGuard`.
