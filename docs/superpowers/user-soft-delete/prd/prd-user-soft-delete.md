---
created_at: "2026-05-31T09:56:51-03:00"
updated_at: "2026-05-31T09:56:51-03:00"
---

# PRD: Soft Delete de Usuário (Admin)

## Visão Geral

O painel de detalhes do usuário (`admin-user-detail-panel`) expõe uma ação "Excluir" que
hoje está **desabilitada**, pois o backend não oferece endpoint de exclusão. Esta feature
habilita a exclusão **lógica** (soft delete) de contas de usuário a partir do painel admin.

Ao excluir, o usuário é marcado como excluído e **desaparece de toda leitura da aplicação**
(listagens, estatísticas, autenticação, perfil), mas seus dados e relacionamentos
(check-ins, assinaturas) **permanecem íntegros no banco** para auditoria e eventual
recuperação futura. A exclusão lógica preserva o histórico e evita violações de integridade
referencial que uma exclusão física causaria.

Público: **administradores** da plataforma. O problema que resolve: dar ao admin uma forma
segura e reversível (no nível de dados) de remover contas indevidas ou inativas sem perder
rastreabilidade.

## Objetivos

- Um administrador consegue excluir logicamente uma conta a partir do painel de detalhes,
  com confirmação explícita.
- Após a exclusão, o usuário **não aparece** em nenhuma leitura: lista de usuários,
  estatísticas e busca por id/email/googleId.
- Após a exclusão, o usuário **não consegue autenticar** (login por senha e login Google
  retornam credenciais inválidas).
- Os dados e relacionamentos do usuário excluído **permanecem no banco** (nenhum registro
  físico é apagado).
- O administrador **não pode** excluir a própria conta (proteção contra lockout).
- Contas **super admin** (`is_super_admin = true`) **não podem** ser excluídas por ninguém.
- Nenhum fluxo legítimo existente (perfil próprio, ações admin sobre usuários ativos,
  login de usuários ativos) é quebrado pela introdução do filtro de leitura.

**Critério de sucesso (mensurável):** todos os gates de validação passam (backend:
`biome:fix`, `tsc:check`, `test:run`, `test:business-flow`, `build`,
`fit:validate-dependencies`; frontend: `lint:fix`, `tsc:check`, `test`, `build`), e os
testes de aceitação por história de usuário (abaixo) passam.

## Histórias de Usuário

- **US-01** — Como administrador, quero excluir uma conta de usuário a partir do painel de
  detalhes, para que contas indevidas ou inativas sejam removidas da aplicação.
- **US-02** — Como administrador, quero confirmar a exclusão em um diálogo enfático antes de
  efetivá-la, para que eu não exclua uma conta por engano.
- **US-03** — Como administrador, quero que um usuário excluído suma imediatamente da lista
  e das estatísticas, para que a visão administrativa reflita apenas contas ativas.
- **US-04** — Como administrador, quero ser impedido de excluir a minha própria conta, para
  que eu não perca o acesso ao sistema.
- **US-05** — Como administrador, quero que contas super admin sejam protegidas contra
  exclusão, para que o acesso raiz da plataforma nunca seja removido.
- **US-06** — Como usuário excluído, quando tento autenticar (senha ou Google), o sistema
  recusa minhas credenciais, para que contas removidas não acessem a aplicação.
- **US-07** — Como administrador, quando a exclusão falha por regra de negócio
  (auto-exclusão ou super admin), quero ver uma mensagem clara, para que eu entenda por que
  a ação foi bloqueada.
- **US-08** — Como responsável por auditoria, quero que os dados do usuário excluído
  permaneçam no banco, para que histórico e relacionamentos sejam preservados.

## Funcionalidades Principais

### Exclusão lógica de usuário (backend)

O que faz: marca um usuário como excluído (registrando o momento da exclusão) sem remover
o registro físico, e passa a ocultá-lo de todas as leituras.
Por que importa: remove a conta da operação preservando integridade referencial e histórico.

- **RF-001** — Existe um campo de marcação de exclusão no usuário que indica se/quando ele
  foi excluído (nulo = ativo).
- **RF-002** — A entidade de usuário expõe a operação de marcar-se como excluído e a
  informação de "está excluído".
- **RF-003** — As leituras por id, email e googleId, e a leitura genérica do repositório,
  **não retornam** usuários excluídos.
- **RF-004** — A listagem paginada de usuários **não inclui** usuários excluídos na
  contagem nem nos resultados.
- **RF-005** — As estatísticas de usuários (total, membros, admins, ativos, inativos)
  **não contabilizam** usuários excluídos.
- **RF-006** — A exclusão **não** apaga fisicamente o usuário nem seus relacionamentos
  (check-ins, assinaturas permanecem no banco).

### Regras de negócio da exclusão (backend)

O que faz: aplica guardas antes de efetivar a exclusão.
Por que importa: evita lockout do próprio admin e protege o acesso raiz.

- **RF-007** — Um administrador **não pode** excluir a própria conta; a tentativa é
  rejeitada com erro de negócio específico.
- **RF-008** — Um usuário super admin **não pode** ser excluído; a tentativa é rejeitada
  com erro de negócio específico.
- **RF-009** — Tentar excluir um usuário inexistente (ou já excluído) resulta em erro de
  "usuário não encontrado" (comportamento idempotente aceitável).
- **RF-010** — A exclusão **não** é mais bloqueada pela existência de check-ins (não há
  mais violação de integridade referencial, pois a exclusão é lógica).

### Endpoint HTTP de exclusão (backend)

O que faz: expõe a exclusão como rota administrativa autenticada.
Por que importa: integra a regra de negócio à API consumida pelo frontend.

- **RF-011** — Existe um endpoint de exclusão de usuário acessível **apenas** por
  administradores autenticados.
- **RF-012** — Requisição sem autenticação é rejeitada; requisição de usuário não-admin é
  rejeitada.
- **RF-013** — A identidade do solicitante é derivada do token autenticado (não confiada do
  corpo/parâmetro da requisição) para aplicar a guarda de auto-exclusão.
- **RF-014** — Os erros de negócio são mapeados para respostas HTTP apropriadas
  (auto-exclusão / super admin → proibido/conflito; usuário não encontrado → não encontrado;
  sucesso → resposta de sucesso sem corpo relevante).
- **RF-015** — Após a exclusão, os caches de listagem e de estatísticas de usuários são
  invalidados, refletindo a remoção imediatamente.

### Exclusão pelo painel admin (frontend)

O que faz: habilita o botão "Excluir", confirma e dispara a exclusão.
Por que importa: entrega a feature ao usuário final (admin).

- **RF-016** — O botão "Excluir" no rodapé de ações do painel de detalhes fica
  **habilitado** (remoção do estado desabilitado e do tooltip "disponível em breve").
- **RF-017** — Ao acionar "Excluir", um diálogo de confirmação destrutivo é exibido, com
  texto enfático indicando que a ação não pode ser desfeita pela interface.
- **RF-018** — Confirmar a exclusão dispara a chamada ao endpoint e, em caso de sucesso,
  invalida as queries de lista e estatísticas, limpa a seleção e fecha o painel.
- **RF-019** — O botão "Excluir" é ocultado ou desabilitado contextualmente quando o alvo
  for o próprio admin logado ou um super admin (espelhando as guardas do backend).
- **RF-020** — Erros de exclusão (ex.: auto-exclusão / super admin) são apresentados ao
  admin com mensagem amigável.

## Experiência do Usuário

Fluxo principal (admin exclui um usuário):
1. O admin abre o painel de detalhes de um usuário na rota `/admin/usuarios`.
2. No rodapé de ações, o botão "Excluir" está habilitado (exceto quando o alvo é ele mesmo
   ou um super admin, caso em que está oculto/desabilitado).
3. Ao clicar em "Excluir", um diálogo de confirmação destrutivo aparece, com aviso enfático.
4. Ao confirmar, a aplicação executa a exclusão; em caso de sucesso, o usuário some da lista
   e das estatísticas, a seleção é limpa e o painel é fechado.
5. Em caso de erro de regra de negócio, uma mensagem clara é exibida e nada é alterado.

Considerações de UX/acessibilidade: o diálogo de confirmação segue o padrão `AlertDialog` já
usado para suspender/promover/revogar, mantendo navegação por teclado e foco coerentes com o
painel existente.

## Restrições Técnicas de Alto Nível

- A exclusão é **lógica** (soft delete): nenhum dado é apagado fisicamente, atendendo à
  necessidade de preservar histórico e integridade referencial.
- O filtro de "não excluído" deve ser aplicado de forma **transversal** nas leituras, de modo
  que login, perfil e mutações administrativas passem a ignorar usuários excluídos sem
  alteração caso a caso.
- A operação é restrita a **administradores autenticados**.
- A migração de banco e a geração de tipos compartilhados exigem ambiente de backend/banco
  ativo (Postgres) durante a implementação.
- A introdução do filtro de leitura **não pode** quebrar fluxos legítimos existentes — deve
  haver cobertura de regressão.

## Fora de Escopo

- Tela/fluxo de **restauração** de usuários excluídos (feature futura).
- **Hard delete** / purga definitiva (LGPD/retenção) — feature separada.
- **Anonimização** de dados pessoais do usuário excluído.
- **Exclusão em massa** (multi-seleção).
