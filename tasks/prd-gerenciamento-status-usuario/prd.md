# PRD — Gerenciamento de Status de Usuário (Admin)

## Visão Geral

Administradores da plataforma precisam ter controle operacional sobre o ciclo de vida de contas de usuários. Atualmente, não existe na interface administrativa uma forma de visualizar o status de um usuário nem de alterá-lo. Isso força o time de operações a recorrer a ações manuais no banco de dados ou via API direta para suspender ou reativar contas.

Esta funcionalidade entrega ao administrador a capacidade de, pela área `/admin/usuarios`, visualizar o status de cada membro na listagem e, ao clicar sobre um usuário, abrir um modal com suas informações pessoais e um controle explícito para alternar o status entre **ativo** e **inativo**.

---

## Objetivos

- Permitir que administradores gerenciem o status de usuários (ativo/inativo) diretamente pela interface web, eliminando a necessidade de intervenção manual no banco de dados.
- Reduzir o tempo necessário para suspender ou reativar uma conta para menos de 30 segundos a partir da decisão do administrador.
- Tornar visível o status atual de cada usuário na listagem administrativa, sem exigir interação adicional.
- Garantir que a ação de suspensão seja protegida por uma etapa de confirmação explícita, reduzindo ativações acidentais.

---

## Histórias de Usuário

**Usuário primário: Administrador da plataforma**

- Como **administrador**, quero ver o status (ativo/inativo) de cada membro diretamente na listagem de usuários, para que eu possa identificar rapidamente contas suspensas sem precisar abrir detalhes individuais.

- Como **administrador**, quero clicar em um usuário e ver um modal com suas informações pessoais (nome, e-mail, papel, status, data de cadastro), para que eu tenha contexto completo antes de tomar qualquer ação.

- Como **administrador**, quero um botão de **Inativar** (visualmente destacado em vermelho) no modal de um usuário ativo, para que eu possa suspender a conta de forma intencional e controlada.

- Como **administrador**, quero que ao clicar em **Inativar** apareça uma confirmação explícita antes de executar a ação, para que eu não suspenda usuários por acidente.

- Como **administrador**, quero um botão de **Ativar** (visualmente destacado em verde) no modal de um usuário inativo, para que eu possa reativar a conta imediatamente quando necessário.

- Como **administrador**, quero que o status do usuário no modal seja atualizado imediatamente após a ação, para que eu possa confirmar visualmente o resultado sem fechar o modal.

- Como **administrador**, quero que eu não consiga suspender outros administradores nem minha própria conta, para que a integridade do acesso administrativo seja preservada.

---

## Funcionalidades Principais

### 1. Badge de Status na Listagem de Usuários

**O que faz:** exibe um badge colorido ao lado do badge de papel (role) em cada linha da listagem, indicando o status atual do usuário.

**Por que é importante:** permite ao administrador identificar contas suspensas sem precisar abrir o modal de cada usuário, agilizando a triagem operacional.

**Comportamento em alto nível:** a listagem já existente em `/admin/usuarios` passa a exibir o status de cada usuário junto às demais informações visíveis (nome, e-mail, papel).

**Requisitos funcionais:**
- RF-01: O campo `status` deve ser retornado pelo endpoint de listagem de usuários (`GET /users`).
- RF-02: O badge de status deve ser exibido em verde para o valor `activated` e em vermelho para o valor `suspended`.
- RF-03: O badge deve exibir texto legível: "Ativo" para `activated` e "Inativo" para `suspended`.
- RF-04: O badge de status deve ser visualmente distinto do badge de papel (role) existente.

---

### 2. Modal de Detalhes do Usuário

**O que faz:** ao clicar sobre qualquer linha da listagem, abre um modal com as informações pessoais do usuário selecionado (exceto senha) e os controles de alteração de status.

**Por que é importante:** concentra em um único lugar o contexto do usuário e a ação disponível, reduzindo erros e cliques desnecessários.

**Comportamento em alto nível:** o modal é populado com os dados já carregados pela listagem, sem chamadas adicionais à API.

**Requisitos funcionais:**
- RF-05: Ao clicar em um usuário na listagem, deve ser aberto um modal exibindo: nome, e-mail, papel (role), status atual e data de cadastro.
- RF-06: O modal não deve exibir senha nem nenhum campo sensível de autenticação.
- RF-07: O modal deve ser acessível via teclado (foco inicial no modal ao abrir, fechamento via tecla `Esc`, navegação por `Tab` entre os elementos interativos).
- RF-08: O modal deve ser fechável clicando fora dele ou no botão de fechar (`X`).

---

### 3. Ação de Inativar Usuário

**O que faz:** permite ao administrador suspender a conta de um usuário ativo.

**Por que é importante:** a suspensão de contas é uma ação crítica e irreversível no curto prazo; deve ser protegida contra cliques acidentais e restrita ao administrador.

**Comportamento em alto nível:** o botão "Inativar" aparece somente quando o usuário exibido está ativo. Ao clicar, uma etapa de confirmação é apresentada. Após confirmação, o status é atualizado via API e refletido imediatamente no modal e na listagem.

**Requisitos funcionais:**
- RF-09: O botão "Inativar" deve ser exibido apenas quando o status do usuário for `activated`.
- RF-10: O botão "Inativar" deve ter cor vermelha com contraste suficiente para leitura (mínimo WCAG AA para texto sobre fundo colorido).
- RF-11: Ao clicar em "Inativar", deve ser exibida uma confirmação explícita antes de executar a ação.
- RF-12: Após confirmação, a API deve ser chamada para suspender o usuário.
- RF-13: Após sucesso, o modal deve permanecer aberto com o status atualizado para `suspended`/`Inativo`.
- RF-14: A listagem deve refletir o novo status do usuário após o fechamento do modal ou na próxima atualização.
- RF-15: O botão "Inativar" **não deve** ser exibido quando o usuário for administrador (`role === 'ADMIN'`).
- RF-16: O botão "Inativar" **não deve** ser exibido quando o usuário visualizado for o próprio administrador logado.

---

### 4. Ação de Ativar Usuário

**O que faz:** permite ao administrador reativar a conta de um usuário suspenso.

**Por que é importante:** reativar uma conta é uma ação positiva e de baixo risco; deve ser direta e sem fricção desnecessária.

**Comportamento em alto nível:** o botão "Ativar" aparece somente quando o usuário exibido está suspenso. Ao clicar, a ação é executada diretamente sem confirmação adicional.

**Requisitos funcionais:**
- RF-17: O botão "Ativar" deve ser exibido apenas quando o status do usuário for `suspended`.
- RF-18: O botão "Ativar" deve ter cor verde com contraste suficiente para leitura.
- RF-19: Ao clicar em "Ativar", a API deve ser chamada diretamente, sem etapa de confirmação.
- RF-20: Após sucesso, o modal deve permanecer aberto com o status atualizado para `activated`/`Ativo`.
- RF-21: A listagem deve refletir o novo status do usuário após o fechamento do modal ou na próxima atualização.

---

### 5. Proteção de Rotas de Status no Backend

**O que faz:** garante que as operações de ativar e suspender usuários sejam acessíveis apenas por administradores autenticados.

**Por que é importante:** alterar o status de um usuário é uma operação sensível que não pode ser executada por membros comuns.

**Requisitos funcionais:**
- RF-22: O endpoint de suspensão de usuário deve existir e estar protegido por autenticação.
- RF-23: Os endpoints de ativar e suspender devem ser restritos a usuários com papel `ADMIN`.
- RF-24: Tentativas de acesso sem autenticação ou por não-administradores devem retornar erro adequado.

---

## Experiência do Usuário

**Persona principal:** Administrador da plataforma — usuário com conhecimento técnico moderado, responsável pela gestão operacional de contas de membros.

**Fluxo principal:**
1. Administrador acessa `/admin/usuarios`.
2. Visualiza a listagem paginada de usuários, cada um com nome, e-mail, papel e **badge de status**.
3. Identifica visualmente usuários suspensos pelo badge vermelho "Inativo".
4. Clica sobre o nome de um usuário para abrir o modal com detalhes.
5. No modal, lê as informações pessoais e vê o botão de ação correspondente ao status atual.
6. Para usuário ativo: clica "Inativar" → confirma → vê o badge mudar para "Inativo" no modal.
7. Para usuário inativo: clica "Ativar" → vê o badge mudar para "Ativo" no modal imediatamente.
8. Fecha o modal e confirma visualmente o badge atualizado na listagem.

**Considerações de UI/UX:**
- O modal deve ser simples e focado: informações pessoais no topo, botão de ação no rodapé.
- Os botões de ação devem ser o único elemento interativo de destaque; demais informações são leitura.
- Estados de carregamento (loading) devem ser visíveis durante a chamada à API para evitar duplos cliques.
- Em caso de erro na API, uma mensagem de erro deve ser exibida dentro do modal sem fechá-lo.

**Acessibilidade:**
- Navegação completa por teclado: foco gerenciado ao abrir/fechar o modal.
- Botões de ação com labels descritivos (ex: "Inativar usuário João Silva").
- Foco visível em todos os elementos interativos.
- Texto dos badges com contraste mínimo conforme WCAG 2.1 AA.

---

## Restrições Técnicas de Alto Nível

- A funcionalidade deve integrar-se às rotas de API REST existentes do backend (`PATCH /users/activate` e a nova `PATCH /users/suspend`).
- O campo `status` precisa ser incluído na resposta do endpoint `GET /users` para suportar a exibição na listagem.
- As operações de status devem ser restritas a usuários autenticados com papel `ADMIN` no backend.
- A interface deve utilizar os componentes de UI existentes no projeto (shadcn/ui).
- O estado da interface após as ações deve ser mantido em sincronia com o backend via invalidação de cache da query de listagem.

---

## Fora de Escopo

- **Notificação por e-mail** ao usuário quando sua conta for suspensa ou reativada.
- **Histórico/audit log** de alterações de status (quem suspendeu, quando, por quê).
- **Ações em massa** (suspender ou ativar múltiplos usuários de uma vez).
- **Suspensão agendada** (definir data/hora futura para suspender automaticamente).
- **Auto-gerenciamento** de status pelo próprio usuário membro.
- Alteração de outros atributos do usuário (nome, e-mail, senha, papel) — fora do escopo desta funcionalidade.
