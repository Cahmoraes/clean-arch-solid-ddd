---
created_at: "2026-09-20T10:43:48-03:00"
updated_at: "2026-09-20T10:43:48-03:00"
---

# PRD: tamanho variável na paginação de atividades do perfil

## Visão Geral

Usuários que acessam a atividade do próprio perfil hoje visualizam sempre 20
itens por página. O produto precisa permitir reduzir ou aumentar esse número
para facilitar a consulta de históricos curtos ou extensos, sem alterar o
comportamento da área administrativa.

As opções da primeira versão serão 10, 20 e 50 itens por página. A seleção deve
ser refletida na URL e, ao ser alterada, deve reiniciar a navegação na primeira
página.

## Objetivos

- Permitir que o usuário escolha entre 10, 20 e 50 itens por página na
  atividade do próprio perfil.
- Garantir que a escolha seja preservada ao navegar entre páginas e ao
  recarregar ou compartilhar a URL.
- Manter o valor padrão de 20 para URLs e clientes que não informam a nova
  opção.
- Impedir valores fora da lista permitida.
- Preservar o comportamento atual de 20 itens na atividade administrativa.

## Histórias de Usuário

- **US-01** — Como usuário do sistema, eu quero escolher quantos itens de atividade visualizar por página para que eu possa adaptar a consulta ao tamanho do meu histórico · **UI:** sim
- **US-02** — Como usuário do sistema, eu quero que a escolha de itens por página permaneça na URL para que eu possa recarregar ou compartilhar a visualização sem perder o contexto · **UI:** sim
- **US-03** — Como usuário do sistema, eu quero que a troca de tamanho retorne à primeira página para que eu não caia em uma página inexistente ou em uma posição inesperada · **UI:** sim
- **US-04** — Como responsável pela operação do sistema, eu quero que valores de tamanho inválidos sejam rejeitados para que consultas excessivamente grandes não sejam aceitas · **UI:** não
- **US-05** — Como administrador, eu quero que a atividade administrativa continue com 20 itens por página para que esta entrega não altere o comportamento já existente · **UI:** sim

## Funcionalidades Principais

### Seleção de itens na atividade do perfil

O usuário deve visualizar e selecionar 10, 20 ou 50 itens por página na
atividade do próprio perfil. O valor atual deve ser identificável e o resumo da
lista deve refletir o tamanho efetivamente aplicado.

- **FR-001** (US-01) — O sistema deve oferecer as opções 10, 20 e 50 itens por página na atividade do próprio perfil.
- **FR-002** (US-01, US-02) — O sistema deve aplicar a opção selecionada à listagem de atividades do próprio usuário.
- **FR-003** (US-01, US-02) — O sistema deve informar na paginação o tamanho de página efetivamente aplicado.

### URL e navegação

A escolha deve fazer parte do estado navegável da tela. Alterar o tamanho
reinicia a página; navegar entre páginas mantém o tamanho selecionado.

- **FR-004** (US-02) — O sistema deve representar o tamanho selecionado no estado da URL da atividade do perfil.
- **FR-005** (US-02) — O sistema deve preservar o tamanho selecionado ao navegar para outra página.
- **FR-006** (US-03) — O sistema deve definir a página atual como 1 quando o usuário alterar o tamanho da página.
- **FR-007** (US-02, US-03) — O sistema deve usar 20 itens como padrão quando o tamanho não estiver presente ou não for reconhecido no estado de navegação da tela.

### Validação e compatibilidade

O contrato da atividade do próprio usuário deve aceitar somente os tamanhos
definidos. A ausência do novo valor deve manter a compatibilidade existente,
enquanto a área administrativa permanece inalterada.

- **FR-008** (US-04) — O sistema deve aceitar somente os tamanhos 10, 20 e 50 para a atividade do próprio usuário.
- **FR-009** (US-04) — O sistema deve rejeitar com erro de requisição inválida um tamanho não permitido.
- **FR-010** (US-02, US-04) — O sistema deve usar 20 quando uma requisição da atividade do próprio usuário não informar o tamanho.
- **FR-011** (US-05) — O sistema deve manter a atividade administrativa limitada a 20 itens por página.

## Experiência do Usuário

- O controle deve aparecer junto da paginação existente, com o rótulo
  “Itens por página”.
- As opções devem ser apresentadas como 10, 20 e 50, com 20 selecionado por
  padrão.
- Ao selecionar uma opção, a lista deve ser atualizada a partir da primeira
  página e o resumo deve refletir o novo tamanho.
- A navegação entre páginas deve manter a opção escolhida.
- A interface deve preservar a hierarquia visual e os tokens existentes da
  atividade, sem introduzir modal ou nova área de configuração.
- O controle deve ter rótulo acessível e estado selecionado perceptível.
- Referência visual curada: `../specs/mockups/pagination-size-options.md`.

## Restrições Técnicas de Alto Nível

- A alteração deve ser limitada à atividade do próprio usuário; a atividade
  administrativa continua com o comportamento atual.
- O contrato HTTP e os tipos consumidos pelo frontend devem permanecer
  sincronizados e documentar somente os valores permitidos.
- A solução deve preservar a paginação existente na camada de persistência.
- **Simplicidade:** somente o endpoint do perfil recebe a nova capacidade; o
  endpoint administrativo continua retornando 20.
- **Correção/consistência:** URL, consulta, cache e metadados devem representar
  a mesma combinação de página e tamanho.
- **Performance:** o tamanho máximo permitido é 50 e a consulta deve continuar
  paginada.
- O valor padrão deve permanecer 20 para compatibilidade retroativa.

## Fora de Escopo

- Permitir tamanhos variáveis no endpoint administrativo.
- Cursor pagination, filtros, exportação ou alteração na retenção dos eventos.
- Persistir a preferência de tamanho no perfil do usuário.
- Alterar o modelo ou a captura dos eventos de atividade.
- Alterar a estratégia de consulta da persistência.
