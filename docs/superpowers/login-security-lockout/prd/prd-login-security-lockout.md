---
created_at: "2026-05-28T10:03:40-03:00"
updated_at: "2026-05-28T10:03:40-03:00"
---

# PRD: Login Security Lockout

## Visão Geral

Usuários mal-intencionados podem tentar acessar contas alheias através de ataques de força bruta no endpoint de login. Atualmente, o sistema não possui nenhum mecanismo de proteção a nível de conta — apenas rate limiting HTTP genérico por IP.

Esta feature introduz um mecanismo de bloqueio automático de conta após 3 tentativas de login inválidas dentro de uma janela de 15 minutos, notificação por e-mail ao titular da conta, e fluxos de recuperação distintos para bloqueio por segurança versus suspensão administrativa. Como parte desta feature, o campo `isSuperAdmin` é introduzido no banco de dados para substituir comparações de string hardcoded do root admin em todo o backend.

---

## Objetivos

- Bloquear automaticamente contas sob ataque de força bruta antes que sejam comprometidas
- Notificar o titular da conta imediatamente ao detectar atividade suspeita
- Oferecer caminho de recuperação de acesso seguro e autônomo (redefinição de senha)
- Garantir que suspensões administrativas não possam ser contornadas via reset de senha
- Eliminar magic strings hardcoded de `admin@admin.com` do código de produção

**Métricas de sucesso:**
- Zero falsos negativos: toda 3ª tentativa inválida dentro da janela aciona o bloqueio
- E-mail de alerta entregue em menos de 60 segundos após o bloqueio
- Nenhuma violação de user enumeration: todos os erros de login retornam resposta idêntica

---

## Histórias de Usuário

**US-001 — Bloqueio automático por tentativas falhas**
Como sistema de segurança, quero bloquear automaticamente uma conta após 3 tentativas de login inválidas dentro de 15 minutos, para que ataques de força bruta sejam impedidos antes de comprometer contas.

**US-002 — Notificação de bloqueio por e-mail**
Como usuário com conta bloqueada, quero receber imediatamente um e-mail de alerta informando sobre as tentativas suspeitas e contendo um link para redefinir minha senha, para que eu saiba que minha conta foi protegida e possa recuperar o acesso.

**US-003 — Desbloqueio autônomo via redefinição de senha**
Como usuário com conta bloqueada por segurança, quero redefinir minha senha usando o link recebido no e-mail, para que minha conta seja desbloqueada automaticamente sem precisar de intervenção de um administrador.

**US-004 — Admin desbloqueia conta bloqueada**
Como administrador, quero poder desbloquear manualmente uma conta com status `locked`, para que eu possa auxiliar usuários que não têm acesso ao e-mail de recuperação.

**US-005 — Admin suspende conta bloqueada**
Como administrador, quero poder suspender permanentemente uma conta com status `locked`, para que contas comprometidas sejam desativadas definitivamente sem possibilidade de recuperação autônoma pelo usuário.

**US-006 — Usuário suspenso não recupera acesso via reset de senha**
Como sistema de segurança, quero impedir que usuários com status `suspended` usem o fluxo de redefinição de senha para recuperar acesso, para que suspensões administrativas sejam irrevogáveis pelo próprio usuário.

**US-007 — Root admin isento de bloqueio**
Como root admin, quero ser isento do mecanismo de bloqueio automático, para que o acesso de administração raiz nunca seja interrompido por tentativas de força bruta direcionadas.

**US-008 — Identificação do superadmin via banco de dados**
Como desenvolvedor, quero que a proteção especial do root admin seja determinada por um campo `isSuperAdmin` no banco de dados — e não por comparação de string hardcoded — para que a lógica de negócio seja auditável, testável e livre de magic strings.

---

## Funcionalidades Principais

### F-1: Contador de Tentativas Falhas e Bloqueio Automático

Rastreia tentativas de login inválidas por e-mail dentro de uma janela deslizante de 15 minutos. Ao atingir 3 falhas, bloqueia a conta e notifica o usuário.

**Requisitos funcionais:**

- **RF-001** — O sistema deve registrar cada tentativa de login inválida associada ao e-mail utilizado, dentro de uma janela deslizante de 15 minutos.
- **RF-002** — Após a 3ª tentativa inválida dentro da janela, o status da conta do usuário é alterado para `locked` e persistido no banco de dados.
- **RF-003** — Ao atingir o limite de bloqueio, o contador de tentativas é removido imediatamente.
- **RF-004** — Um login bem-sucedido reinicia o contador de tentativas do e-mail correspondente.
- **RF-005** — Usuários com `isSuperAdmin = true` são isentos: tentativas falhas não são contabilizadas e o bloqueio nunca é acionado para eles.
- **RF-006** — Todas as respostas de falha de autenticação (usuário inexistente, senha errada, conta `locked`, conta `suspended`) retornam HTTP 401 com a mensagem genérica `"Credenciais inválidas"`, sem distinção entre os casos.
- **RF-007** — O hash bcrypt da senha é sempre executado, independente do estado da conta, para garantir tempo de resposta constante e prevenir timing attacks.

### F-2: Notificação por E-mail ao Usuário Bloqueado

Ao bloquear uma conta, o sistema envia automaticamente um e-mail ao titular com alerta de segurança e link de recuperação.

**Requisitos funcionais:**

- **RF-008** — Ao acionar o bloqueio (RF-002), o sistema gera automaticamente um token de redefinição de senha com validade de 15 minutos.
- **RF-009** — O sistema envia um e-mail ao endereço da conta bloqueada contendo: alerta sobre tentativas de acesso suspeitas, informação de que o acesso foi bloqueado por segurança, e link de redefinição de senha com o token gerado.
- **RF-010** — O e-mail deve ser entregue em menos de 60 segundos após o bloqueio.

### F-3: Desbloqueio via Redefinição de Senha

O usuário utiliza o link recebido no e-mail para redefinir sua senha, o que simultaneamente desbloqueia sua conta.

**Requisitos funcionais:**

- **RF-011** — A redefinição bem-sucedida de senha por um usuário com status `locked` altera o status para `activated`.
- **RF-012** — Todas as sessões ativas do usuário são revogadas após a redefinição de senha.
- **RF-013** — Se o status da conta for alterado para `suspended` pelo admin enquanto o token de reset ainda está ativo, a tentativa de uso do token é rejeitada com erro genérico de token inválido.

### F-4: Controle Administrativo de Contas Bloqueadas

O admin pode, via interface existente, desbloquear ou suspender permanentemente uma conta com status `locked`.

**Requisitos funcionais:**

- **RF-014** — O admin pode ativar (desbloquear) uma conta com status `locked`, restaurando-a para `activated`.
- **RF-015** — A ativação de uma conta `locked` pelo admin não exige redefinição de senha pelo usuário.
- **RF-016** — O admin pode suspender uma conta com status `locked`, transicionando-a para `suspended`.
- **RF-017** — Contas com status `suspended` não podem iniciar o fluxo de redefinição de senha. O sistema retorna resposta HTTP 200 genérica (sem revelar o status) para não expor informações da conta.

### F-5: Campo `isSuperAdmin` e Eliminação de Magic Strings

Introduz o campo `isSuperAdmin` no banco de dados e substitui todas as comparações de string `admin@admin.com` no backend.

**Requisitos funcionais:**

- **RF-018** — O schema do banco de dados deve incluir o campo `isSuperAdmin Boolean @default(false)` na tabela de usuários.
- **RF-019** — O root admin deve ter `isSuperAdmin = true` definido via migration de dados.
- **RF-020** — Todas as verificações de identidade do root admin no backend devem usar `user.isSuperAdmin`, sem comparações de string.

---

## Experiência do Usuário

### Jornada do usuário legítimo sob ataque

1. Atacante tenta logar com o e-mail da vítima 3 vezes com senha errada em menos de 15 minutos
2. Na 3ª tentativa, a conta é bloqueada automaticamente
3. O usuário legítimo recebe um e-mail com assunto indicando atividade suspeita
4. O e-mail exibe claramente: "detectamos tentativas de acesso não autorizadas" e "seu acesso foi bloqueado por segurança"
5. O usuário clica no CTA "Redefinir senha e recuperar acesso"
6. Redefine a senha normalmente (fluxo existente)
7. Conta desbloqueada automaticamente — usuário redirecionado para login

### Jornada do admin ao ver conta bloqueada

1. Admin acessa o painel de gestão de usuários
2. Conta exibe status `locked` (novo valor visível no campo status)
3. Admin pode escolher: **Ativar** (desbloqueia) ou **Suspender** (bloqueia permanentemente)
4. Ação confirmada com feedback visual

### Considerações de UX

- O status `locked` deve ser visualmente distinguível de `suspended` na interface admin (cores/ícones diferentes)
- O e-mail de bloqueio deve usar linguagem clara e não alarmista — informar sem causar pânico
- O rodapé do e-mail deve orientar o usuário a contatar o suporte caso não reconheça as tentativas

---

## Restrições Técnicas de Alto Nível

- O contador de tentativas deve ser armazenado em Redis com TTL deslizante para suportar múltiplas instâncias do servidor
- O estado `locked` deve ser persistido no banco de dados (fonte de verdade) para garantir durabilidade entre reinicializações do Redis
- O fluxo de autenticação deve manter tempo de resposta constante independente do estado da conta (requisito anti-timing-attack)
- O e-mail de bloqueio deve reutilizar a infraestrutura existente de domain events e MailerGateway
- A migration de schema deve incluir tanto a adição do enum `locked` quanto a adição do campo `isSuperAdmin`

---

## Fora de Escopo

- MFA (autenticação multifator) ou CAPTCHA progressivo
- Desbloqueio automático por tempo (o bloqueio é permanente até ação explícita)
- Rate limiting por IP para login (já coberto pelo plugin HTTP existente)
- Log de auditoria de tentativas de login
- Notificação ao admin sobre novas contas bloqueadas
- SMS ou outros canais de notificação além do e-mail
- Interface de criação de novos superadmins (o campo é exclusivo para o root admin existente)
