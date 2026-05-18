---
created_at: "2026-05-18T12:36:47-03:00"
updated_at: "2026-05-18T12:36:47-03:00"
---

# PRD: Admin Role Management

## Visão Geral

Administradores do sistema precisam conseguir promover usuários comuns ao papel de administrador e revogar privilégios de administradores existentes, sem depender de intervenção técnica direta no banco de dados. Atualmente, o único administrador é `admin@admin.com`, definido no sistema de forma fixa. Esta feature expõe essas ações diretamente no painel de gerenciamento de usuários (`/admin/usuarios`), tornando o controle de acesso autogestionável por qualquer administrador autorizado.

## Objetivos

- Permitir que administradores promovam membros ativos a administradores sem intervenção técnica
- Permitir que administradores removam privilégios de outros administradores (exceto o admin raiz)
- Garantir que as regras de proteção (usuário inativo, auto-demoção, admin raiz) sejam aplicadas tanto na interface quanto no backend
- Zero erros silenciosos: qualquer tentativa inválida deve retornar mensagem clara ao operador

## Histórias de Usuário

**US-01 — Promover membro a administrador**
Como administrador, eu quero promover um membro ativo a administrador para que ele passe a ter acesso ao painel administrativo sem precisar de suporte técnico.

**US-02 — Remover privilégios de administrador**
Como administrador, eu quero revogar os privilégios de outro administrador para que ele volte a ser membro comum quando não precisar mais de acesso elevado.

**US-03 — Proteção contra ações inválidas**
Como administrador, eu quero ser impedido de realizar ações inválidas (promover usuário inativo, me auto-demover, operar sobre o admin raiz) para que o sistema mantenha sua integridade de acesso.

**US-04 — Feedback claro de confirmação**
Como administrador, eu quero confirmar explicitamente antes de promover ou revogar privilégios para que eu não execute ações acidentais irreversíveis no curto prazo.

## Funcionalidades Principais

### F-01: Promoção a Administrador

Permite que um administrador eleve um usuário membro ativo ao papel de administrador.

**Requisitos Funcionais:**

- **RF-001** — Um administrador autenticado pode promover um usuário com status `ativo` e role `MEMBER` ao papel `ADMIN`
- **RF-002** — A ação de promoção deve exigir confirmação explícita do operador antes de ser executada
- **RF-003** — Após confirmação, a mudança de role deve ser persistida e refletida imediatamente na interface (badge e botões do modal atualizados)
- **RF-004** — Não é possível promover um usuário com status `inativo/suspenso` — a opção não deve ser exibida e o backend deve rejeitar a tentativa
- **RF-005** — Não é possível promover um usuário que já possui role `ADMIN`
- **RF-006** — Não é possível promover o usuário `admin@admin.com` (admin raiz protegido)
- **RF-007** — Apenas usuários com role `ADMIN` podem executar esta ação; tentativas por `MEMBER` devem ser rejeitadas com erro de autorização

---

### F-02: Remoção de Privilégios de Administrador

Permite que um administrador revogue os privilégios de outro administrador, retornando-o ao papel de membro.

**Requisitos Funcionais:**

- **RF-008** — Um administrador autenticado pode revogar os privilégios de outro usuário com role `ADMIN`
- **RF-009** — A ação de remoção deve exigir confirmação explícita do operador antes de ser executada
- **RF-010** — Após confirmação, a mudança de role deve ser persistida e refletida imediatamente na interface
- **RF-011** — Um administrador não pode revogar seus próprios privilégios (auto-demoção proibida) — a opção não deve ser exibida para o próprio usuário logado
- **RF-012** — O usuário `admin@admin.com` (admin raiz) não pode ter seus privilégios revogados por nenhuma ação na interface ou API
- **RF-013** — Apenas usuários com role `ADMIN` podem executar esta ação

---

### F-03: Visibilidade Contextual no Modal

O modal de detalhes do usuário exibe as ações disponíveis de acordo com o estado do usuário visualizado.

**Requisitos Funcionais:**

- **RF-014** — O modal deve exibir uma seção "Permissões" separada da seção "Gerenciar Status"
- **RF-015** — O botão "Tornar Administrador" deve ser exibido apenas quando: o usuário está `ativo` E possui role `MEMBER`
- **RF-016** — O botão "Remover Administrador" deve ser exibido apenas quando: o usuário possui role `ADMIN` E não é o usuário logado E não é `admin@admin.com`
- **RF-017** — Quando um administrador visualiza outro administrador, a seção "Gerenciar Status" não deve exibir opção de inativar (regra existente mantida)

## Experiência do Usuário

**Fluxo principal — Promoção:**
1. Admin acessa `/admin/usuarios` e clica em um membro ativo
2. Modal abre com seção "Permissões" exibindo botão "⭐ Tornar Administrador"
3. Admin clica no botão → AlertDialog aparece com texto: *"[Nome] terá acesso total ao painel administrativo. Esta ação pode ser revertida."*
4. Admin confirma → badge do usuário atualiza para "Administrador", botões do modal se reorganizam
5. Em caso de erro → mensagem inline no modal, nenhum estado é perdido

**Fluxo principal — Remoção:**
1. Admin acessa `/admin/usuarios` e clica em outro administrador
2. Modal abre com seção "Permissões" exibindo botão "🔻 Remover Administrador"
3. Admin clica no botão → AlertDialog aparece com texto: *"[Nome] perderá acesso ao painel administrativo e voltará a ser membro."*
4. Admin confirma → badge atualiza para "Membro", botões se reorganizam
5. Em caso de erro → mensagem inline no modal

**Estados impossíveis que não devem aparecer na UI:**
- Botão "Tornar Admin" para usuários suspensos
- Botão "Remover Admin" para o próprio usuário logado
- Qualquer ação de role para `admin@admin.com`

## Restrições Técnicas de Alto Nível

- As novas rotas devem ser protegidas por autenticação JWT e restritas a usuários com role `ADMIN`
- O email `admin@admin.com` deve ser tratado como admin raiz permanente — a proteção deve ser aplicada no backend, não apenas na UI
- A validação deve ocorrer em dupla camada: frontend (visibilidade dos botões) e backend (erros de domínio explícitos)
- A atualização de estado deve ser otimista no frontend com rollback automático em caso de falha

## Fora de Escopo

- Notificações por email ao usuário quando seu role é alterado
- Log de auditoria de alterações de role
- Alteração de role em massa (múltiplos usuários simultaneamente)
- Hierarquia de roles além de `ADMIN` e `MEMBER`
- Auto-promoção (um membro solicitando ser promovido)
- Interface para o próprio admin raiz (`admin@admin.com`) transferir ou renunciar ao status de raiz
