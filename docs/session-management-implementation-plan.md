# Plano de Implementação: Sistema de Gerenciamento de Sessões

**Data:** 17 de junho de 2025  
**Decisão:** Implementar Solução 2 - Sessões com ID para revogação de tokens JWT

## Contexto e Decisão

### Problema
O sistema atual utiliza JWT stateless, mas precisamos implementar funcionalidade de logout que invalide tokens de forma segura e eficiente.

### Soluções Avaliadas
1. **Blacklist de Tokens** - Armazenar tokens revogados
2. **Sessões com ID** - Usar sessionId como identificador ✅ **ESCOLHIDA**
3. **Token Versioning** - Versionar tokens por usuário

### Justificativa da Decisão
- **Legibilidade:** Conceito de sessão é claro e familiar
- **Custo de implementação:** Aproveita o `sessionId` já gerado no código atual
- **Segurança:** Controle granular e possibilidade de auditoria
- **Flexibilidade:** Permite logout de dispositivos específicos
- **Performance:** Armazenamento eficiente (apenas IDs de sessão)

## Arquitetura da Solução

### Componentes Principais
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   JWT Token     │    │   Redis Store   │    │  Session Repo   │
│  + sessionId    │◄───┤  session:{id}   │◄───┤   Interface     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Estrutura de Dados
```typescript
// Redis Key Pattern: session:{sessionId}
interface SessionData {
  id: string
  userId: string
  createdAt: Date
}
```

## Etapas de Implementação

### Fase 1: Infraestrutura Base ⏳
**Prioridade:** Alta  
**Estimativa:** 2-3 dias

#### 1.1 Criar Interface de Repositório de Sessão
- [ ] Criar `SessionRepository` interface em `src/session/application/repository/`
- [ ] Definir métodos: `createSession`, `getSession`, `deleteSession`, `deleteUserSessions`

#### 1.2 Implementar Repositório Redis
- [ ] Criar `RedisSessionRepository` em `src/session/infra/repository/`
- [ ] Configurar TTL automático para sessões
- [ ] Implementar cleanup de sessões expiradas

#### 1.3 Configurar Injeção de Dependência
- [ ] Adicionar binding no container IoC
- [ ] Registrar tipo `TYPES.Repositories.Session`

### Fase 2: Modificação do AuthenticateUseCase ⏳
**Prioridade:** Alta  
**Estimativa:** 1 dia

#### 2.1 Atualizar Geração de Tokens
- [ ] Incluir `sessionId` no payload do JWT
- [ ] Persistir sessão no Redis após autenticação bem-sucedida
- [ ] Manter retrocompatibilidade durante transição

#### 2.2 Modificar Assinatura de Métodos Privados
- [ ] Atualizar `signUserToken` para incluir `sessionId`
- [ ] Atualizar `createRefreshToken` para incluir `sessionId`

### Fase 3: Middleware de Validação ⏳
**Prioridade:** Alta  
**Estimativa:** 2 dias

#### 3.1 Criar Middleware de Sessão
- [ ] Criar `SessionValidationMiddleware` em `src/session/infra/middleware/`
- [ ] Validar existência da sessão no Redis
- [ ] Atualizar `lastActivity` em cada requisição válida

#### 3.2 Integrar com Sistema de Autenticação
- [ ] Modificar middleware de JWT existente
- [ ] Adicionar validação de sessão após validação de token
- [ ] Implementar tratamento de erros específicos

### Fase 4: Implementar Logout ⏳
**Prioridade:** Média  
**Estimativa:** 1-2 dias

#### 4.1 Criar LogoutUseCase
- [ ] Criar `LogoutUseCase` em `src/session/application/use-case/`
- [ ] Implementar logout de sessão específica
- [ ] Implementar logout de todas as sessões do usuário

#### 4.2 Criar Controller de Logout
- [ ] Criar endpoint POST `/logout`
- [ ] Criar endpoint POST `/logout/all`
- [ ] Implementar tratamento de erros

### Fase 5: Funcionalidades Avançadas ⏳
**Prioridade:** Baixa  
**Estimativa:** 2-3 dias

#### 5.1 Gestão de Sessões
- [ ] Endpoint para listar sessões ativas do usuário
- [ ] Endpoint para revogar sessão específica
- [ ] Informações de dispositivo e localização

#### 5.2 Monitoramento e Auditoria
- [ ] Logs de criação/destruição de sessões
- [ ] Métricas de sessões ativas
- [ ] Alertas de sessões suspeitas

### Fase 6: Testes e Documentação ⏳
**Prioridade:** Alta  
**Estimativa:** 2 dias

#### 6.1 Testes Unitários
- [ ] Testes para `SessionRepository`
- [ ] Testes para `AuthenticateUseCase` modificado
- [ ] Testes para `LogoutUseCase`
- [ ] Testes para middleware de validação

#### 6.2 Testes de Integração
- [ ] Fluxo completo: login → uso → logout
- [ ] Cenários de erro e edge cases
- [ ] Performance com múltiplas sessões

#### 6.3 Documentação
- [ ] Atualizar documentação da API
- [ ] Documentar configuração do Redis
- [ ] Guia de troubleshooting

## Configuração Necessária

### Variáveis de Ambiente
```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=604800  # 7 dias em segundos
REDIS_SESSION_PREFIX=session:

# Session Configuration
SESSION_CLEANUP_INTERVAL=3600  # 1 hora em segundos
MAX_SESSIONS_PER_USER=5
```

### Dependências
```json
{
  "dependencies": {
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

## Considerações de Segurança

### Implementadas
- [x] SessionId aleatório e único
- [x] TTL automático para sessões
- [ ] Validação de integridade da sessão
- [ ] Rate limiting por IP
- [ ] Detecção de sessões concorrentes suspeitas

### Recomendações Futuras
- Implementar rotação de sessionId
- Adicionar fingerprinting de dispositivos
- Monitoramento de padrões de acesso anômalos
- Implementar 2FA para operações sensíveis

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Falha do Redis | Média | Alto | Implementar fallback graceful |
| Performance degradation | Baixa | Médio | Monitoramento e cache local |
| Sessões órfãs | Média | Baixo | Cleanup automático |
| Ataques de enumeração | Baixa | Médio | Rate limiting e logs |

## Critérios de Aceite

### Funcionais
- [ ] Usuário pode fazer logout e token fica inválido
- [ ] Usuário pode fazer logout de todos os dispositivos
- [ ] Sistema limpa sessões expiradas automaticamente
- [ ] Performance não degrada significativamente

### Não Funcionais
- [ ] Tempo de resposta < 100ms para validação de sessão
- [ ] Suporte a pelo menos 10.000 sessões simultâneas
- [ ] Zero downtime durante deploy
- [ ] Cobertura de testes > 90%

## Cronograma

| Fase | Início | Fim | Responsável |
|------|--------|-----|-------------|
| Fase 1 | Semana 1 | Semana 1 | Backend Team |
| Fase 2 | Semana 2 | Semana 2 | Backend Team |
| Fase 3 | Semana 2 | Semana 3 | Backend Team |
| Fase 4 | Semana 3 | Semana 3 | Backend Team |
| Fase 5 | Semana 4 | Semana 4 | Backend Team |
| Fase 6 | Semana 4 | Semana 5 | QA + Backend |

**Total estimado:** 4-5 semanas

## Aprovações

- [ ] Arquiteto de Software
- [ ] Tech Lead
- [ ] Security Team
- [ ] DevOps Team

---

**Próxima revisão:** 24 de junho de 2025  
**Responsável pela implementação:** Backend Team  
**Documento mantido por:** [Seu Nome]
