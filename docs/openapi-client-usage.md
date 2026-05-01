# Client OpenAPI Tipado

## Visao Geral

Este projeto gera automaticamente types TypeScript a partir da spec OpenAPI (`docs/openapi-spec.json`) usando `openapi-typescript`. O client HTTP tipado utiliza `openapi-fetch` para garantir type-safety em todas as chamadas de API.

## Geracao de Types

Execute o script de geracao sempre que a spec OpenAPI for atualizada:

```bash
pnpm openapi:generate-client
```

Os types sao gerados em `src/shared/infra/openapi/generated/api-types.d.ts`.

> **Nota**: O diretorio `generated/` esta no `.gitignore`. Os types devem ser regenerados apos cada alteracao na spec.

## Uso com openapi-fetch

### Configuracao basica

```typescript
import createClient from "openapi-fetch"
import type { paths } from "@/shared/infra/openapi/generated/api-types"

const client = createClient<paths>({ baseUrl: "http://localhost:3333" })
```

### Exemplos de uso

#### POST /sessions (autenticacao)

```typescript
const { data, error } = await client.POST("/sessions", {
  body: { email: "user@example.com", password: "123456" }
})

if (error) {
  console.error("Falha na autenticacao:", error)
} else {
  const token = data.token
}
```

#### GET /users/me (perfil do usuario autenticado)

```typescript
const { data, error } = await client.GET("/users/me", {
  headers: { Authorization: `Bearer ${token}` }
})

if (data) {
  console.log(data.user)
}
```

#### POST /users (criacao de usuario)

```typescript
const { data, error } = await client.POST("/users", {
  body: {
    name: "John Doe",
    email: "john@example.com",
    password: "secure123"
  }
})
```

#### POST /gyms (criacao de academia - apenas ADMIN)

```typescript
const { data, error } = await client.POST("/gyms", {
  headers: { Authorization: `Bearer ${adminToken}` },
  body: {
    title: "Academia Central",
    latitude: -23.5505,
    longitude: -46.6333,
    phone: "11999999999"
  }
})
```

#### GET /gyms/search (busca por nome)

```typescript
const { data } = await client.GET("/gyms/search", {
  params: { query: { q: "Academia", page: "1" } },
  headers: { Authorization: `Bearer ${token}` }
})
```

#### POST /gyms/:gymId/check-ins (realizar check-in)

```typescript
const { data, error } = await client.POST("/gyms/{gymId}/check-ins", {
  params: { path: { gymId: "gym-uuid" } },
  headers: { Authorization: `Bearer ${token}` },
  body: {
    userLatitude: -23.5505,
    userLongitude: -46.6333
  }
})
```

## Beneficios

- **Type-safety completo**: Request body, response body, params e query tipados
- **Autocompletar**: IDEs sugerem paths, metodos e campos disponiveis
- **Validacao em tempo de compilacao**: Erros de tipo detectados antes do runtime
- **Sincronizacao com a API**: Types sempre refletem o estado atual da spec

## Fluxo de Trabalho Recomendado

1. Alterar endpoints na aplicacao
2. Exportar spec: `pnpm openapi:export`
3. Regenerar types: `pnpm openapi:generate-client`
4. Atualizar codigo consumidor conforme novos types
