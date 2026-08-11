---
created_at: "2026-08-10T20:26:38-03:00"
updated_at: "2026-08-10T20:26:38-03:00"
---

# PRD: Histórico de Atividade do Usuário

## Visão Geral

Hoje, a aba "Atividade" do modal de detalhes do usuário (visão admin) sempre exibe o estado vazio "Sem dados de atividade disponíveis", mesmo quando o usuário tem ações recentes na plataforma. O administrador não tem como saber quando um usuário fez login pela última vez, trocou de senha, teve a conta bloqueada por segurança, ou sofreu mudanças administrativas (promoção de role, suspensão) sem consultar múltiplas fontes de dados manualmente — quando isso é possível. Esta feature popula essa aba com um feed real, combinando eventos de conta e check-ins em uma única linha do tempo.

## Objetivos

- Um administrador consegue, a partir do modal de detalhes de qualquer usuário, visualizar sua atividade recente sem sair da tela ou consultar outra ferramenta.
- O feed cobre 100% dos tipos de evento listados em Funcionalidades Principais (login, senha, Google, bloqueio, perfil, role, status, check-in) — nenhum é omitido silenciosamente.
- O registro de um evento de atividade nunca compromete a operação original: uma falha ao gravar atividade não impede login, troca de senha, ou qualquer outra ação de conta de ser concluída.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero ver o histórico de atividade de um usuário na aba "Atividade" do modal de detalhes, para entender o que ele fez recentemente sem precisar consultar múltiplas fontes.
- **US-02** — Como administrador, eu quero ver quando um usuário fez login pela última vez, para confirmar se a conta está ativa e em uso.
- **US-03** — Como administrador, eu quero ver eventos de segurança (troca de senha, bloqueio por segurança) no histórico, para auditar mudanças sensíveis na conta.
- **US-04** — Como administrador, eu quero ver os check-ins do usuário misturados com os demais eventos, para ter uma visão unificada de atividade.
- **US-05** — Como administrador, eu quero ver mudanças de role e de status (promoção, rebaixamento, suspensão, reativação) no histórico, para rastrear ações administrativas realizadas sobre a conta.
- **US-06** — Como administrador, eu quero que os eventos sejam agrupados por data com um ícone indicando o tipo, para escanear rapidamente o que aconteceu e quando.
- **US-07** — Como administrador, ao abrir a aba "Atividade" de um usuário sem nenhum evento registrado, eu quero ver um estado vazio claro, para saber que não há dados em vez de uma tela quebrada ou confusa.

## Funcionalidades Principais

**Feed de atividade combinado**
Exibe até 20 eventos recentes de um usuário, mesclando eventos de conta e check-ins, ordenados do mais recente para o mais antigo.

- **FR-001** — O sistema deve exibir, na aba "Atividade" do modal de detalhes do usuário, uma lista dos últimos 20 eventos de atividade do usuário, ordenados por data/hora decrescente.
- **FR-002** — Cada evento exibido deve indicar seu tipo e o horário em que ocorreu.
- **FR-012** — Um check-in realizado pelo usuário deve aparecer no histórico de atividade, mesclado com os demais eventos.
- **FR-013** — Se um usuário não tiver nenhum evento de atividade registrado, a aba deve exibir o estado vazio já existente ("Sem dados de atividade disponíveis").

**Registro de eventos de conta**
Cada ação relevante sobre a conta do usuário gera um evento de atividade rastreável.

- **FR-005** — Um login bem-sucedido (via credenciais ou via Google) deve gerar um evento de atividade do tipo "login".
- **FR-006** — Uma troca de senha bem-sucedida deve gerar um evento de atividade do tipo "senha alterada".
- **FR-007** — Um vínculo de conta Google bem-sucedido deve gerar um evento de atividade do tipo "conta Google vinculada".
- **FR-008** — Um bloqueio de conta por segurança deve gerar um evento de atividade do tipo "conta bloqueada".
- **FR-009** — Uma atualização de perfil bem-sucedida deve gerar um evento de atividade do tipo "perfil atualizado".
- **FR-010** — Uma promoção ou rebaixamento de role (admin/membro) deve gerar um evento de atividade do tipo "role alterada".
- **FR-011** — Uma mudança de status (ativo/suspenso), individual ou em massa, deve gerar um evento de atividade do tipo "status alterado" para cada usuário afetado.
- **FR-014** — Uma falha ao registrar um evento de atividade não deve impedir a ação de conta original de ser concluída com sucesso.

**Apresentação visual**
Organiza os eventos de forma escaneável.

- **FR-003** — Os eventos devem ser agrupados visualmente por data (ex: "Hoje", "Ontem", data completa).
- **FR-004** — Cada evento deve exibir um ícone com cor distinta conforme sua categoria (check-in, segurança, conta/perfil/administrativo).

## Experiência do Usuário

O administrador abre o modal de detalhes de um usuário e clica na aba "Atividade" (já existente). A lista aparece agrupada por data, com cabeçalhos de seção ("Hoje", "Ontem", datas completas) e cada item mostrando um ícone colorido por categoria, a descrição do evento e o horário. Sem paginação nem "carregar mais" nesta versão — apenas os 20 itens mais recentes. Quando não há eventos, o estado vazio atual é mantido sem alteração.

Decisões visuais completas (agrupamento, cores por categoria, tokens do tema) em `../specs/mockups/historico-atividade-usuario-visual.md`.

## Restrições Técnicas de Alto Nível

Carregadas das Características Arquiteturais validadas na fase de design:

- **Consistência com o padrão existente**: a captura de eventos deve reutilizar o mecanismo de domain events já existente no projeto — nenhum novo mecanismo de dispatch é introduzido.
- **Confiabilidade do registro sem acoplamento ao fluxo principal**: uma falha ao registrar atividade nunca pode impedir a ação de conta original (login, troca de senha, etc.) de ser concluída.
- **Simplicidade de leitura**: a consulta da aba deve retornar os 20 itens recentes com uma operação de leitura simples, sem exigir cache dedicado nesta versão.
- Sem requisitos de compliance/segurança adicionais além dos já aplicáveis ao dado de conta existente.

## Fora de Escopo

- Paginação ou "carregar mais" além dos 20 itens mais recentes.
- Retenção, expurgo ou arquivamento de eventos antigos.
- Filtros por tipo de evento ou por período na aba de Atividade.
- Exportação do histórico de atividade.
- Visão de atividade para o próprio usuário (esta feature cobre apenas a visão admin, no modal de detalhes).
- Audit log genérico para outros módulos do sistema além do módulo `user` (ex: academias, assinaturas).
