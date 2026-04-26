# PRD - Sistema de Busca de Academias por Proximidade

## Visão Geral

Desenvolver um sistema de busca inteligente que permite aos usuários encontrar academias próximas à sua localização em tempo real. A funcionalidade resolve o problema de usuários terem dificuldade em descobrir academias disponíveis em sua região, aumentando a conversão e retenção de clientes. A busca será baseada em coordenadas GPS e distância máxima configurável pelo usuário.

## Objetivos

- **Objetivo de Negócio**: Aumentar a descoberta de academias e conversão de novos usuários em 30% através de busca inteligente por proximidade
- **Objetivo de Produto**: Permitir que usuários encontrem academias em até 5km de distância com resultado em menos de 2 segundos
- **Métricas Principais**:
  - Tempo de resposta da busca (< 2s)
  - Taxa de sucesso de busca (% de usuários que encontram academias)
  - Conversão de busca para check-in (% de usuários que visitam a academia após busca)
  - Cobertura geográfica (% de academias cadastradas com coordenadas válidas)

## Histórias de Usuário

- **Como** um novo usuário, **eu quero** buscar academias próximas à minha localização **para que** eu possa escolher a academia mais conveniente para mim
  - Fluxo principal: permitir acesso à geolocalização → buscar academias próximas → exibir resultados ordenados por distância

- **Como** um usuário já cadastrado, **eu quero** salvar minhas academias favoritas **para que** eu acesse rapidamente as minhas academias preferidas sem buscar sempre
  - Caso extremo: usuário com muitos favoritos (50+)

- **Como** um administrador de academia, **eu quero** garantir que minha academia apareça nas buscas de proximidade **para que** eu atraia mais usuários
  - Fluxo: cadastro correto de coordenadas deve fazer academia aparecer em resultados

- **Como** um usuário em movimento, **eu quero** que os resultados se atualizem conforme minha localização muda **para que** eu veja academias relevantes em tempo real
  - Caso extremo: mudança de localização durante uso do app

## Funcionalidades Principais

### 1. Busca por Proximidade com Filtro de Distância

**O que faz**: Permite ao usuário buscar academias em um raio de distância configurável (padrão 5km).

**Por que é importante**: Garante que apenas academias acessíveis geograficamente sejam exibidas, melhorando a experiência do usuário.

**Como funciona em alto nível**:
- Aplicação captura localização GPS do dispositivo
- Envia coordenadas ao backend
- Backend calcula distância entre usuário e cada academia usando fórmula de Haversine
- Retorna academias dentro do raio ordenadas por distância
- Frontend exibe resultados com distância em km

**Requisitos Funcionais**:
1. Sistema deve solicitar permissão de geolocalização ao usuário na primeira busca
2. Usuário pode definir raio de busca entre 1km e 50km (padrão 5km)
3. Busca retorna apenas academias que possuem coordenadas válidas cadastradas
4. Resultados são ordenados por distância crescente
5. Cada resultado exibe: nome da academia, distância em km, endereço, horário de funcionamento

### 2. Visualização e Detalhes da Academia

**O que faz**: Exibe informações detalhadas de uma academia selecionada na busca.

**Por que é importante**: Ajuda o usuário a tomar decisão informada sobre qual academia visitar.

**Como funciona em alto nível**:
- Ao clicar em resultado, sistema exibe card expandido
- Mostra fotos, avaliação, equipamentos, horários, contato

**Requisitos Funcionais**:
6. Card de academia exibe: nome, distância, endereço completo, telefone, horário de funcionamento
7. Card inclui foto de capa da academia (thumbnail)
8. Card mostra avaliação média (stars) com número de avaliações
9. Card exibe lista de equipamentos principais disponíveis
10. Botão "Ver Detalhes" leva para página completa da academia

### 3. Salvamento de Academias Favoritas

**O que faz**: Permite que usuários marquem academias como favoritas para acesso rápido.

**Por que é importante**: Melhora a experiência de usuários frequentes e reduz tempo de busca repetida.

**Como funciona em alto nível**:
- Ícone de coração no card (vazio/preenchido)
- Ao clicar, academia é adicionada/removida dos favoritos
- Aba "Minhas Academias" agrupa favoritos do usuário

**Requisitos Funcionais**:
11. Usuário pode marcar/desmarcar academia como favorita ao clicar em ícone de coração
12. Academias favoritas são persistidas no banco de dados do usuário
13. Máximo de 100 academias favoritas por usuário
14. Lista de favoritos é acessível em aba dedicada, ordenada por nome
15. Ao remover academia (admin), ela é removida automaticamente dos favoritos de todos os usuários

## Experiência do Usuário

### Personas Primárias

- **Novo Usuário Buscador de Academia** (18-45 anos)
  - Necessidade: Encontrar academia próxima rapidamente
  - Frustração: Apps com interface confusa para geolocalização
  - Jornada esperada: 3-4 cliques até encontrar academia desejada

- **Usuário Frequente (Check-in Regular)** (20-50 anos)
  - Necessidade: Acesso rápido à academia habitual
  - Frustração: Ter que buscar novamente toda vez
  - Jornada esperada: Abrir app → acessar favorita → fazer check-in

### Fluxos Principais do Usuário

**Fluxo 1: Primeira Busca (Novo Usuário)**
```
1. Usuário abre abra "Buscar Academias"
2. Sistema pede permissão de geolocalização
3. Usuário concede permissão
4. Sistema exibe mapa com academias próximas (5km padrão)
5. Usuário vê lista de academias ordenadas por distância
6. Usuário clica em academia para ver detalhes
7. Usuário marca como favorita (opcional)
8. Usuário faz check-in ou volta à lista
```

**Fluxo 2: Busca Rápida (Usuário Frequente)**
```
1. Usuário abre abra "Minhas Academias"
2. Sistema exibe academias favoritadas
3. Usuário clica em favorita
4. Sistema exibe detalhes + opção check-in rápido
```

**Fluxo 3: Mudar Raio de Busca**
```
1. Usuário em tela de busca vê slider "Distância Máxima"
2. Usuário arrasta slider de 5km para 10km
3. Sistema recarrega resultados (máximo 2s)
4. Novos resultados são exibidos
```

### Requisitos de UI/UX

- Interface responsiva (mobile-first; tablets e desktop como secundário)
- Mapa interativo com pins de academias e marcador de localização do usuário
- Modo claro/escuro suportado
- Touch-friendly: botões mínimo 44x44px
- Indicador visual de carregamento durante busca (< 2s)
- Mensagem clara se nenhuma academia encontrada
- Feedback visual ao marcar favorita (animação de coração)

### Requisitos de Acessibilidade

- Textos com contraste mínimo WCAG AA
- Suporte a leitores de tela (ARIA labels nas academias listadas)
- Navegação via teclado funcional
- Sem dependência exclusiva de cor para indicar estado (favorita/não favorita)
- Descrições alternativas (alt text) para fotos de academias

## Restrições Técnicas de Alto Nível

- **Integrações Externas**: API de Geocodificação (Google Maps ou similar) para validação de coordenadas; Banco de dados geoespacial para queries eficientes
- **Conformidade e Segurança**: GDPR compliance para dados de geolocalização; permissões de localização devem ser solicitadas explicitamente; dados de geolocalização não devem ser armazenados permanentemente sem consentimento
- **Performance**: Busca deve responder em < 2 segundos para 10.000+ academias; suportar 1.000+ requisições simultâneas
- **Escalabilidade**: Suportar crescimento de academias de 100 para 10.000 no próximo ano
- **Disponibilidade**: Sistema deve estar disponível 99.5% do tempo
- **Privacidade de Dados**: Localização do usuário é sensível; não compartilhar com terceiros sem consentimento explícito

## Fora de Escopo

- Rota otimizada entre múltiplas academias (navegação GPS em tempo real)
- Reserva de aulas através da busca (feito em outro fluxo)
- Recomendação personalizada de academias baseada em histórico (v2)
- Integração com redes sociais para compartilhamento de check-ins
- Busca por tipo de equipamento específico (ex: "piscina olimpica")
- Histórico de preços de academias
- Avaliação/review de usuários (sistema de avaliação já existe, mas não é foco desta feature)
- Suporte a busca por nome de academia (fora de escopo de proximidade; considerar v2)
