---
created_at: "2026-05-08T14:32:05-03:00"
updated_at: "2026-05-08T14:32:05-03:00"
---

# PRD: Check-in Approve & Reject

## Visão Geral

Administradores da plataforma precisam moderar os check-ins realizados pelos usuários, aprovando os legítimos e rejeitando os inválidos. Atualmente, as páginas `/check-ins` e `/admin/check-ins` exibem apenas o status dos check-ins, sem oferecer ações. Este recurso adiciona botões de **Aprovar** e **Rejeitar** para administradores, além de introduzir um terceiro status (`rejected`) com garantias de invariância no domínio.

---

## Objetivos

- Permitir que administradores aprovem ou rejeitem check-ins diretamente pela interface
- Garantir que `validatedAt` e `rejectedAt` nunca coexistam em um mesmo check-in (invariante de domínio)
- Exibir corretamente o status `rejected` para usuários e administradores
- Manter rastreabilidade de todas as transições de estado (histórico preservado)

**Critério de sucesso:** Um admin consegue navegar até `/admin/check-ins` ou `/check-ins`, clicar em Aprovar ou Rejeitar em qualquer check-in acionável, e ver o status do item atualizado imediatamente na UI sem recarregar a página.

---

## Histórias de Usuário

**US-001 — Aprovar check-in pendente**
Como administrador, eu quero aprovar um check-in pendente para que ele seja registrado como validado no sistema.

**US-002 — Rejeitar check-in pendente**
Como administrador, eu quero rejeitar um check-in pendente para que ele seja marcado como rejeitado e não seja contabilizado.

**US-003 — Reverter aprovação (rejeitar validado)**
Como administrador, eu quero rejeitar um check-in que já foi aprovado para que erros de validação possam ser corrigidos sem perda de rastreabilidade.

**US-004 — Visualizar check-ins acionáveis no painel admin**
Como administrador, eu quero ver na página `/admin/check-ins` apenas os check-ins que ainda podem ser acionados (pendentes e validados), sem poluição de itens já resolvidos.

**US-005 — Visualizar status rejeitado**
Como usuário, eu quero ver claramente quando um dos meus check-ins foi rejeitado, para entender o resultado da moderação.

---

## Funcionalidades Principais

### F-001 — Endpoint de rejeição de check-in

Novo endpoint no backend para rejeitar check-ins.

- **RF-001:** O sistema deve expor `PATCH /check-ins/reject` acessível apenas por administradores autenticados.
- **RF-002:** O endpoint deve aceitar `{ checkInId: string }` e retornar `{ rejectedAt: string }` em caso de sucesso.
- **RF-003:** Se o check-in não existir, o sistema deve retornar erro 404.
- **RF-004:** A operação de rejeitar um check-in já rejeitado deve ser idempotente (retornar sucesso sem alteração).

### F-002 — Status `rejected` na entidade de domínio

O domínio de check-in passa a suportar três estados: `pending`, `validated`, `rejected`.

- **RF-005:** Um check-in nunca pode ter `validatedAt` e `rejectedAt` setados simultaneamente.
- **RF-006:** Ao rejeitar um check-in validado, `validatedAt` deve ser limpo.
- **RF-007:** Um check-in rejeitado não pode ser aprovado (transição `rejected → validated` é proibida).
- **RF-008:** As transições permitidas são: `pending → validated`, `pending → rejected`, `validated → rejected`.

### F-003 — Botões de ação na página `/check-ins`

A página de check-ins do usuário exibe botões de ação quando o usuário logado é admin.

- **RF-009:** Check-ins com status `pending`, exibidos para admins, devem mostrar botões "Aprovar" e "Rejeitar".
- **RF-010:** Check-ins com status `validated`, exibidos para admins, devem mostrar apenas o botão "Rejeitar".
- **RF-011:** Check-ins com status `rejected` não devem exibir nenhum botão de ação.
- **RF-012:** Usuários não-admin não devem ver nenhum botão de ação.

### F-004 — Botões de ação na página `/admin/check-ins`

A página de administração de check-ins mostra itens acionáveis com os botões corretos.

- **RF-013:** A página deve exibir check-ins com status `pending` e `validated`.
- **RF-014:** Check-ins com status `rejected` devem ser ocultados da página admin (já resolvidos).
- **RF-015:** Check-ins `pending` devem exibir botões "Aprovar" e "Rejeitar".
- **RF-016:** Check-ins `validated` devem exibir apenas o botão "Rejeitar".

### F-005 — Badge de status `rejected`

A UI deve comunicar visualmente o status rejeitado.

- **RF-017:** O status `rejected` deve ser exibido com um badge distinto (cor neutra/cinza) com o rótulo "Rejeitado".
- **RF-018:** Os botões de ação devem ser desabilitados durante uma operação em andamento (loading state).
- **RF-019:** O sistema deve exibir feedback de sucesso ou erro (toast) após cada ação de aprovação ou rejeição.

---

## Experiência do Usuário

**Fluxo principal — Admin aprova check-in pendente:**
1. Admin acessa `/admin/check-ins` ou `/check-ins`
2. Vê um check-in com status "Pendente" e dois botões: "Aprovar" e "Rejeitar"
3. Clica em "Aprovar" — botão entra em loading
4. Toast de sucesso aparece; item atualiza status para "Validado" sem recarregar a página
5. Na página `/admin/check-ins`: item permanece visível com status "Validado" e botão "Rejeitar" disponível

**Fluxo de reversão — Admin rejeita check-in validado:**
1. Admin vê check-in "Validado" com botão "Rejeitar"
2. Clica em "Rejeitar" — confirmação não é exigida (ação pode ser auditada)
3. Toast de sucesso; item muda para "Rejeitado"
4. Na página `/admin/check-ins`: item desaparece (status rejected = oculto)
5. Na página `/check-ins`: item permanece visível com badge cinza "Rejeitado"

**Estados visuais dos botões:**
- Normal: botão habilitado com label e ícone
- Loading: spinner, botão desabilitado
- Sucesso: toast verde, UI atualiza
- Erro: toast vermelho com mensagem, estado revertido

---

## Restrições Técnicas de Alto Nível

- O endpoint de rejeição deve exigir autenticação JWT e papel `ADMIN`
- O campo `rejectedAt` deve ser persistido no banco de dados (nova coluna, migração necessária)
- Os tipos compartilhados (`@repo/api-types`) devem ser regenerados após a atualização do backend
- A invariante de domínio (exclusividade mútua de `validatedAt` / `rejectedAt`) deve ser garantida pela entidade, não pela camada de banco

---

## Fora de Escopo

- Notificação push/e-mail para o usuário quando seu check-in for rejeitado
- Motivo/comentário obrigatório ao rejeitar
- Histórico completo de mudanças de status (audit log detalhado)
- Transição `rejected → pending` (re-abertura de um check-in rejeitado)
- Interface para usuários não-admin contestarem rejeições
