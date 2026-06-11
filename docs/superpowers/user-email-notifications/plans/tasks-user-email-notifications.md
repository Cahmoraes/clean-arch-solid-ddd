# Tarefas: User Email Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/user-email-notifications-design.md`
**PRD:** `../prd/prd-user-email-notifications.md`

**Goal:** Adicionar envio automático de email de boas-vindas no cadastro e de alerta de segurança na definição de senha, usando o DomainEventPublisher e a infraestrutura de email já existente no projeto.

**Architecture:** Os subscribers de email são classes `@injectable()` que se inscrevem explicitamente no `DomainEventPublisher`. O IoC container os registra como singletons e o bootstrap os ativa via `subscribe()`. Templates são React Email compilados para HTML pela função `render()` em Node.js sem dependência de browser.

**Tech Stack:** TypeScript, Inversify IoC, Nodemailer, @react-email/components, @react-email/render, React 18, DomainEventPublisher (padrão existente)

---

## Tarefas

- [x] 1. Atualizar interface MailerGateway para suporte a HTML + MailerGatewayMemory com sentEmails [RF-010, RF-011] → `task-01.md`
- [x] 2. Adicionar campo `name` ao UserCreatedEvent e atualizar CreateUserUseCase [RF-002] → `task-02.md`
- [x] 3. Publicar PasswordChangedEvent via DomainEventPublisher no DefinePasswordUseCase [RF-005] → `task-03.md`
- [x] 4. Instalar React Email e configurar suporte a TSX → `task-04.md`
- [x] 5. Criar WelcomeEmailTemplate + SendWelcomeEmailNotification + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-010, RF-011] → `task-05.md`
- [x] 6. Criar PasswordAlertEmailTemplate + SendPasswordAlertEmailNotification + testes unitários [RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011] → `task-06.md`
- [x] 7. Registrar notificações no IoC container + bootstrap + configurar SMTP via env vars [RF-001, RF-005] → `task-07.md`
