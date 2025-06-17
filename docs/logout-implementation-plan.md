# Plano de Implementação: Sistema de Logout com Blacklist JWT

## 📋 Visão Geral

Este documento descreve o plano completo para implementação de um sistema de logout seguro utilizando blacklist de tokens JWT no projeto API Solid. O objetivo é permitir invalidação imediata de tokens, garantindo logout efetivo e segurança contra tokens comprometidos.

## 🎯 Problema a Resolver

Atualmente, nossos JWTs são stateless e não podem ser invalidados antes de sua expiração natural. Isso gera problemas de segurança em cenários como:
- Logout de usuário
- Tokens comprometidos
- Necessidade de revogação imediata de acesso

## 🔧 Solução Proposta: Blacklist JWT

### Por que Blacklist?

A estratégia de blacklist permite manter os benefícios dos JWTs (stateless, performance) enquanto adiciona controle server-side quando necessário:

- **Controle Total**: Capacidade de invalidar qualquer token a qualquer momento
- **Segurança**: Revogação imediata em caso de comprometimento
- **Logout Efetivo**: Garantia de que tokens não serão mais aceitos após logout
- **Auditoria**: Rastreamento de tokens invalidados

### Integração com Redis

**Por que Redis?**
- **Performance**: Consultas extremamente rápidas (< 1ms)
- **TTL Automático**: Limpeza automática de tokens expirados
- **Distribuído**: Compartilhamento entre múltiplas instâncias da aplicação
- **Escalabilidade**: Suporte a alto volume de operações

## 📊 Abordagens de Implementação

### Abordagem 1: Hash Criptográfico (Recomendada)

**Vantagens:**
- Menor uso de memória (hash vs token completo)
- Maior segurança (token original não armazenado)
- Performance otimizada

**Implementação:**
```typescript
// Armazenar apenas SHA-256 do token
const tokenHash = createHash('sha256').update(token).digest('hex')
await redis.setex(`blacklist:${tokenHash}`, ttl, 'revoked')
```

### Abordagem 2: Entidade Token Blacklist

**Vantagens:**
- Metadados ricos (motivo, timestamp, etc.)
- Auditoria completa
- Flexibilidade para futuras extensões

**Implementação:**
```typescript
interface TokenBlacklistEntity {
  id: string
  tokenHash: string
  type: 'access' | 'refresh'
  reason: 'logout' | 'compromised' | 'expired'
  expiresAt: Date
  createdAt: Date
}
```

## 🗺️ Plano de Implementação

### Fase 1: Estrutura Base

#### Passo 1.1: Configuração Redis
- [ ] Configurar conexão Redis no projeto
- [ ] Adicionar variáveis de ambiente para Redis
- [ ] Criar service abstrato para cache operations

#### Passo 1.2: Domain Layer
- [ ] Criar entidade `TokenBlacklist`
- [ ] Definir interface `TokenBlacklistRepository`
- [ ] Criar value objects necessários

#### Passo 1.3: Infrastructure Layer
- [ ] Implementar `RedisTokenBlacklistRepository`
- [ ] Criar helpers para hash de tokens
- [ ] Implementar TTL automático baseado na expiração do JWT

### Fase 2: Use Cases

#### Passo 2.1: Logout Use Case
- [ ] Criar `LogoutUseCase`
- [ ] Implementar validação de tokens
- [ ] Adicionar lógica de blacklist para access e refresh tokens
- [ ] Implementar tratamento de erros

#### Passo 2.2: Token Validation Enhancement
- [ ] Modificar middleware de autenticação
- [ ] Adicionar verificação de blacklist antes da validação JWT
- [ ] Implementar cache local para otimização
- [ ] Adicionar métricas de performance

### Fase 3: Controllers e Rotas

#### Passo 3.1: Logout Controller
- [ ] Criar `LogoutController`
- [ ] Implementar extração de tokens (header + cookies)
- [ ] Adicionar limpeza de cookies
- [ ] Implementar response padronizado

#### Passo 3.2: Integração com Rotas
- [ ] Registrar rota `POST /logout`
- [ ] Configurar middleware de autenticação para logout
- [ ] Adicionar documentação OpenAPI/Swagger

### Fase 4: Testes

#### Passo 4.1: Testes Unitários
- [ ] Testes para `TokenBlacklist` entity
- [ ] Testes para `LogoutUseCase`
- [ ] Testes para `RedisTokenBlacklistRepository`
- [ ] Testes para helpers de hash

#### Passo 4.2: Testes de Integração
- [ ] Testes end-to-end do fluxo de logout
- [ ] Testes de middleware com blacklist
- [ ] Testes de performance e concorrência
- [ ] Testes de cenários de erro

#### Passo 4.3: Testes de Business Flow
- [ ] Fluxo completo: login → logout → tentativa de acesso
- [ ] Cenários com refresh token
- [ ] Testes de expiração automática

### Fase 5: Otimizações e Monitoramento

#### Passo 5.1: Performance
- [ ] Implementar cache local com TTL
- [ ] Otimizar consultas batch para múltiplos tokens
- [ ] Adicionar métricas de latência

#### Passo 5.2: Manutenção
- [ ] Criar job de limpeza para tokens expirados
- [ ] Implementar alertas para falhas no Redis
- [ ] Adicionar logs estruturados

#### Passo 5.3: Documentação
- [ ] Documentar APIs de logout
- [ ] Criar guia de troubleshooting
- [ ] Documentar métricas e monitoramento

## 🏗️ Estrutura de Arquivos

```
src/
├── auth/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── token-blacklist.entity.ts
│   │   ├── repositories/
│   │   │   └── token-blacklist.repository.ts
│   │   └── value-objects/
│   │       └── token-hash.vo.ts
│   ├── application/
│   │   └── use-cases/
│   │       └── logout.usecase.ts
│   └── infra/
│       ├── repositories/
│       │   └── redis-token-blacklist.repository.ts
│       ├── controllers/
│       │   └── logout.controller.ts
│       └── middleware/
│           └── enhanced-jwt-auth.guard.ts
├── shared/
│   └── infra/
│       └── cache/
│           ├── redis.service.ts
│           └── redis.module.ts
└── test/
    ├── auth/
    │   ├── logout.business-flow-test.ts
    │   └── token-blacklist.unit-test.ts
    └── factory/
        └── create-blacklisted-token.ts
```

## 🔧 Configurações Necessárias

### Variáveis de Ambiente
```env
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Blacklist Configuration
BLACKLIST_TTL_BUFFER=300  # 5 minutos buffer adicional
BLACKLIST_CACHE_TTL=60    # Cache local em segundos
```

### Dependências
```json
{
  "ioredis": "^5.3.2",
  "@types/ioredis": "^5.0.0"
}
```

## 📈 Métricas e Monitoramento

### KPIs a Acompanhar
- Latência média de verificação de blacklist
- Taxa de hits no cache local
- Número de tokens blacklistados por período
- Performance do Redis

### Alertas Sugeridos
- Redis indisponível
- Latência de blacklist > 10ms
- Taxa de erro > 1%

## 🚀 Considerações de Deploy

### Pré-requisitos
- Redis configurado e acessível
- Variáveis de ambiente configuradas
- Cache warming opcional

### Rollback Plan
- Desabilitar verificação de blacklist via feature flag
- Fallback para validação JWT tradicional
- Preservar dados de blacklist para reativação

## 📝 Próximos Passos

1. **Revisão do Plano**: Validar abordagem com equipe
2. **Setup Ambiente**: Configurar Redis local/desenvolvimento
3. **Implementação Fase 1**: Começar pela estrutura base
4. **Testes Incrementais**: Testar cada fase antes de prosseguir
5. **Deploy Gradual**: Feature flags para rollout controlado

---

**Estimativa Total**: 3-4 sprints (dependendo do tamanho da equipe)
**Prioridade**: Alta (segurança crítica)
**Risco**: Baixo (implementação bem documentada)
