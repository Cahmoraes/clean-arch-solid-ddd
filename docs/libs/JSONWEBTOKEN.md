# JSON Web Token (jsonwebtoken)

### Versão
- **Versão atual no projeto**: 9.0.2

## Principais Características

O **jsonwebtoken** é uma implementação JavaScript para Node.js do padrão JSON Web Token (RFC 7519). É uma biblioteca robusta e amplamente utilizada para:

- **Autenticação baseada em tokens**: Criação e verificação de tokens JWT para autenticação de usuários
- **Transmissão segura de informações**: Tokens auto-contidos e assinados digitalmente
- **Múltiplos algoritmos**: Suporte para HMAC, RSA, ECDSA e algoritmos de assinatura
- **Configuração flexível**: Opções para expiração, audience, issuer e outras claims padrão
- **Stateless**: Não requer armazenamento de sessão no servidor

### Estrutura do JWT
Um JWT consiste em três partes separadas por pontos (.):
1. **Header**: Contém o tipo de token (JWT) e algoritmo de assinatura
2. **Payload**: Contém as claims (informações sobre o usuário)
3. **Signature**: Garante que o token não foi alterado

## Casos de Uso

### 1. Autenticação de Usuários
```typescript
import jwt from 'jsonwebtoken'

// Criação de token após login
const payload = { 
  userId: user.id, 
  email: user.email 
}
const token = jwt.sign(payload, process.env.JWT_SECRET, { 
  expiresIn: '1d' 
})

// Verificação de token
const decoded = jwt.verify(token, process.env.JWT_SECRET)
```

### 2. Middleware de Autenticação
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthRequest extends Request {
  user?: any
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' })
  }
}
```

### 3. Refresh Token
```typescript
interface TokenPair {
  accessToken: string
  refreshToken: string
}

export function generateTokens(payload: any): TokenPair {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '15m' 
  })
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { 
    expiresIn: '7d' 
  })

  return { accessToken, refreshToken }
}
```

### 4. Token com Claims Customizadas
```typescript
export function createUserToken(user: User) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    iss: 'api-solid',
    aud: 'api-solid-client'
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h',
    algorithm: 'HS256'
  })
}
```

### 5. Verificação com Tratamento de Erros
```typescript
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken'

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string)
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Token expirado')
    }
    if (error instanceof JsonWebTokenError) {
      throw new Error('Token inválido')
    }
    throw new Error('Erro ao verificar token')
  }
}
```

### 6. Decodificação sem Verificação
```typescript
// Para extrair informações do header ou payload sem verificar assinatura
export function decodeTokenWithoutVerification(token: string) {
  const decoded = jwt.decode(token, { complete: true })
  
  if (!decoded) {
    throw new Error('Token inválido')
  }

  return {
    header: decoded.header,
    payload: decoded.payload
  }
}
```

### 7. Configuração com Algoritmos Específicos
```typescript
// Usando RSA (necessário para chaves públicas/privadas)
const privateKey = fs.readFileSync('private.pem')
const publicKey = fs.readFileSync('public.pem')

// Criação com RSA
const token = jwt.sign(payload, privateKey, { 
  algorithm: 'RS256',
  expiresIn: '1h' 
})

// Verificação com RSA
const decoded = jwt.verify(token, publicKey, { 
  algorithms: ['RS256'] 
})
```

## Principais Métodos

### jwt.sign()
- **Propósito**: Criação e assinatura de tokens JWT
- **Parâmetros**: payload, secret/privateKey, options, callback (opcional)
- **Retorno**: String do token JWT

### jwt.verify()
- **Propósito**: Verificação e decodificação de tokens JWT
- **Parâmetros**: token, secret/publicKey, options, callback (opcional)
- **Retorno**: Payload decodificado ou erro

### jwt.decode()
- **Propósito**: Decodificação sem verificação de assinatura
- **Parâmetros**: token, options
- **Retorno**: Header, payload e signature decodificados

## Configurações Importantes

### Opções de Assinatura
- `algorithm`: Algoritmo de assinatura (HS256, RS256, etc.)
- `expiresIn`: Tempo de expiração (ex: '1h', '7d', 3600)
- `notBefore`: Token válido apenas após determinado tempo
- `audience`: Audiência do token
- `issuer`: Emissor do token
- `subject`: Assunto do token
- `jwtid`: ID único do token

### Algoritmos Suportados
- **HMAC**: HS256, HS384, HS512
- **RSA**: RS256, RS384, RS512
- **ECDSA**: ES256, ES384, ES512
- **RSA-PSS**: PS256, PS384, PS512

## Boas Práticas

1. **Use segredos fortes**: Utilize chaves de pelo menos 256 bits
2. **Defina expiração**: Sempre configure `expiresIn` para limitar a validade
3. **Valide o audience**: Use `aud` para garantir que o token é para sua aplicação
4. **Tratamento de erros**: Sempre trate `TokenExpiredError` e `JsonWebTokenError`
5. **Refresh tokens**: Implemente refresh tokens para sessões longas
6. **Não armazene informações sensíveis**: O payload é apenas encodificado, não criptografado

## Integração com Arquitetura Limpa

Na arquitetura limpa do projeto, o jsonwebtoken é usado principalmente na camada de infraestrutura:

- **Gateways**: Implementação de interfaces de autenticação
- **Middlewares**: Validação de tokens em rotas protegidas
- **Services**: Geração e verificação de tokens
- **Controllers**: Retorno de tokens após login/registro

O jsonwebtoken oferece uma solução robusta e padronizada para autenticação baseada em tokens, essencial para APIs modernas e seguras.
