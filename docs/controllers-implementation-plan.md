# 📋 Plano de Implementação - Controllers Restantes

**Data de Criação**: 21 de Junho de 2025  
**Status**: Pendente  
**Estimativa**: 6-8 horas de desenvolvimento  

## 🎯 Objetivo

Implementar os controllers HTTP restantes para completar a funcionalidade da API, garantindo que todos os casos de uso existentes tenham suas respectivas interfaces HTTP.

## 📊 Status Atual

### ✅ Controllers Já Implementados
- [x] `ActivateUserController` - Ativação de usuários
- [x] `ChangePasswordController` - Alteração de senha
- [x] `CreateUserController` - Criação de usuários
- [x] `MyProfileController` - Perfil do usuário logado
- [x] `UserProfileController` - Perfil de usuário específico
- [x] `FetchUsersController` - Listagem de usuários
- [x] `UpdateUserProfileController` - Atualização de perfil
- [x] `UserMetricsController` - Métricas do usuário
- [x] `CreateGymController` - Criação de academias
- [x] `SearchGymController` - Busca de academias
- [x] `CheckInController` - Realização de check-in
- [x] `ValidateCheckInController` - Validação de check-in
- [x] `MetricsController` - Métricas de check-in

### 🚧 Controllers a Implementar
- [ ] `FetchNearbyGymController`
- [ ] `CheckInHistoryController`

## 🎯 Implementações Necessárias

### 1. FetchNearbyGymController

**Descrição**: Controller para buscar academias próximas a uma coordenada específica.

**Use Case Existente**: ✅ `FetchNearbyGym` já implementado

#### 📝 Especificações

**Rota**: `GET /gyms/nearby`  
**Autenticação**: Não obrigatória  
**Query Parameters**:
- `latitude` (number): Latitude do usuário (-90 a 90)
- `longitude` (number): Longitude do usuário (-180 a 180)

**Exemplo de Requisição**:
```http
GET /gyms/nearby?latitude=-23.55052&longitude=-46.633308
```

**Resposta de Sucesso (200)**:
```json
[
  {
    "id": "uuid",
    "title": "Academia do João",
    "description": "Academia completa",
    "latitude": -23.55052,
    "longitude": -46.633308,
    "phone": "11999999999"
  }
]
```

**Respostas de Erro**:
- `400 Bad Request`: Coordenadas inválidas
- `404 Not Found`: Nenhuma academia encontrada

#### 🛠️ Implementação

**Arquivo**: `src/gym/infra/controller/fetch-nearby-gym.controller.ts`

**Schema de Validação**:
```typescript
const fetchNearbyGymSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})
```

**Dependências**:
- `HttpServer` (Fastify)
- `FetchNearbyGym` UseCase

### 2. CheckInHistoryController

**Descrição**: Controller para buscar o histórico de check-ins do usuário logado.

**Use Case Existente**: ✅ `CheckInHistoryUseCase` já implementado

#### 📝 Especificações

**Rota**: `GET /check-ins/history`  
**Autenticação**: ✅ Obrigatória (JWT Token)  
**Query Parameters**:
- `page` (number, opcional): Página da paginação (default: 1)

**Exemplo de Requisição**:
```http
GET /check-ins/history?page=1
Authorization: Bearer <jwt-token>
```

**Resposta de Sucesso (200)**:
```json
{
  "userId": "uuid",
  "checkIns": [
    {
      "id": "uuid",
      "gymId": "uuid",
      "gymTitle": "Academia do João",
      "location": {
        "latitude": -23.55052,
        "longitude": -46.633308
      },
      "createdAt": "2025-06-21T10:00:00Z",
      "validatedAt": null,
      "isValidated": false
    }
  ]
}
```

**Respostas de Erro**:
- `401 Unauthorized`: Token inválido ou ausente
- `400 Bad Request`: Parâmetros inválidos

#### 🛠️ Implementação

**Arquivo**: `src/check-in/infra/controller/check-in-history.controller.ts`

**Schema de Validação**:
```typescript
const checkInHistorySchema = z.object({
  page: z.coerce.number().positive().optional().default(1)
})
```

**Dependências**:
- `HttpServer` (Fastify)
- `CheckInHistoryUseCase`

## 📁 Estrutura de Arquivos a Criar

### Controllers
```
src/
├── gym/infra/controller/
│   ├── fetch-nearby-gym.controller.ts
│   └── fetch-nearby-gym.business-flow-test.ts
└── check-in/infra/controller/
    ├── check-in-history.controller.ts
    └── check-in-history.business-flow-test.ts
```

### Rotas (Atualizar Existentes)
```
src/
├── gym/infra/controller/routes/
│   └── gym-routes.ts (adicionar FETCH_NEARBY)
└── check-in/infra/controller/routes/
    └── check-in-routes.ts (adicionar HISTORY)
```

## 🔧 Configurações Necessárias

### 1. Container IoC

**Arquivo**: `src/shared/infra/ioc/types.ts`
```typescript
// Adicionar aos Controllers
FetchNearbyGym: Symbol.for('FetchNearbyGymController'),
CheckInHistory: Symbol.for('CheckInHistoryController'),
```

**Arquivo**: `src/shared/infra/ioc/module/gym/gym-container.ts`
```typescript
import { FetchNearbyGymController } from '@/gym/infra/controller/fetch-nearby-gym.controller'

// Adicionar binding
bind(TYPES.Controllers.FetchNearbyGym).to(FetchNearbyGymController)
```

**Arquivo**: `src/shared/infra/ioc/module/check-in/check-in-container.ts`
```typescript
import { CheckInHistoryController } from '@/check-in/infra/controller/check-in-history.controller'

// Adicionar binding
bind(TYPES.Controllers.CheckInHistory).to(CheckInHistoryController)
```

### 2. Bootstrap Modules

**Arquivo**: `src/bootstrap/setup-gym-module.ts`
```typescript
import { FetchNearbyGymController } from '@/gym/infra/controller/fetch-nearby-gym.controller'

// Adicionar ao array de controllers
resolve(FetchNearbyGymController),
```

**Arquivo**: `src/bootstrap/setup-check-in-module.ts`
```typescript
import { CheckInHistoryController } from '@/check-in/infra/controller/check-in-history.controller'

// Adicionar ao array de controllers
resolve(CheckInHistoryController),
```

## 📝 Roteiro de Implementação

### Fase 1: FetchNearbyGymController (2-3h)

#### Passo 1.1: Implementar Controller Base
- [ ] Criar arquivo `fetch-nearby-gym.controller.ts`
- [ ] Implementar classe base com injeção de dependências
- [ ] Definir schema de validação
- [ ] Implementar método `callback`
- [ ] Implementar método `init` com registro de rota

#### Passo 1.2: Validação e Tratamento de Erros
- [ ] Implementar parsing de query parameters
- [ ] Validar coordenadas (latitude/longitude)
- [ ] Tratar respostas de erro do use case
- [ ] Implementar resposta de sucesso

#### Passo 1.3: Configurações
- [ ] Adicionar rota em `gym-routes.ts`
- [ ] Registrar no container IoC
- [ ] Atualizar bootstrap module

#### Passo 1.4: Testes
- [ ] Criar teste business-flow
- [ ] Testar cenários de sucesso
- [ ] Testar cenários de erro
- [ ] Validar integração completa

### Fase 2: CheckInHistoryController (3-4h)

#### Passo 2.1: Implementar Controller Base
- [ ] Criar arquivo `check-in-history.controller.ts`
- [ ] Implementar classe base com injeção de dependências
- [ ] Definir schema de validação
- [ ] Implementar método `callback` com autenticação
- [ ] Implementar método `init` com registro de rota

#### Passo 2.2: Autenticação e Autorização
- [ ] Configurar rota como protegida (`isProtected: true`)
- [ ] Extrair `userId` do token JWT
- [ ] Implementar parsing de query parameters com paginação

#### Passo 2.3: Validação e Tratamento de Erros
- [ ] Validar parâmetros de paginação
- [ ] Tratar respostas do use case
- [ ] Implementar resposta de sucesso com dados paginados

#### Passo 2.4: Configurações
- [ ] Adicionar rota em `check-in-routes.ts`
- [ ] Registrar no container IoC
- [ ] Atualizar bootstrap module

#### Passo 2.5: Testes
- [ ] Criar teste business-flow
- [ ] Testar cenários com autenticação
- [ ] Testar paginação
- [ ] Testar cenários de erro
- [ ] Validar integração completa

### Fase 3: Validação Final (1h)

#### Passo 3.1: Testes de Integração
- [ ] Executar todos os testes unitários
- [ ] Executar testes business-flow
- [ ] Validar startup da aplicação
- [ ] Testar rotas via api.http

#### Passo 3.2: Documentação
- [ ] Atualizar arquivo `api.http` com novas rotas
- [ ] Documentar exemplos de uso
- [ ] Atualizar README se necessário

## 🧪 Critérios de Aceitação

### FetchNearbyGymController
- [ ] Rota `GET /gyms/nearby` funcionando
- [ ] Validação de coordenadas implementada
- [ ] Retorna academias dentro do raio de 10km
- [ ] Trata erros de coordenadas inválidas
- [ ] Testes business-flow passando

### CheckInHistoryController
- [ ] Rota `GET /check-ins/history` funcionando
- [ ] Autenticação JWT obrigatória
- [ ] Paginação funcionando corretamente
- [ ] Extrai userId do token automaticamente
- [ ] Retorna histórico do usuário logado
- [ ] Testes business-flow passando

## 🚨 Pontos de Atenção

### Validação
- Validar coordenadas dentro dos limites geográficos válidos
- Implementar parsing seguro de query parameters
- Tratar casos onde nenhuma academia é encontrada

### Autenticação
- Garantir que CheckInHistoryController seja protegido
- Extrair userId corretamente do JWT payload
- Tratar tokens inválidos ou expirados

### Performance
- Considerar cache para busca de academias próximas
- Implementar paginação eficiente no histórico
- Otimizar queries de coordenadas geográficas

### Testes
- Criar cenários de teste abrangentes
- Testar integração com banco de dados
- Validar comportamento com dados reais

## 📚 Referências

- Padrão de controllers existentes no projeto
- Documentação dos Use Cases implementados
- Estrutura de testes business-flow existentes
- Configurações de IoC e bootstrap atuais

## ✅ Checklist Final

Antes de considerar a implementação completa:

- [ ] Ambos os controllers implementados
- [ ] Todas as rotas funcionando
- [ ] Testes business-flow passando
- [ ] Configurações IoC corretas
- [ ] Bootstrap modules atualizados
- [ ] Documentação atualizada
- [ ] Validação manual via api.http
- [ ] Code review realizado
- [ ] Deploy em ambiente de teste validado

---

**Desenvolvedor Responsável**: _A definir_  
**Revisor**: _A definir_  
**Data Limite**: _A definir_
