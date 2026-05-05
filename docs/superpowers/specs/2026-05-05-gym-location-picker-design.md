# Gym Location Picker — Design Spec

**Data:** 2026-05-05  
**Escopo:** Frontend (mapa interativo + endereço) + Backend (campo `address` persistido)  
**Página afetada:** `/admin/academias/nova`

---

## Problema

O formulário de cadastro de academias possui dois inputs numéricos (`latitude` e `longitude`) que o administrador precisa preencher manualmente. Isso é propício a erros e gera uma experiência de usuário ruim. Além disso, não há campo para endereço completo da academia.

---

## Solução

Substituir os inputs manuais de lat/lng por um **seletor de localização visual** composto de:

1. Input de endereço com botão "Buscar"
2. Mapa interativo (Leaflet + OpenStreetMap) com marcador posicionável
3. Campos read-only de latitude/longitude (feedback visual)

O endereço completo é persistido no banco de dados junto com as coordenadas.

---

## Decisões

| Questão | Decisão | Motivo |
|---|---|---|
| Biblioteca de mapa | Leaflet + OpenStreetMap | Gratuito, sem API key, adequado para projeto de estudo |
| Geocoding | Nominatim (OpenStreetMap) | Gratuito, sem billing |
| Trigger de geocoding | Enter ou botão "Buscar" | Evita rate-limit do Nominatim (1 req/s) |
| Lat/lng no formulário | Visíveis como read-only | Feedback visual para o admin confirmar coordenadas |
| Campo `address` | Obrigatório no formulário e na API | Admin sempre informa endereço; nullable no DB para compatibilidade |
| Arquitetura do componente | `GymLocationPicker` auto-contido + `useGymLocationPicker` | Encapsulamento limpo, hook testável separadamente |

---

## Arquitetura

### Novos arquivos (frontend)

```
apps/frontend/src/features/gyms/
├── components/
│   ├── gym-location-picker.tsx       ← componente principal (React + Leaflet)
│   └── leaflet-map.tsx               ← sub-componente isolado para dynamic import (ssr: false)
└── hooks/
    └── use-gym-location-picker.ts    ← lógica: geocoding, estado do mapa
```

### Arquivos modificados (frontend)

| Arquivo | Mudança |
|---|---|
| `features/gyms/schemas/create-gym-schema.ts` | Adiciona campo `address: z.string()` obrigatório |
| `features/gyms/api/extended-paths.ts` | Adiciona `address?: string` em `GymSummary` |
| `features/gyms/api/index.ts` | Inclui `address` em `buildCreateGymBody` |
| `app/(authenticated)/admin/academias/nova/page.tsx` | Substitui inputs de lat/lng pelo `GymLocationPicker` via `Controller` |

### Arquivos modificados (backend)

| Arquivo | Mudança |
|---|---|
| `prisma/schema.prisma` | Adiciona `address String?` ao model `Gym` |
| `gym/domain/gym.ts` | Adiciona `address` em props e getter |
| `gym/application/use-case/create-gym.usecase.ts` | Passa `address` na criação da entidade |
| `gym/infra/controller/create-gym.controller.ts` | Adiciona `address: z.string()` no schema Zod |
| `gym/infra/controller/fetch-all-gyms.controller.ts` | Expõe `address` nas respostas JSON |
| Repositórios Prisma e InMemory | Mapeiam `address` em `save()` e `restore()` |

---

## Design dos Componentes Frontend

### `useGymLocationPicker` hook

```typescript
interface UseGymLocationPickerReturn {
  address: string
  latitude: number | null
  longitude: number | null
  isSearching: boolean
  searchError: string | null
  handleAddressChange: (value: string) => void
  handleSearch: () => Promise<void>       // chama Nominatim
  handleMapClick: (lat: number, lng: number) => void  // clique no mapa
}
```

**Comportamento:**
- `handleSearch()`: GET `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1`  
  - Em sucesso: atualiza `latitude`, `longitude`; centraliza mapa no resultado  
  - Em falha (sem resultados): `searchError = "Endereço não encontrado"`
- `handleMapClick()`: atualiza `latitude` e `longitude` com o ponto clicado
- Campo `address` não é sincronizado de volta ao clicar no mapa (o texto digitado permanece)

### `GymLocationPicker` component

```typescript
interface GymLocationPickerProps {
  value: {
    address: string
    latitude: number
    longitude: number
  }
  onChange: (value: { address: string; latitude: number; longitude: number }) => void
  error?: string
}
```

**Estrutura visual (de cima para baixo):**
1. Label "Endereço completo *"
2. Input de texto + botão "Buscar" (lado a lado)
3. Mensagem de erro de geocoding (se houver)
4. Mapa Leaflet (altura ~300px) — carregado com `dynamic(..., { ssr: false })`
5. Dois campos read-only: Latitude | Longitude
6. Mensagem de erro do formulário (prop `error`)

**Integração com react-hook-form:**

```tsx
// em nova/page.tsx
<Controller
  control={control}
  name="location"
  render={({ field, fieldState }) => (
    <GymLocationPicker
      value={field.value}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  )}
/>
```

O schema passa a ter um campo `location` composto:

```typescript
// create-gym-schema.ts
location: z.object({
  address: z.string().min(5, "Informe o endereço completo."),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})
```

O `onSubmit` extrai `values.location.address`, `values.location.latitude`, `values.location.longitude` para montar o body da API.

Os `defaultValues` do formulário mudam de `{ latitude: 0, longitude: 0 }` para `{ location: { address: "", latitude: 0, longitude: 0 } }`.

**Leaflet — SSR:**

```typescript
// Evita erro "window is not defined" no Next.js
const LeafletMap = dynamic(() => import('./leaflet-map'), { ssr: false })
```

O mapa Leaflet é extraído em um sub-componente `LeafletMap` que encapsula `MapContainer`, `TileLayer` e `Marker` do `react-leaflet`.

---

## Design Backend

### Entidade Gym — `gym.ts`

```typescript
export type GymCreateProps = {
  // ... campos existentes ...
  address: string          // obrigatório na criação
}

export type GymRestoreProps = {
  // ... campos existentes ...
  address?: string         // opcional no restore (gymns sem endereço no DB)
}

class Gym {
  private readonly _address?: string

  get address(): string | undefined {
    return this._address
  }
}
```

### API Contract — `POST /gyms`

**Request body (adição):**
```json
{
  "address": "Rua das Flores, 123, São Paulo - SP",
  "latitude": -23.5505,
  "longitude": -46.6333,
  ...
}
```

**Response body — GET /gyms, GET /gyms/:id (adição):**
```json
{
  "id": "...",
  "address": "Rua das Flores, 123, São Paulo - SP",
  "latitude": -23.5505,
  "longitude": -46.6333,
  ...
}
```

### Estratégia de Migration

- Coluna `address String?` (nullable) — gymns existentes no DB não quebram
- `address` é obrigatório no schema Zod do controller — novos cadastros sempre persistem endereço
- `Gym.restore()` aceita `address?: string` — gymns antigas retornadas do DB têm `address: undefined`

---

## Fluxo de Interação (UX)

```
1. Admin acessa /admin/academias/nova
2. Preenche Nome, CNPJ
3. No GymLocationPicker:
   a. Digita endereço no input
   b. Pressiona Enter ou clica "Buscar"
   c. Hook chama Nominatim → obtém lat/lng
   d. Mapa centraliza e exibe marcador
   e. Campos read-only atualizam com coordenadas
   f. (opcional) Admin clica em outro ponto do mapa → marcador e coords atualizam
4. Preenche Descrição e Telefone (opcionais)
5. Clica "Cadastrar academia"
6. API recebe { title, cnpj, address, latitude, longitude, description?, phone? }
7. Backend persiste, retorna { id }
8. Frontend redireciona para /academias/:id
```

---

## Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Endereço não encontrado no Nominatim | Exibe mensagem abaixo do input: "Endereço não encontrado. Tente ser mais específico." |
| Falha de rede na geocodificação | Exibe: "Erro ao buscar endereço. Verifique sua conexão." |
| Submit sem lat/lng definidos (mapa nunca buscado) | Validação Zod bloqueia: `latitude` é 0 (valor default), mas coordenada (0,0) é válida — solução: validação com `.refine()` que rejeita `{ latitude: 0, longitude: 0 }` (coordenada padrão nunca gerada por geocoding real), exigindo que o admin faça a busca antes de submeter.
| Erro de conflito CNPJ (409) | Comportamento existente mantido |

> **Nota sobre validação de coordenadas (0,0):** O schema usa `.refine()` para rejeitar `{ latitude: 0, longitude: 0 }` como inválido, exigindo que o admin realize a busca antes de submeter o formulário.

---

## Dependências a instalar

```bash
pnpm --filter frontend add react-leaflet leaflet
pnpm --filter frontend add -D @types/leaflet
```

Leaflet requer import de CSS via `next.config.ts` ou import direto no componente.

---

## Testes

### Unit tests (frontend)
- `use-gym-location-picker.test.ts`: mock do `fetch` global para Nominatim; testa `handleSearch` (sucesso, sem resultados, erro de rede), `handleMapClick`
- `gym-location-picker.test.tsx`: renderização, interação do input, estado de loading durante busca

### Unit tests (backend)
- `gym.test.ts`: adiciona casos para `address` em `create()` e `restore()`
- `create-gym.usecase.test.ts`: verifica que `address` é persistido

### Business flow tests (backend)
- `create-gym.business-flow-test.ts`: request com `address` no body → 201 com `id`

---

## Fora do Escopo

- Geocodificação reversa (clicar no mapa → preencher campo de endereço automaticamente)
- Autocomplete de endereço enquanto digita
- Exibição do mapa na página de detalhes da academia (`/academias/[id]`)
- Uso do campo `address` na funcionalidade de check-in por proximidade
