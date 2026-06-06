---
created_at: "2026-06-06T08:53:16-03:00"
updated_at: "2026-06-06T08:53:16-03:00"
---

# Upload de Imagem de Academia — Design Spec

## Visão Geral

Adiciona a capacidade de associar uma imagem a cada academia (gym). A feature cobre quatro pontos:

1. **Upload no cadastro** — a tela `/admin/academias/nova` ganha seleção e recorte (crop) interativo da imagem.
2. **Tela de edição** — nova tela `/admin/academias/[id]/editar` para atualizar os dados cadastrais da academia e trocar a imagem (peça nova: hoje só existe criação no backend).
3. **Exibição na listagem** — os cards de `/academias` mostram a imagem com tratamento visual (overlay com gradiente inferior + zoom suave no hover).
4. **Exibição no detalhe** — a página `/academias/[id]` mostra a imagem da academia.

Os arquivos são armazenados em um diretório no próprio backend (sem blob storage de AWS/Azure/GCP) e servidos como assets estáticos. A imagem é **opcional**: academias sem foto exibem um placeholder. Cadastro, edição e upload são restritos a **admins autenticados**.

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | Admin precisa enquadrar a foto para encaixar no card e ter feedback claro do upload | Crop interativo com preview na proporção 16:9; estados de loading e erro explícitos; placeholder quando não há foto |
| Manutenibilidade | ~30 features em Clean Architecture; binário não pode poluir use cases cadastrais | Endpoints cadastrais permanecem JSON; armazenamento e processamento atrás de portas; cada use case com responsabilidade descrita em uma frase |
| Performance | Cards de `/academias` carregam várias imagens por página | Imagem servida como webp dimensionado (800×450) via `@fastify/static` com cache headers; sem binário original gigante trafegado |

**Consideradas, não priorizadas:** Segurança — mantém-se a higiene mínima de upload (filename gerado via UUID no servidor, re-encode obrigatório via `sharp`, checagem de magic-bytes, limite de 5MB, rota `onlyAdmin`), mas não dirige a estrutura (sem virus-scan, sem rate-limit dedicado, sem quarentena). O próprio re-encode no `sharp` já neutraliza a maior parte da superfície de ataque.

---

## Arquitetura e Fluxo de Dados

```
Frontend (Next.js 16)                       Backend (Fastify + Clean Arch)
──────────────────────────────             ──────────────────────────────────────────
/admin/academias/nova
  ├── GymForm (JSON) ──────────────▶  POST /gyms                  CreateGymUseCase (existente)
  └── GymImageUploader (crop) ─────▶  POST /gyms/:id/image        SetGymImageUseCase
                                          ├── ImageProcessor ──▶ SharpImageProcessor (webp 800×450)
                                          └── ImageStorage   ──▶ LocalFileSystemImageStorage (gyms/<uuid>.webp)
/admin/academias/[id]/editar
  ├── GymForm (JSON) ──────────────▶  PUT /gyms/:id               UpdateGymUseCase
  └── GymImageUploader (crop) ─────▶  POST /gyms/:id/image        SetGymImageUseCase

/academias        → GymCard   → GymImage  ──▶ GET /uploads/<image_key>  (@fastify/static + cache)
/academias/[id]   → detalhe   → GymImage  ──▶ GET /uploads/<image_key>
```

**Fluxo de cadastro (2 passos):** o formulário cria a academia em JSON (`POST /gyms`) e recebe o `id`; em seguida o `GymImageUploader` envia o blob já cropado (16:9) via `multipart/form-data` para `POST /gyms/:id/image`. O backend re-encoda a imagem para webp 800×450, grava o arquivo via `ImageStorage` com nome `gyms/<uuid>.webp` e persiste a `image_key` no `Gym`.

**Fluxo de edição:** `PUT /gyms/:id` atualiza os dados cadastrais (JSON puro); a troca de imagem é independente via `POST /gyms/:id/image` — ao gravar a nova imagem, a anterior é removida após o commit da atualização do `Gym`.

**Fluxo de exibição:** `GymImage` deriva a URL pública a partir da `image_key` (`<base>/uploads/<image_key>`) e renderiza com `object-cover` no slot 16:9. Sem `image_key`, exibe o placeholder. `@fastify/static` serve o diretório de uploads com cache headers; como os nomes são UUIDs imutáveis, a troca de imagem gera novo nome (cache-busting automático).

---

## Componentes

### Backend (bounded context `gym` + infra compartilhada)

| Componente | Tipo / Camada | Responsabilidade (uma frase) |
|---|---|---|
| `GymImage` | Value Object (Domain) | Representa a referência persistida da imagem da academia (chave validada, anulável) |
| `ImageProcessor` | Interface (Application) | Re-encoda e normaliza uma imagem para o formato e dimensões alvo |
| `ImageStorage` | Interface (Application) | Persiste, remove e localiza binários de imagem por chave |
| `SetGymImageUseCase` | Use Case (Application) | Define a imagem de uma academia, substituindo a anterior |
| `UpdateGymUseCase` | Use Case (Application) | Atualiza os dados cadastrais de uma academia existente |
| `SharpImageProcessor` | Infra | Implementa `ImageProcessor` via `sharp` (cover crop, webp) |
| `LocalFileSystemImageStorage` | Infra | Implementa `ImageStorage` gravando no diretório local configurado |
| `GymImageController` | Infra | Recebe o upload multipart em `POST /gyms/:id/image` e aciona `SetGymImageUseCase` |
| `UpdateGymController` | Infra | Atende `PUT /gyms/:id` (dados cadastrais) e aciona `UpdateGymUseCase` |

> **Nota sobre nomes (Entity Trap):** `ImageProcessor` e `ImageStorage` terminam em "Processor"/"Storage" mas são **portas técnicas** (mesmo padrão de `Repository`), com responsabilidade única validada — não são depósitos por entidade. `GymImageController`/`UpdateGymController` seguem a convenção de controllers Fastify já estabelecida no projeto (artefatos de código, não componentes lógicos).

Infra adicional:
- **Migration Prisma:** adiciona coluna `image_key` (nullable, string) ao model `Gym`.
- **Plugins Fastify:** registro de `@fastify/multipart` (limite de 5MB, 1 arquivo) e `@fastify/static` (prefixo `/uploads`, `root` = diretório de uploads configurável).

### Frontend (`features/gyms/`)

| Componente | Responsabilidade |
|---|---|
| `GymImageUploader` | Permite ao admin selecionar e enquadrar (crop 16:9) a imagem antes do envio, produzindo o blob cropado |
| `GymImage` | Exibe a imagem da academia (ou placeholder) com o tratamento visual padrão (gradiente inferior + zoom no hover) |
| `useSetGymImage` | Hook de mutation (TanStack Query) que envia o blob cropado a `POST /gyms/:id/image` via `FormData` |
| `useUpdateGym` | Hook de mutation que atualiza os dados cadastrais via `PUT /gyms/:id` |
| Página `/admin/academias/[id]/editar` | Tela de edição reusando o formulário de cadastro + `GymImageUploader` |

Pontos de integração:
- `GymCard` e a página de detalhe `/academias/[id]` passam a renderizar `GymImage` no lugar do placeholder atual.
- A página `/admin/academias/nova` ganha o `GymImageUploader`.
- O `Gym` (tipo do `@repo/api-types`) ganha o campo `imageKey?` após regenerar os tipos.

---

## API Contracts

Todos os endpoints de escrita exigem autenticação de admin (`onlyAdmin: true`).

```
PUT /gyms/:gymId
Body (JSON): { title, description, phone, latitude, longitude, address?, cnpj }
Response: Gym atualizado (inclui imageKey?)

POST /gyms/:gymId/image
Body: multipart/form-data, campo "image" (arquivo único, <= 5MB, image/*)
Processo: valida magic-bytes → re-encoda webp 800×450 (cover) → grava gyms/<uuid>.webp → atualiza image_key → remove imagem antiga
Response: { imageKey: string, url: string }
Erros: 413 (> 5MB), 415 (tipo inválido), 404 (academia inexistente), 403 (não-admin)

GET /uploads/<image_key>        (servido por @fastify/static, com Cache-Control)
```

> O endpoint de imagem fica **fora** do contrato JSON tipado de dados cadastrais; a mutation do frontend usa `FormData` direto (ver Risco sobre tipagem de multipart).

---

## Tratamento Visual / UX

Validado no companion visual (opções **A + B** combinadas):

- **A — overlay com gradiente inferior:** degradê escuro na base da imagem garante legibilidade do badge "Disponível" e de qualquer texto sobreposto.
- **B — zoom suave no hover:** a imagem amplia levemente (`scale(1.07)`) com leve aumento de brilho ao passar o mouse, dando sensação de interatividade.
- **Placeholder (sem foto):** mantém o gradiente diagonal atual do card + ícone, garantindo que academias sem imagem permaneçam visualmente coerentes.
- **Crop:** preview na proporção 16:9 (mesma do slot de exibição), com arrastar/zoom via `react-easy-crop` v5 (compatível com React 19).

Slot de exibição: a área de imagem do card (altura atual ~140px, largura total do card) e o topo do detalhe usam `object-cover` sobre o webp 16:9 — encaixe sem letterbox.

---

## Decisões Arquiteturais

### D1. Armazenamento e processamento de imagem atrás de portas

- **Contexto:** O binário de imagem precisa ser gravado, lido e processado. Alternativas: lógica direta no controller/repository, ou portas (interfaces) na camada de aplicação com implementações na infra.
- **Decisão:** `ImageStorage` e `ImageProcessor` como interfaces na Application, implementadas por `LocalFileSystemImageStorage` e `SharpImageProcessor` na Infra.
- **Justificativa técnica:** Isola a estratégia de storage e de processamento do caso de uso; trocar para S3-compatível no futuro é uma nova implementação, sem tocar `SetGymImageUseCase`.
- **Justificativa de negócio:** Manutenibilidade — a regra de "definir imagem da academia" não muda quando a infra de arquivos mudar.
- **Trade-offs aceitos:** 2 interfaces + 2 implementações adicionais; custo baixo dado o isolamento.

### D2. Upload em 2 passos; endpoints cadastrais permanecem JSON

- **Contexto:** A imagem poderia ir junto no `multipart` do create/update, ou em endpoint dedicado.
- **Decisão:** Endpoint dedicado `POST /gyms/:id/image`; `POST /gyms` e `PUT /gyms/:id` permanecem JSON puro.
- **Justificativa técnica:** Use cases cadastrais não lidam com parsing de arquivo; contrato tipado via OpenAPI/`@repo/api-types` continua simples; testes JSON mais leves.
- **Justificativa de negócio:** Manutenibilidade e velocidade de evolução dos endpoints cadastrais.
- **Trade-offs aceitos:** Request extra no cadastro e estado transitório "academia sem foto" se o upload falhar — aceitável porque a imagem é opcional.

### D3. Re-encode server-side via `sharp` mesmo com crop no cliente

- **Contexto:** O cliente já envia o blob cropado; ainda assim o servidor pode confiar ou reprocessar.
- **Decisão:** O backend sempre re-encoda via `sharp` para webp 800×450 (cover).
- **Justificativa técnica:** Normaliza formato/dimensão independente do que o cliente enviar; remove EXIF e payloads embutidos; garante consistência do asset servido.
- **Justificativa de negócio:** Performance (asset uniforme e otimizado) e a higiene mínima de segurança sem custo de feature dedicada.
- **Trade-offs aceitos:** CPU por upload (irrelevante no volume atual); dependência de binário nativo do `sharp` (ver Riscos).

### D4. DB guarda `image_key` relativa, não URL absoluta

- **Contexto:** Persistir a referência da imagem.
- **Decisão:** Coluna `image_key` (ex: `gyms/<uuid>.webp`); a URL pública é derivada na leitura.
- **Justificativa técnica:** Desacopla de host/CDN/prefixo de serving; permite reconciliação de órfãos.
- **Justificativa de negócio:** Manutenibilidade — mudar host ou migrar para S3 é uma alteração de config, não de dados.
- **Trade-offs aceitos:** A URL precisa ser montada em cada leitura (custo desprezível).

### D5. Crop alvo 16:9 (800×450 webp), exibido com `object-cover`

- **Contexto:** As fotos precisam encaixar nos cards sem distorção.
- **Decisão:** Crop interativo no cliente na proporção 16:9; exibição com `object-cover`.
- **Justificativa técnica:** Proporção única simplifica storage (um arquivo) e serve card e detalhe.
- **Justificativa de negócio:** Usabilidade — admin controla o enquadramento; consistência visual na listagem.
- **Trade-offs aceitos:** Fotos muito verticais perdem bordas no card (comportamento esperado de cover); um único tamanho (sem thumbnail dedicado) — aceito dado o volume atual.

### D6. Diretório de uploads configurável, fora do build

- **Contexto:** Onde gravar os arquivos no backend.
- **Decisão:** Diretório configurável via variável de ambiente (ex: `UPLOAD_DIR`), fora do output de build, servido em `/uploads`.
- **Justificativa técnica:** Arquivos sobrevivem a redeploy; não são empacotados no `dist`.
- **Justificativa de negócio:** Continuidade operacional dos assets.
- **Trade-offs aceitos:** Armazenamento local não replica entre instâncias (limitação aceita — sem escala horizontal prevista); backup do diretório é separado do banco.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `sharp` (binário nativo) quebra no Docker/Alpine | 3 | 2 | 6 🔴 | Pinar versão única do `sharp` no monorepo; validar build no container antes de finalizar |
| Upload da imagem falha após criar a academia | 2 | 2 | 4 🟡 | Imagem opcional — academia fica com placeholder; admin reenvia na edição |
| Arquivos órfãos (upload falho / troca de imagem) | 1 | 2 | 2 🟢 | Remover imagem antiga após commit; (futuro opcional) reconciliador periódico DB↔disco |
| `@repo/api-types` não tipa bem o endpoint multipart | 2 | 2 | 4 🟡 | Endpoint de imagem fora do contrato tipado; mutation usa `fetch`/`FormData` direto, com tipo manual da resposta |
| Path traversal / nome de arquivo malicioso | 3 | 1 | 3 🟢 | Filename gerado server-side via UUID; nunca usar `data.filename` do cliente; `path.resolve` + assert de prefixo ao servir |

> O risco 🔴 do `sharp` deve gerar uma task de validação de build no container no plano de implementação.

---

## Tratamento de Erros

- **Backend:** `POST /gyms/:id/image` retorna 413 (arquivo > 5MB via `limits.fileSize` do `@fastify/multipart`), 415 (mime/magic-byte inválido), 404 (academia inexistente), 403 (não-admin via guard `onlyAdmin`).
- **Frontend:** o `GymImageUploader` exibe estado de loading durante o envio e mensagem de erro específica em falha; o restante do formulário cadastral não é bloqueado por falha no upload da imagem.
- **Exibição:** `GymImage` faz fallback para o placeholder quando `image_key` é ausente (e quando o asset não carrega).

---

## Testes

**Backend (unit):**
- `GymImage` (VO): valida formato da chave e rejeita valores inválidos.
- `SetGymImageUseCase`: mock de `ImageProcessor`, `ImageStorage` e `GymRepository`; verifica re-encode, gravação, atualização da `image_key` e remoção da imagem antiga.
- `UpdateGymUseCase`: mock do repositório; verifica atualização dos campos e erro para academia inexistente.
- `SharpImageProcessor`: verifica re-encode para webp nas dimensões alvo (cover).

**Backend (integração):**
- `POST /gyms/:id/image`: `onlyAdmin` (403 para member), upload real dentro do limite, rejeição > 5MB (413) e tipo inválido (415), 404 para academia inexistente.
- `PUT /gyms/:id`: `onlyAdmin`, atualização persistida, 404 para inexistente.
- Serving estático: asset gravado é acessível em `/uploads/<key>` com cache header.

**Frontend (unit):**
- `GymImageUploader`: seleção de arquivo → crop → produz blob na proporção 16:9; estados de loading/erro.
- `GymImage`: renderiza imagem quando há `image_key`; renderiza placeholder quando ausente.
- `useSetGymImage` / `useUpdateGym`: mutations com MSW (sucesso e erro).

**Frontend (e2e):**
- Admin cadastra academia com foto (crop + upload) e a vê no card e no detalhe.
- Admin edita uma academia: altera dados e troca a imagem.
- Membro não-admin é redirecionado ao tentar acessar `/admin/academias/[id]/editar`.
