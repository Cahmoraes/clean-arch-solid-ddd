---
created_at: "2026-06-20T12:43:50-03:00"
updated_at: "2026-06-20T12:43:50-03:00"
---

# Design: Edição de dados de usuários pelo administrador

## Visão Geral

Hoje, ao clicar em um usuário na rota `admin/usuarios` para editar, o painel exibe
"Você não tem permissão para realizar esta ação." (HTTP 403). A aba **Detalhes** do
`UserDetailPanel` é somente leitura e não existe fluxo de edição de dados de um usuário
por um administrador.

Esta feature adiciona a capacidade de administradores editarem dados de usuários,
governada por uma regra de autorização explícita:

- **Cada usuário** edita os próprios dados (nome/email), como já ocorre via perfil próprio.
- **Admin comum** edita nome/email/status de **membros** (`MEMBER`), mas **não** edita
  outros administradores nem o root.
- **Admin root** (`admin@admin.com`, `isSuperAdmin = true`) edita **todos** — usuários e
  administradores — e é o **único** que pode alterar **role** (promover/rebaixar).
- O **super admin** (root) é imune a alterações de status/role por qualquer ator.

A feature também aproveita para fechar um bug latente: o use case `UpdateUserProfile`
(`PATCH /users/:userId`) hoje só exige `isProtected: true`, sem owner-check — qualquer
usuário autenticado pode editar o perfil de qualquer outro. A autorização passa a ser
centralizada e a fonte da verdade é o backend.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Security / Authorization | Regra "quem-edita-quem" é o cerne; protege dados de usuários e a hierarquia admin/root (LGPD) | Backend rejeita (403) toda combinação proibida da matriz, independentemente do frontend; teste unitário cobre cada célula |
| Maintainability | Regra precisa viver em um único lugar e reusar use cases já testados | A regra de autorização existe em exatamente 1 componente de domínio; nenhum use case duplica a checagem |
| Testability | Policy isolável e aderente às fitness/dependency rules | `UserManagementPolicy` testável sem I/O; `pnpm test:run` e `fit:validate-dependencies` passam |

**Consideradas, não priorizadas:** scalability (volume atual de admins não justifica),
performance (operação pontual, não hot-path), i18n (sem expansão prevista).

## Matriz de Autorização

| Ator → Alvo | Nome/Email | Status (suspend/activate) | Role (promote/demote) |
|---|---|---|---|
| Usuário comum → ele mesmo | ✅ (perfil próprio, já existe) | ❌ | ❌ |
| Admin comum → MEMBER | ✅ | ✅ | ❌ |
| Admin comum → ADMIN / root | ❌ | ❌ | ❌ |
| Root (admin@admin) → qualquer | ✅ | ✅ | ✅ |
| Qualquer ator → super admin (status/role) | — | ❌ (imune) | ❌ (imune) |

**Decisões de borda:**

- **Ninguém edita a si mesmo pelo painel admin.** A auto-edição de nome/email continua
  pelo perfil próprio (`EditProfileModal`). Evita auto-suspensão e auto-rebaixamento e
  mantém a regra simples.
- **Self-edit do perfil próprio permanece permitido** fora do painel: a policy autoriza
  explicitamente um usuário a editar o próprio nome/email, garantindo que a correção do
  bug do `UpdateUserProfile` não quebre o fluxo de perfil.

## Componentes Lógicos

### `UserManagementPolicy` (domínio)

- **Responsabilidade:** decidir se um `requester` pode alterar cada aspecto (perfil,
  status, role) de um usuário-alvo.
- **Predicados:**
  - `canEditProfile(requester, target)` — nome/email
  - `canChangeStatus(requester, target)` — suspend/activate
  - `canChangeRole(requester, target)` — promote/demote (root-only)
- **Depende de:** entidade `User` (role, `isSuperAdmin`, id). Sem I/O, sem repositório.
- **Quem depende dela:** os use cases de gestão de usuário. Alta estabilidade (fan-in
  alto, fan-out zero) — ponto único de mudança da regra.

### Camada de aplicação (use cases existentes — reuso)

`UpdateUserProfile`, `SuspendUser`, `ActivateUser`, `PromoteToAdmin`, `DemoteFromAdmin`
passam a receber o `requesterId`, carregar o `target` e consultar a
`UserManagementPolicy` antes de agir; lançam erro de autorização (403) quando a regra é
violada. As proteções já existentes (super admin imune, anti self-demotion) são mantidas.

### Camada de infraestrutura / controllers

Controllers extraem o `requester` do JWT (já disponível via `JwtRouteGuard`) e o repassam
aos use cases. Nenhuma mudança no `RouteGuard`/`RoutePolicy` — a regra de domínio depende
do estado do alvo e não pertence à camada de transporte.

### Frontend

- Aba **Detalhes** do `UserDetailPanel` ganha **modo edição inline** (botão "Editar" →
  campos viram inputs → "Salvar"/"Cancelar"), conforme layout aprovado (Opção A).
- O form orquestra as mutations existentes (`use-update-profile`, `use-suspend-user`,
  `use-activate-user`, `use-promote-to-admin`, `use-demote-from-admin`), disparando apenas
  os campos alterados.
- `resolvePermissions()` é estendido para refletir a matriz: decide se o botão "Editar"
  aparece e quais campos (status, role) ficam editáveis para o ator atual.

## Fluxo de Dados

1. Admin clica em um usuário → `UserDetailPanel` abre na aba **Detalhes**.
2. `resolvePermissions()` decide se "Editar" aparece e quais campos são editáveis.
3. Admin clica "Editar" → campos viram inputs (somente os permitidos).
4. "Salvar" → o form dispara as mutations necessárias (só o que mudou).
5. Backend: cada use case consulta a `UserManagementPolicy` (fonte da verdade) → 403 se
   a regra for violada.
6. Sucesso → invalida as queries (`ADMIN_USERS_QUERY_KEY`, `USER_STATS_QUERY_KEY`) →
   painel volta a somente leitura.

## Decisões Arquiteturais

### D1. Policy de domínio única em vez de validação inline ou no RouteGuard

- **Contexto:** A regra "admin edita membro, root edita todos, role só root, super admin
  imune" precisa ser aplicada por ~5 use cases. Alternativas: (A) policy de domínio
  única, (B) validação inline por use case, (C) enriquecer o `RouteGuard`/`RoutePolicy`.
- **Decisão:** Policy de domínio única (`UserManagementPolicy`), consultada pelos use cases.
- **Justificativa técnica:** A regra depende do estado do alvo (é admin? é root?), que é
  domínio — não cabe no transporte (C). Inline (B) duplicaria a regra em ~5 lugares e
  divergiria. Uma policy isolável centraliza e é testável unitariamente.
- **Justificativa de negócio:** Reduz custo de manutenção e risco de inconsistência de
  segurança; fecha o bug do `UpdateUserProfile` de uma vez.
- **Trade-offs aceitos:** É preciso refatorar as assinaturas dos use cases para receber o
  `requesterId` e carregar o `target`; introduz uma nova abstração de domínio.

### D2. Role passa a ser root-only (era admin-only)

- **Contexto:** Hoje `promote`/`demote` são `onlyAdmin` (qualquer admin). A feature inclui
  role no escopo editável; permitir admin comum mexer em role contradiz "admin não mexe em
  admin".
- **Decisão:** Alteração de role (promover/rebaixar) é exclusiva do root.
- **Justificativa técnica/negócio:** Consistência da hierarquia — só o root cria ou remove
  administradores; admin comum não pode criar um admin que depois não conseguiria editar.
- **Trade-offs aceitos:** Mudança de comportamento e de contrato; quebra testes que
  assumiam promote/demote por qualquer admin (atualizados como parte da feature).

### D3. Reuso dos use cases existentes em vez de um único `UpdateUser`

- **Contexto:** O form unificado poderia mapear para um único use case que altera tudo.
- **Decisão:** O form (UI) orquestra os use cases existentes; cada um mantém sua própria
  responsabilidade e proteções.
- **Justificativa:** Preserva proteções e testes já existentes (super admin imune, anti
  self-demotion); menor risco que reimplementar tudo num use case novo.
- **Trade-offs aceitos:** A coesão "uma ação = uma chamada" fica na UI, não no backend;
  salvar várias mudanças pode disparar mais de uma chamada.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Mudança de contrato em promote/demote/suspend/activate quebra testes e consumidores | 3 | 3 | 9 🔴 | Atualizar testes de use case/controller e de `resolvePermissions`; revisar chamadas do frontend |
| Correção do owner-check no `UpdateUserProfile` quebrar o fluxo de perfil próprio | 3 | 2 | 6 🔴 | Policy autoriza explicitamente self-edit de nome/email; teste cobrindo o caminho do perfil |
| Regra divergir entre frontend e backend | 2 | 2 | 4 🟡 | Backend é a fonte da verdade (403 real); frontend só UX; testes nos dois lados |
| `requesterId` não propagado corretamente do controller ao use case | 3 | 1 | 3 🟡 | Extrair do JWT no controller; teste de integração HTTP por rota |

## Tratamento de Erros

- Violação da regra → erro de autorização de domínio mapeado para **HTTP 403** pelo
  controller; frontend mantém o mapeamento existente em `lib/errors.ts`
  ("Você não tem permissão para realizar esta ação.").
- Tentativa de alterar status/role do super admin → erro específico já existente
  (`UserIsSuperAdminError`) preservado.
- Email duplicado / inválido ao editar → validação de domínio existente do `User`,
  exibida inline no form.

## Testes

- **Unitários** `UserManagementPolicy`: uma asserção por célula da matriz de autorização
  (incluindo imunidade do super admin e self-edit do perfil próprio).
- **Unitários** use cases: cada um rejeita quando a policy nega; mantém proteções
  existentes.
- **Integração HTTP** (`*.business-flow-test.ts`): admin comum recebe 403 ao editar admin;
  root edita admin com sucesso; admin comum edita membro com sucesso; role só root.
- **Frontend**: `resolvePermissions` cobre a matriz; teste do modo edição da aba Detalhes
  (campos editáveis conforme permissão, dispatch só do que mudou).

## Fora de Escopo

- Edição em massa (bulk edit) de múltiplos usuários.
- Auto-edição de status/role pelo próprio usuário no painel.
- Novos campos de usuário além de nome, email, status e role.
- Auditoria/log de quem editou o quê (pode virar feature futura).
