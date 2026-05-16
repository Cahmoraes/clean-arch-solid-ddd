---
created_at: "2026-05-16T15:32:54-03:00"
updated_at: "2026-05-16T15:32:54-03:00"
---

# PRD: Notificações por Email ao Usuário

## Visão Geral

Usuários que se cadastram ou definem uma senha na plataforma atualmente não recebem nenhuma comunicação por email. Isso reduz a percepção de segurança e confiabilidade do produto.

Este PRD descreve dois emails transacionais automáticos: um de boas-vindas no momento do cadastro e um alerta de segurança quando uma senha é definida. Ambos são disparados a partir de ações já existentes no sistema, sem alteração nos fluxos de negócio.

---

## Objetivos

- Garantir que todo novo usuário receba um email de boas-vindas imediatamente após o cadastro.
- Garantir que todo usuário receba um alerta de segurança sempre que uma senha for definida em sua conta.
- Não introduzir nenhuma regressão nos fluxos existentes de cadastro, autenticação ou definição de senha.
- Falhas no envio de email não devem impactar a experiência do usuário na plataforma.

**Indicadores de sucesso:**
- 100% dos cadastros geram tentativa de envio do email de boas-vindas.
- 100% das definições de senha geram tentativa de envio do alerta de segurança.
- 0% de regressões nos testes existentes de cadastro e autenticação.

---

## Histórias de Usuário

**US-001 — Email de boas-vindas no cadastro**
Como usuário recém-cadastrado, eu quero receber um email de boas-vindas ao criar minha conta, para que eu tenha confirmação de que o cadastro foi realizado com sucesso.

**US-002 — Alerta de segurança na definição de senha**
Como usuário que acabou de definir uma senha, eu quero receber um email de alerta de segurança, para que eu seja notificado de qualquer acesso ou alteração não autorizada em minha conta.

**US-003 — Resiliência a falhas de email**
Como usuário, eu quero que meu cadastro e minha definição de senha sejam concluídos normalmente mesmo que o serviço de email esteja indisponível, para que problemas de infraestrutura de email não bloqueiem meu acesso à plataforma.

---

## Funcionalidades Principais

### F-001 — Email de Boas-Vindas

Disparo automático de email para o endereço do usuário no momento em que sua conta é criada na plataforma — independentemente do método de cadastro (tradicional ou via Google).

**Por que importa:** Confirma ao usuário que seu cadastro foi concluído com sucesso e estabelece o primeiro ponto de contato da plataforma.

**Como funciona em alto nível:** O sistema escuta o evento de domínio gerado após a criação de uma conta e dispara o email de boas-vindas.

**Requisitos funcionais:**
- **RF-001:** O sistema deve enviar um email de boas-vindas para o endereço cadastrado sempre que uma nova conta for criada.
- **RF-002:** O email deve conter o nome do usuário e seu endereço de email.
- **RF-003:** O email deve ser enviado em português (pt-BR).
- **RF-004:** O email não deve conter link de verificação de conta.

---

### F-002 — Alerta de Segurança na Definição de Senha

Disparo automático de email para o endereço do usuário sempre que uma senha for definida ou alterada em sua conta.

**Por que importa:** Notifica o usuário sobre uma ação sensível de segurança, permitindo que ele identifique acessos não autorizados.

**Como funciona em alto nível:** O sistema escuta o evento de domínio gerado após a definição de senha e dispara o alerta de segurança.

**Requisitos funcionais:**
- **RF-005:** O sistema deve enviar um email de alerta de segurança sempre que uma senha for definida em uma conta.
- **RF-006:** O email deve identificar a conta afetada (nome do usuário e email).
- **RF-007:** O email deve orientar o usuário a entrar em contato caso não reconheça a ação.
- **RF-008:** O email deve ser enviado em português (pt-BR).
- **RF-009:** O email não deve conter a senha ou qualquer informação sensível além da notificação da ação.

---

### F-003 — Resiliência a Falhas

O sistema deve garantir que falhas no envio de email não interrompam o fluxo principal do usuário.

**Requisitos funcionais:**
- **RF-010:** Uma falha no envio de email não deve gerar erro na resposta da API para o usuário.
- **RF-011:** Falhas no envio de email devem ser registradas em log para monitoramento.

---

## Experiência do Usuário

**Jornada — Cadastro:**
1. Usuário conclui o cadastro (via formulário ou Google).
2. Sistema cria a conta e retorna resposta de sucesso.
3. Em paralelo, o sistema envia o email de boas-vindas.
4. Usuário recebe o email com seu nome e confirmação do endereço cadastrado.

**Jornada — Definição de senha:**
1. Usuário define uma senha para sua conta (ex: conta criada via Google que passa a ter senha).
2. Sistema persiste a senha e retorna resposta de sucesso.
3. Em paralelo, o sistema envia o alerta de segurança.
4. Usuário recebe email informando que uma senha foi definida em sua conta.

**Formato dos emails:**
- HTML responsivo com fallback em texto puro.
- Idioma: português (pt-BR).
- Remetente configurável via variáveis de ambiente.

---

## Restrições Técnicas de Alto Nível

- O envio de email deve ser integrado ao sistema de eventos de domínio existente, sem alteração nos use cases de cadastro e definição de senha.
- O provedor de email deve ser configurável via variáveis de ambiente (SMTP genérico), permitindo uso de qualquer serviço SMTP em produção.
- Em ambiente de testes, o envio deve ser simulado sem chamadas externas.
- O sistema não deve implementar fila de retry automático nesta versão — falhas são apenas logadas.

---

## Fora de Escopo

- Confirmação/verificação de endereço de email (email de ativação de conta).
- Email marketing ou campanhas.
- Painel de preferências de notificação pelo usuário (opt-out).
- Retry automático em caso de falha no envio.
- Rastreamento de abertura de email (tracking pixel).
- Suporte a múltiplos idiomas nos templates.
- Notificações push ou SMS.
