# Cookie

### Versão
- **Versão atual no projeto**: 1.0.2

## Principais Características

O **cookie** é uma biblioteca básica de parsing e serialização de cookies HTTP para servidores Node.js. É uma das bibliotecas mais fundamentais e minimalistas para manipulação de cookies:

- **Parser de cookies HTTP**: Converte strings de cabeçalho Cookie em objetos JavaScript
- **Serialização de cookies**: Transforma pares nome-valor em strings Set-Cookie
- **Codificação/decodificação**: Suporte para funções customizadas de encode/decode
- **Conformidade RFC**: Implementa a especificação RFC 6265 para cookies HTTP
- **Zero dependências**: Biblioteca pura sem dependências externas
- **Leve e rápida**: Implementação minimalista focada em performance

### Funcionalidades Principais
- Parsing de cabeçalhos Cookie recebidos
- Serialização de cookies para cabeçalhos Set-Cookie
- Suporte completo aos atributos de cookie (expires, maxAge, domain, path, etc.)
- Funções customizáveis de codificação e decodificação

## Casos de Uso

### 1. Parsing de Cookies Recebidos
```typescript
import * as cookie from 'cookie'

// Parsing de cabeçalho Cookie
const cookieHeader = 'sessionId=abc123; userId=456; preferences=dark_mode'
const cookies = cookie.parse(cookieHeader)
console.log(cookies)
// { sessionId: 'abc123', userId: '456', preferences: 'dark_mode' }
```

### 2. Serialização de Cookies
```typescript
import * as cookie from 'cookie'

// Criação básica de cookie
const setCookieHeader = cookie.serialize('sessionId', 'abc123')
console.log(setCookieHeader)
// 'sessionId=abc123'

// Cookie com opções
const setCookieWithOptions = cookie.serialize('authToken', 'xyz789', {
  httpOnly: true,
  secure: true,
  maxAge: 3600, // 1 hora
  path: '/'
})
// 'authToken=xyz789; Max-Age=3600; Path=/; HttpOnly; Secure'
```

### 3. Middleware de Parsing em Express
```typescript
import express from 'express'
import * as cookie from 'cookie'

const app = express()

// Middleware para parsing de cookies
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie
  if (cookieHeader) {
    req.cookies = cookie.parse(cookieHeader)
  } else {
    req.cookies = {}
  }
  next()
})

app.get('/profile', (req, res) => {
  const sessionId = req.cookies.sessionId
  if (!sessionId) {
    return res.status(401).json({ error: 'Não autenticado' })
  }
  
  // Lógica de autenticação...
  res.json({ message: 'Perfil do usuário' })
})
```

### 4. Helper para Definir Cookies
```typescript
import * as cookie from 'cookie'
import { Response } from 'express'

export class CookieHelper {
  static setAuthToken(res: Response, token: string) {
    const cookieString = cookie.serialize('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    })
    
    res.setHeader('Set-Cookie', cookieString)
  }

  static setRefreshToken(res: Response, refreshToken: string) {
    const cookieString = cookie.serialize('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/auth'
    })
    
    res.setHeader('Set-Cookie', cookieString)
  }

  static clearAuthCookies(res: Response) {
    const authCookie = cookie.serialize('authToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/'
    })

    const refreshCookie = cookie.serialize('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/auth'
    })

    res.setHeader('Set-Cookie', [authCookie, refreshCookie])
  }
}
```

### 5. Parsing com Decodificação Customizada
```typescript
import * as cookie from 'cookie'

// Função de decodificação customizada
function customDecode(str: string) {
  try {
    // Decodificação Base64 + URL decode
    return decodeURIComponent(Buffer.from(str, 'base64').toString())
  } catch (err) {
    return str
  }
}

// Parsing com decodificação customizada
const cookieHeader = 'userData=eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9'
const cookies = cookie.parse(cookieHeader, {
  decode: customDecode
})
```

### 6. Múltiplos Cookies com Diferentes Configurações
```typescript
import * as cookie from 'cookie'

export function setMultipleCookies(res: Response, data: {
  sessionId: string
  userId: string
  preferences: object
}) {
  const cookies = [
    // Session cookie - expira quando browser fecha
    cookie.serialize('sessionId', data.sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/'
    }),

    // User ID cookie - persiste por 30 dias
    cookie.serialize('userId', data.userId, {
      maxAge: 30 * 24 * 60 * 60,
      secure: true,
      sameSite: 'lax',
      path: '/'
    }),

    // Preferences cookie - acessível pelo JavaScript
    cookie.serialize('preferences', JSON.stringify(data.preferences), {
      maxAge: 365 * 24 * 60 * 60, // 1 ano
      secure: true,
      sameSite: 'lax',
      path: '/'
    })
  ]

  res.setHeader('Set-Cookie', cookies)
}
```

### 7. Validação e Sanitização de Cookies
```typescript
import * as cookie from 'cookie'

export class CookieValidator {
  static sanitize(value: string): string {
    // Remove caracteres especiais não permitidos
    return value.replace(/[^\w\-_.~]/g, '')
  }

  static isValidName(name: string): boolean {
    // RFC 6265 - nomes válidos para cookies
    const validNameRegex = /^[a-zA-Z0-9!#$&-^_]+$/
    return validNameRegex.test(name)
  }

  static safeSerialize(name: string, value: string, options = {}) {
    if (!this.isValidName(name)) {
      throw new Error(`Nome de cookie inválido: ${name}`)
    }

    const sanitizedValue = this.sanitize(value)
    return cookie.serialize(name, sanitizedValue, options)
  }

  static safeParse(cookieHeader: string) {
    try {
      return cookie.parse(cookieHeader)
    } catch (error) {
      console.error('Erro ao fazer parse dos cookies:', error)
      return {}
    }
  }
}
```

## Principais Métodos

### cookie.parse(str, options)
- **Propósito**: Converte string de cabeçalho Cookie em objeto JavaScript
- **Parâmetros**: 
  - `str`: String do cabeçalho Cookie
  - `options`: Objeto com opções de parsing (decode)
- **Retorno**: Objeto com pares nome-valor dos cookies

### cookie.serialize(name, value, options)
- **Propósito**: Converte nome e valor em string Set-Cookie
- **Parâmetros**:
  - `name`: Nome do cookie
  - `value`: Valor do cookie
  - `options`: Objeto com opções de serialização
- **Retorno**: String formatada para cabeçalho Set-Cookie

## Opções de Serialização

### Segurança
- `httpOnly`: Previne acesso via JavaScript (boolean)
- `secure`: Apenas HTTPS (boolean)
- `sameSite`: Proteção CSRF ('strict', 'lax', 'none')

### Expiração
- `maxAge`: Tempo de vida em segundos (number)
- `expires`: Data de expiração específica (Date)

### Escopo
- `domain`: Domínio do cookie (string)
- `path`: Caminho do cookie (string)

### Codificação
- `encode`: Função customizada para codificar valores
- `decode`: Função customizada para decodificar valores (apenas parse)

## Boas Práticas

1. **Segurança em produção**: Sempre use `secure: true` e `httpOnly: true` para cookies sensíveis
2. **SameSite protection**: Configure `sameSite` para prevenir ataques CSRF
3. **Escopo mínimo**: Use `path` e `domain` específicos para limitar o escopo
4. **Tempo de vida adequado**: Configure `maxAge` apropriado para cada tipo de cookie
5. **Validação de entrada**: Sempre valide e sanitize valores de cookies
6. **Tratamento de erros**: Implemente tratamento adequado para parsing failures

## Integração com Arquitetura Limpa

Na arquitetura limpa do projeto, a biblioteca cookie é utilizada principalmente na camada de infraestrutura:

- **Gateways**: Implementação de interfaces de gerenciamento de sessão
- **Controllers**: Definição e leitura de cookies em requisições HTTP
- **Middlewares**: Parsing automático de cookies em todas as requisições
- **Services**: Utilities para manipulação segura de cookies

O cookie oferece uma base sólida e conformante com padrões para manipulação de cookies HTTP, essencial para gestão de sessões e autenticação em aplicações web.
