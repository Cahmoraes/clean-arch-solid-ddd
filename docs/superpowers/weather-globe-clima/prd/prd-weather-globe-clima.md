---
created_at: "2026-09-02T09:43:00-03:00"
updated_at: "2026-09-02T09:43:00-03:00"
---

# PRD: Globo 3D panorâmico em `/clima`

## Visão Geral

Usuários da rota pública `/clima` hoje conseguem consultar a previsão de uma cidade, mas a experiência é puramente textual. Este recurso adiciona um mapa 3D mundi simples para dar contexto geográfico ao local consultado, tornando a consulta mais visual sem transformar o mapa no mecanismo principal de busca.

O recurso deve preservar o fluxo atual: o usuário informa uma cidade/local, recebe os dados de clima e vê o globo rotacionar para o local resolvido. O mapa é complementar, acessível e seguro para dispositivos com limitações de GPU ou preferência por movimento reduzido.

## Objetivos

- Aumentar clareza geográfica da consulta exibindo a localização da cidade no globo após uma busca bem-sucedida.
- Preservar o fluxo atual de consulta por cidade, sem exigir interação com o mapa para obter clima.
- Manter a experiência utilizável em mobile e em ambientes sem animação/WebGL.
- Garantir rastreabilidade entre resposta de clima, coordenadas exibidas e resultado visual.

## Histórias de Usuário

- **US-01** — Como visitante da página de clima, eu quero ver a cidade consultada destacada em um mapa mundi para que eu entenda visualmente onde o clima está sendo exibido · **UI:** sim
- **US-02** — Como visitante da página de clima, eu quero que a busca por cidade continue simples para que eu consulte o clima sem aprender uma interação nova · **UI:** sim
- **US-03** — Como usuário em dispositivo móvel ou com preferência por movimento reduzido, eu quero uma versão estável do recurso para que a página continue confortável e funcional · **UI:** sim
- **US-04** — Como usuário curioso, eu quero poder girar, aproximar e resetar o globo sem mudar a cidade consultada para que eu explore o contexto visual sem perder o resultado atual · **UI:** sim

## Funcionalidades Principais

### Globo contextual na página de clima

- **FR-001** (US-01, US-02) — A rota `/clima` deve exibir um mapa 3D mundi panorâmico como parte da experiência principal de consulta.
- **FR-002** (US-01) — Após uma consulta bem-sucedida, o mapa deve destacar exatamente uma cidade/local: o local resolvido para a consulta atual.
- **FR-003** (US-01) — O mapa deve rotacionar ou reposicionar a visualização para o local consultado quando a resposta de clima trouxer coordenadas válidas.
- **FR-004** (US-02) — A busca textual por cidade/local deve continuar sendo a única forma de alterar a cidade consultada nesta versão.

### Resultado climático preservado

- **FR-005** (US-02) — A página deve continuar exibindo cidade, temperatura atual, mínima e máxima para a consulta atual.
- **FR-006** (US-02) — A ausência, falha ou indisponibilidade do mapa não deve impedir o usuário de consultar ou ler o clima.

### Interação híbrida view-only

- **FR-007** (US-04) — O usuário deve poder girar, aproximar e resetar a visualização do globo quando a versão interativa estiver disponível.
- **FR-008** (US-04) — Interações manuais no globo não devem alterar a cidade consultada, a URL, a query ativa ou disparar nova consulta de clima.

### Fallback e conforto

- **FR-009** (US-03) — Quando movimento reduzido estiver ativo, a experiência deve apresentar uma versão estática do local consultado, sem rotação contínua.
- **FR-010** (US-03) — Quando a renderização 3D não estiver disponível, a página deve apresentar uma alternativa visual estática com texto indicando o local consultado.
- **FR-011** (US-03) — As informações essenciais do clima e da cidade devem estar disponíveis em texto, independentemente do estado visual do mapa.

### Coordenadas do local consultado

- **FR-012** (US-01, US-02) — A resposta de clima consumida pelo frontend deve conter latitude e longitude do local resolvido para permitir posicionamento do mapa.
- **FR-013** (US-01) — O marcador visual deve corresponder às coordenadas retornadas para a consulta atual.

## Experiência do Usuário

A jornada começa como hoje: o usuário acessa `/clima`, lê a proposta da tela e informa uma cidade/local no campo de busca. Após enviar, a página mantém os dados climáticos em destaque e adiciona contexto geográfico com um globo panorâmico.

O globo deve parecer parte do layout, não um painel técnico separado. O visual aprovado usa fundo escuro, um único marcador e hierarquia simples: copy e busca no topo, globo amplo no centro visual e resultado climático abaixo. O artefato visual de referência está em `docs/superpowers/weather-globe-clima/specs/mockups/weather-globe-clima-visual.md`.

Usuários que não podem ou não querem animação recebem uma versão estática. Usuários que interagem com o globo podem explorar a visualização, mas a consulta continua vinculada ao texto pesquisado.

## Restrições Técnicas de Alto Nível

- A experiência deve priorizar performance mobile: a renderização do globo não pode bloquear a busca nem o resultado climático.
- A experiência deve respeitar `prefers-reduced-motion` e oferecer alternativa estática quando necessário.
- A funcionalidade depende de latitude e longitude na resposta de clima consumida pelo frontend.
- O recurso deve manter simplicidade de manutenção: um mapa contextual, sem camadas meteorológicas, múltiplos marcadores ou seleção pelo globo.
- O contrato entre backend e frontend deve permanecer rastreável por tipos compartilhados.

## Fora de Escopo

- Selecionar nova cidade/local clicando ou tocando no globo.
- Exibir múltiplos marcadores, histórico de buscas, rotas, arcos ou camadas meteorológicas.
- Substituir a busca textual atual por busca via mapa.
- Alterar regras de desambiguação de cidades homônimas.
- Tornar o mapa requisito para exibir o clima.
