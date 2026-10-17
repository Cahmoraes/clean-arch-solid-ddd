# PRD: Calendário: redesign com painel do dia e gaveta

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

## Visão Geral

Quem usa a rota `/calendario` consulta feriados nacionais e registra notas de treino por dia. Hoje o texto do feriado e da nota fica espremido dentro de cada dia, e os cards laterais crescem com o número de itens e poluem a tela. O redesign deixa o mês limpo, mostra o detalhe do dia selecionado num painel de altura estável e leva a criação e a edição da nota para uma gaveta, sem mudar dados nem backend.

## Objetivos

Os critérios de sucesso da spec valem (`## Visão Geral`). Além deles: abrir a edição de uma nota leva dois cliques a partir da grade (selecionar o dia, "Editar"), e a altura da página é a mesma com 1 ou com 30 notas no mês.

## Histórias de Usuário

- **US-01** — Como pessoa que consulta o calendário, eu quero ver cada dia só com número e marcadores de feriado e de nota para que nenhuma célula fique com texto espremido
- **US-02** — Como pessoa que consulta o calendário, eu quero selecionar um dia e ver o feriado e a nota dele num painel para que eu leia o detalhe sem abrir um formulário
- **US-03** — Como pessoa que registra notas de treino, eu quero uma lista do mês com feriados e notas que não aumenta a tela para que o calendário não fique poluído quando houver muitas notas
- **US-04** — Como pessoa que registra notas de treino, eu quero criar e editar a nota do dia numa gaveta para que a edição não cubra a grade nem o painel
- **US-05** — Como pessoa que registra notas de treino, eu quero excluir uma nota com confirmação, pelo painel ou pela gaveta, para que eu não perca um treino por engano
- **US-06** — Como pessoa que navega entre meses, eu quero que o dia selecionado seja coerente com o mês exibido e que as setas não troquem de mês enquanto eu digito para que a navegação e a edição não se atrapalhem
- **US-07** — Como pessoa que consulta o calendário, eu quero que a falha ou a demora dos feriados não esconda minhas notas, e vice-versa, para que eu use o que carregou
- **US-08** — Como pessoa que usa teclado ou leitor de tela, eu quero que os dias, os marcadores e a gaveta continuem acessíveis para que o redesign não me tire funcionalidade
- **US-09** — Como pessoa que usa o calendário em tela menor, eu quero o painel abaixo da grade e a gaveta subindo pela base para que o layout caiba na tela

## Funcionalidades Principais

### Grade e marcadores

- **FR-001** (US-01) — o sistema deve mostrar em cada dia só o número e, quando houver, os marcadores de feriado e de nota, sem o texto do feriado nem da nota dentro da célula (AC-01)
- **FR-002** (US-01, US-08) — o sistema deve mostrar feriado e nota num tooltip ao passar o mouse e ao focar o dia, marcar os marcadores como decorativos e manter o resumo do dia no nome acessível, junto com `data-date` e `aria-current` em hoje (AC-15)

### Seleção e painel do dia

- **FR-003** (US-02) — o sistema deve selecionar o dia ao clicar nele, indicar o dia selecionado e não abrir a gaveta (AC-02)
- **FR-004** (US-02) — o sistema deve mostrar no painel o feriado nacional e a nota do dia selecionado, com as ações Editar e Excluir quando houver nota (AC-04)
- **FR-005** (US-02, US-04) — o sistema deve mostrar "Nenhuma nota neste dia." e a ação "Adicionar nota" quando o dia selecionado não tem nota (AC-05)
- **FR-006** (US-06) — o sistema deve selecionar hoje, quando o mês exibido o contém, ou o dia 1, e reaplicar essa regra ao trocar de mês, de ano ou usar "Hoje" (AC-03)

### Lista do mês

- **FR-007** (US-03) — o sistema deve listar feriados e notas do mês juntos, em ordem cronológica e com o feriado antes da nota no mesmo dia (AC-12)
- **FR-008** (US-03) — o sistema deve rolar a lista dentro do painel sem aumentar a altura do painel quando houver muitas notas (AC-10)
- **FR-009** (US-02, US-03) — o sistema deve selecionar o dia de uma linha da lista ao clicar nela (AC-11)

### Gaveta de nota

- **FR-010** (US-04) — o sistema deve abrir a gaveta ao acionar "Editar" ou "Adicionar nota", com o título da data e o texto atual da nota (vazio ao criar) (AC-06)
- **FR-011** (US-04) — o sistema deve criar ou atualizar a nota ao salvar, fechar a gaveta e refletir o novo texto no painel, no marcador e na lista (AC-07)
- **FR-012** (US-04, US-05) — o sistema deve tratar conflito de nota já existente, erro de rede ao salvar e exclusão de nota inexistente com as mesmas regras e mensagens de hoje (`## Falhas e Erros` da spec) (AC-07, AC-08)

### Exclusão

- **FR-013** (US-05) — o sistema deve pedir confirmação ao acionar Excluir, no painel ou na gaveta, e só remover a nota ao confirmar, fechando a gaveta se estiver aberta (AC-08)

### Foco, teclado e falhas

- **FR-014** (US-04, US-05, US-08) — o sistema deve devolver o foco ao botão do dia ao fechar a gaveta por qualquer caminho e ao terminar uma exclusão feita pelo painel (AC-09)
- **FR-015** (US-06, US-08) — o sistema deve ignorar as setas esquerda e direita como atalho de troca de mês quando o foco está num campo editável ou a gaveta está aberta (AC-14)
- **FR-016** (US-07) — o sistema deve manter a grade visível e tratar carregamento e falha dos feriados e das notas de forma independente, com "Tentar de novo" na fonte que falhou e sem esconder dados em cache numa falha de refetch (AC-13)

### Layout responsivo

- **FR-017** (US-09) — o sistema deve exibir painel e grade lado a lado com a mesma altura a partir de 1280px, o painel depois da grade abaixo disso e a gaveta pela base abaixo de 768px (AC-16)

## Experiência do Usuário

Jornada principal: o usuário vê o mês com marcadores, clica em um dia (o painel mostra o feriado e a nota dele), aciona "Editar" ou "Adicionar nota", escreve na gaveta e salva; o foco volta ao dia. A lista do mês no painel serve para achar outros dias com nota ou feriado e selecioná-los. Norte visual: `../specs/mockups/calendario-redesign-painel-gaveta-visual.md` (estados: dia com feriado e nota, gaveta aberta, dia sem nota). Requisitos de acessibilidade: os de `## Escopo` da spec (Restrições e Anti-objetivos).

## Fora de Escopo

As exclusões da spec valem (`## Escopo`).
