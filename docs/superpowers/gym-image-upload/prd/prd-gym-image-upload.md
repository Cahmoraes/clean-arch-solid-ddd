---
created_at: "2026-06-06T08:56:49-03:00"
updated_at: "2026-06-06T08:56:49-03:00"
---

# PRD: Upload de Imagem de Academia

## Visão Geral

Hoje as academias do sistema não têm imagem: os cards de `/academias` e a página de detalhe exibem apenas um placeholder, e não há como o administrador cadastrar ou trocar a foto de uma academia. Isso empobrece a experiência de quem navega pela lista e dificulta a identificação visual de cada local.

Esta feature permite que administradores associem uma imagem a cada academia — no cadastro e numa nova tela de edição — com recorte (crop) interativo para enquadramento ideal. A imagem passa a aparecer nos cards da listagem (com tratamento visual de UX) e na página de detalhe. Os arquivos são armazenados em um diretório no próprio backend, sem dependência de blob storage em nuvem. A imagem é opcional; academias sem foto continuam exibindo um placeholder.

## Objetivos

- Administrador consegue cadastrar uma academia já com imagem, enquadrando-a antes de enviar, em um único fluxo.
- Administrador consegue atualizar os dados cadastrais de uma academia existente e trocar sua imagem — capacidade de edição que hoje não existe.
- A listagem `/academias` e o detalhe `/academias/[id]` exibem a imagem da academia com boa experiência visual; academias sem foto exibem placeholder coerente.
- Cada imagem é servida otimizada (webp dimensionado) para não degradar o carregamento da listagem.
- Zero regressões nos fluxos existentes de cadastro e listagem de academias.

## Histórias de Usuário

- **US-01** — Como administrador, eu quero enviar uma imagem ao cadastrar uma academia para que ela já apareça identificada visualmente na listagem
- **US-02** — Como administrador, eu quero enquadrar (crop) a imagem antes de enviar para que ela encaixe corretamente no formato dos cards sem distorção
- **US-03** — Como administrador, eu quero uma tela para atualizar os dados cadastrais de uma academia existente para que eu possa corrigir e manter as informações atualizadas
- **US-04** — Como administrador, eu quero trocar a imagem de uma academia já cadastrada para que eu possa substituir uma foto desatualizada ou ausente
- **US-05** — Como administrador, eu quero poder cadastrar uma academia sem imagem para que o cadastro não fique bloqueado quando eu ainda não tiver uma foto
- **US-06** — Como visitante da lista de academias, eu quero ver a imagem de cada academia nos cards com um tratamento visual agradável para que a navegação seja mais atraente e fácil de escanear
- **US-07** — Como visitante, eu quero ver a imagem da academia na página de detalhe para que eu reconheça o local
- **US-08** — Como visitante, eu quero ver um placeholder elegante quando a academia não tem foto para que a interface permaneça consistente
- **US-09** — Como membro (não-admin), eu quero ser impedido de acessar as telas de cadastro e edição de academia para que apenas administradores gerenciem esses dados

## Funcionalidades Principais

### 1. Upload de imagem no cadastro

Permite anexar uma imagem ao criar uma academia, com recorte interativo.

**FR-001** — A tela de cadastro de academia deve permitir selecionar um arquivo de imagem do dispositivo.
**FR-002** — Após selecionar a imagem, o administrador deve poder ajustar o enquadramento (arrastar e dar zoom) com preview na proporção usada pelos cards (16:9) antes de confirmar.
**FR-003** — A imagem é opcional: deve ser possível concluir o cadastro sem enviar nenhuma imagem.
**FR-004** — Durante o envio da imagem, a interface deve exibir estado de carregamento; em caso de falha, deve exibir mensagem de erro sem bloquear o restante do cadastro já concluído.
**FR-005** — Arquivos enviados devem ser limitados a no máximo 5MB e a tipos de imagem; arquivos fora desses limites devem ser rejeitados com mensagem clara.

### 2. Tela de edição de academia

Nova tela para atualizar dados cadastrais e imagem de uma academia existente.

**FR-006** — Deve existir uma tela de edição que carregue os dados atuais da academia e permita alterá-los (título, descrição, telefone, localização, endereço e CNPJ).
**FR-007** — A tela de edição deve permitir trocar a imagem da academia, reutilizando o mesmo recorte interativo do cadastro.
**FR-008** — Ao salvar uma nova imagem, a imagem anterior da academia deve deixar de ser referenciada e ser removida do armazenamento.
**FR-009** — A atualização dos dados cadastrais deve ser independente da troca de imagem: alterar dados não exige reenviar a imagem, e trocar a imagem não exige reeditar os dados.

### 3. Exibição da imagem na listagem

Os cards de `/academias` passam a mostrar a imagem com tratamento visual de UX.

**FR-010** — Cada card de academia deve exibir a imagem da academia preenchendo a área de imagem do card sem distorção (recorte tipo cover).
**FR-011** — A área de imagem do card deve aplicar um overlay com gradiente inferior para garantir legibilidade de elementos sobrepostos (ex: selo "Disponível").
**FR-012** — Ao passar o mouse sobre o card, a imagem deve aplicar um efeito de zoom suave com leve aumento de brilho.
**FR-013** — Academias sem imagem devem exibir um placeholder visual coerente no lugar da foto.

### 4. Exibição da imagem no detalhe

**FR-014** — A página de detalhe da academia deve exibir a imagem da academia; quando ausente, deve exibir o placeholder.

### 5. Controle de acesso

**FR-015** — As telas de cadastro e edição de academia e as operações de upload/troca de imagem devem ser acessíveis somente a administradores autenticados; tentativa de acesso por membro deve ser impedida (redirecionamento no frontend e recusa no backend).

## Experiência do Usuário

**Fluxo — cadastro com imagem (admin):**
1. Admin acessa o cadastro de academia, preenche os dados e seleciona uma imagem.
2. Ajusta o enquadramento no preview 16:9 e confirma.
3. Salva o cadastro; a academia é criada e a imagem enviada; ao concluir, a academia aparece na listagem já com a foto.

**Fluxo — edição (admin):**
1. Admin abre a tela de edição de uma academia existente (dados pré-carregados).
2. Altera os dados desejados e/ou troca a imagem (com novo enquadramento).
3. Salva; os dados e/ou a imagem são atualizados e refletidos na listagem e no detalhe.

**Fluxo — navegação (visitante):**
1. Visitante abre `/academias` e vê os cards com imagens, gradiente inferior e zoom suave no hover.
2. Abre o detalhe de uma academia e vê a imagem; academias sem foto exibem placeholder.

**Estados da UI:**
- **Loading:** indicador durante o envio da imagem.
- **Erro:** mensagem específica em falha de upload (tamanho/tipo inválido, falha de rede) sem perder o cadastro concluído.
- **Empty (sem foto):** placeholder visual no card e no detalhe.
- **Responsive:** a imagem dos cards e do detalhe se adapta ao layout existente.

## Restrições Técnicas de Alto Nível

Características arquiteturais priorizadas (validadas no design):

- **Usabilidade:** recorte interativo com preview na proporção 16:9; estados de loading e erro explícitos; placeholder quando não há foto.
- **Manutenibilidade:** endpoints cadastrais permanecem em JSON; armazenamento e processamento de imagem isolados atrás de interfaces; cada caso de uso com responsabilidade única.
- **Performance:** imagem servida como webp dimensionado (alvo 800×450) com cache; sem trafegar o arquivo original.

Demais restrições:

- **Armazenamento:** arquivos gravados em um diretório no próprio backend (sem AWS/Azure/GCP), em local configurável fora do build, servidos como assets estáticos com cache.
- **Segurança (higiene mínima, não estrutural):** nome de arquivo gerado no servidor, re-encode obrigatório da imagem no servidor, validação de tipo por conteúdo, limite de 5MB e acesso restrito a admin.
- **Dados:** a referência da imagem (chave/caminho relativo) é persistida junto à academia; a URL pública é derivada na leitura.

## Fora de Escopo

- Múltiplas imagens ou galeria por academia (apenas uma imagem).
- Geração de múltiplas variantes/tamanhos (thumbnail dedicado) — um único tamanho.
- Upload ou edição de imagem por usuários não-admin (ex: donos de academia).
- Armazenamento em blob storage de nuvem (AWS/Azure/GCP).
- Reconciliador automático de arquivos órfãos (apenas remoção da imagem anterior na troca).
- Filtros de imagem configuráveis pelo usuário ou edição avançada além do recorte/zoom.
- CDN, otimização responsiva por densidade de tela (srcset) e lazy-loading avançado.
- Moderação/aprovação de imagens.
