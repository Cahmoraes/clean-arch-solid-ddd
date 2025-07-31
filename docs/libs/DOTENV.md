# Dotenv

### Versão
- **Versão atual no projeto**: 17.0.1

## Principais Características

O **dotenv** é um módulo zero-dependência que carrega variáveis de ambiente de um arquivo `.env` para `process.env` em aplicações Node.js:

- **Zero dependências**: Biblioteca leve sem dependências externas
- **Configuração simples**: Carregamento automático de variáveis do arquivo .env
- **Múltiplos ambientes**: Suporte para diferentes arquivos .env por ambiente
- **Parsing inteligente**: Converte automaticamente strings em valores apropriados
- **Interpolação**: Suporte para variáveis que referenciam outras variáveis
- **Override control**: Controle sobre sobrescrita de variáveis existentes

### Funcionalidades Principais
- Carregamento de variáveis de ambiente de arquivos .env
- Suporte para comentários e linhas vazias
- Expansão de variáveis (interpolação)
- Múltiplos formatos de arquivo (.env, .env.local, .env.production, etc.)
- Configuração flexível de paths e opções

## Casos de Uso

### 1. Configuração Básica
```typescript
// Carregamento no início da aplicação
import 'dotenv/config'

// Ou de forma explícita
import dotenv from 'dotenv'
dotenv.config()

// Arquivo .env
// NODE_ENV=development
// PORT=3000
// DATABASE_URL=postgresql://localhost:5432/myapp
// JWT_SECRET=my-super-secret-key
// API_KEY=your-api-key-here
```

### 2. Configuração para Diferentes Ambientes
```typescript
import dotenv from 'dotenv'
import path from 'path'

// Configuração baseada no ambiente
const env = process.env.NODE_ENV || 'development'
const envPath = path.resolve(process.cwd(), `.env.${env}`)

dotenv.config({ path: envPath })

// Fallback para .env padrão se específico não existir
dotenv.config()

// Estrutura de arquivos:
// .env                 # Valores padrão
// .env.development     # Desenvolvimento
// .env.test           # Testes
// .env.staging        # Staging
// .env.production     # Produção
```

### 3. Classe de Configuração Centralizada
```typescript
import dotenv from 'dotenv'

// Carregar variáveis
dotenv.config()

export class Config {
  // Servidor
  static readonly PORT = Number(process.env.PORT) || 3000
  static readonly NODE_ENV = process.env.NODE_ENV || 'development'
  static readonly HOST = process.env.HOST || 'localhost'

  // Database
  static readonly DATABASE_URL = process.env.DATABASE_URL!
  static readonly DATABASE_SSL = process.env.DATABASE_SSL === 'true'

  // Autenticação
  static readonly JWT_SECRET = process.env.JWT_SECRET!
  static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'
  static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

  // APIs Externas
  static readonly SMTP_HOST = process.env.SMTP_HOST
  static readonly SMTP_PORT = Number(process.env.SMTP_PORT) || 587
  static readonly SMTP_USER = process.env.SMTP_USER
  static readonly SMTP_PASS = process.env.SMTP_PASS

  // Redis
  static readonly REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

  // Validação de variáveis obrigatórias
  static validate() {
    const required = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ]

    const missing = required.filter(key => !process.env[key])
    
    if (missing.length > 0) {
      throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}`)
    }
  }

  // Informações do ambiente
  static get isDevelopment() {
    return this.NODE_ENV === 'development'
  }

  static get isProduction() {
    return this.NODE_ENV === 'production'
  }

  static get isTest() {
    return this.NODE_ENV === 'test'
  }
}

// Validar na inicialização
Config.validate()
```

### 4. Configuração com Validação usando Zod
```typescript
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// Schema de validação
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  HOST: z.string().default('localhost'),
  
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z.coerce.boolean().default(false),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // APIs
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

// Validar e exportar configuração tipada
export const env = envSchema.parse(process.env)

// Uso tipado
console.log(env.PORT) // TypeScript sabe que é number
console.log(env.NODE_ENV) // TypeScript sabe que é 'development' | 'test' | 'staging' | 'production'
```

### 5. Múltiplos Arquivos .env com Prioridades
```typescript
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

function loadEnvironment() {
  const env = process.env.NODE_ENV || 'development'
  
  // Lista de arquivos por ordem de prioridade (último sobrescreve)
  const envFiles = [
    '.env',                    // Padrão para todos os ambientes
    `.env.${env}`,            // Específico do ambiente
    '.env.local',             // Local overrides (não commitado)
    `.env.${env}.local`,      // Local overrides específicos do ambiente
  ]

  envFiles.forEach(file => {
    const filePath = path.resolve(process.cwd(), file)
    
    if (fs.existsSync(filePath)) {
      console.log(`Carregando variáveis de: ${file}`)
      dotenv.config({ path: filePath, override: false })
    }
  })
}

loadEnvironment()
```

### 6. Configuração com Interpolação
```typescript
// .env com interpolação
// BASE_URL=https://api.example.com
// API_VERSION=v1
// API_ENDPOINT=${BASE_URL}/${API_VERSION}
// DATABASE_HOST=localhost
// DATABASE_PORT=5432
// DATABASE_NAME=myapp
// DATABASE_URL=postgresql://${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}

import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'

const myEnv = dotenv.config()
dotenvExpand.expand(myEnv)

console.log(process.env.API_ENDPOINT)  // https://api.example.com/v1
console.log(process.env.DATABASE_URL)  // postgresql://localhost:5432/myapp
```

### 7. Helper para Configuração de Desenvolvimento
```typescript
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

export class EnvHelper {
  static generateExample() {
    const exampleContent = `
# Configuração do Servidor
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
DATABASE_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-min-32-chars

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis
REDIS_URL=redis://localhost:6379

# APIs Externas
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Outros
API_KEY=your-api-key-here
DEBUG=true
`.trim()

    fs.writeFileSync('.env.example', exampleContent)
    console.log('Arquivo .env.example criado!')
  }

  static checkMissingVars() {
    const envPath = path.resolve(process.cwd(), '.env')
    const examplePath = path.resolve(process.cwd(), '.env.example')

    if (!fs.existsSync(envPath)) {
      console.warn('Arquivo .env não encontrado!')
      return
    }

    if (!fs.existsSync(examplePath)) {
      console.warn('Arquivo .env.example não encontrado!')
      return
    }

    const envContent = fs.readFileSync(envPath, 'utf8')
    const exampleContent = fs.readFileSync(examplePath, 'utf8')

    const envVars = this.extractVariables(envContent)
    const exampleVars = this.extractVariables(exampleContent)

    const missing = exampleVars.filter(v => !envVars.includes(v))
    const extra = envVars.filter(v => !exampleVars.includes(v))

    if (missing.length > 0) {
      console.warn('Variáveis faltando no .env:', missing)
    }

    if (extra.length > 0) {
      console.info('Variáveis extras no .env:', extra)
    }
  }

  private static extractVariables(content: string): string[] {
    return content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim())
  }
}
```

### 8. Configuração para Testes
```typescript
// test/setup.ts
import dotenv from 'dotenv'

// Carregar variáveis de teste
dotenv.config({ path: '.env.test' })

// Override para testes
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://localhost:5432/myapp_test'
process.env.JWT_SECRET = 'test-secret-key-32-characters-long'

// .env.test
// NODE_ENV=test
// PORT=3001
// DATABASE_URL=postgresql://localhost:5432/myapp_test
// JWT_SECRET=test-secret-key-32-characters-long
// JWT_EXPIRES_IN=1h
// REDIS_URL=redis://localhost:6379/1
```

## Principais Métodos

### dotenv.config(options)
- **Propósito**: Carrega variáveis do arquivo .env
- **Opções**:
  - `path`: Caminho para o arquivo .env
  - `encoding`: Encoding do arquivo (default: utf8)
  - `debug`: Habilita logs de debug
  - `override`: Sobrescreve variáveis existentes
- **Retorno**: Objeto com parsed/error

### dotenv.parse(src)
- **Propósito**: Faz parse de string .env sem carregar para process.env
- **Parâmetros**: String do conteúdo .env
- **Retorno**: Objeto com variáveis parseadas

## Estrutura de Arquivo .env

### Sintaxe Básica
```bash
# Comentários começam com #
VARIABLE_NAME=value

# Strings com espaços (sem aspas necessárias)
APP_NAME=My Application

# Aspas para preservar espaços/caracteres especiais
API_KEY="key with spaces"
PASSWORD='complex$password'

# Valores numéricos (acessados como string)
PORT=3000
TIMEOUT=30

# Valores booleanos (acessados como string)
DEBUG=true
SSL_ENABLED=false

# URLs
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Listas (parsing manual necessário)
ALLOWED_HOSTS=localhost,127.0.0.1,example.com
```

## Boas Práticas

1. **Segurança**:
   - Nunca commite arquivos .env com dados sensíveis
   - Use .env.example para documentar variáveis necessárias
   - Adicione .env* ao .gitignore

2. **Organização**:
   - Agrupe variáveis por categoria (database, auth, etc.)
   - Use nomes descritivos e consistentes
   - Documente variáveis com comentários

3. **Validação**:
   - Sempre valide variáveis obrigatórias na inicialização
   - Use schemas de validação (Zod, Joi, etc.)
   - Converta tipos apropriadamente

4. **Ambientes**:
   - Use arquivos específicos por ambiente
   - Mantenha hierarquia de carregamento clara
   - Configure CI/CD para usar variáveis adequadas

## Integração com Arquitetura Limpa

Na arquitetura limpa do projeto, dotenv é usado para:

- **Configuração centralizada**: Classe Config para acessar todas as variáveis
- **Dependency injection**: Configuração de containers IoC
- **Database connection**: Strings de conexão e configurações
- **External services**: APIs keys e configurações de serviços externos
- **Environment-specific behavior**: Logs, debug, features flags

O dotenv fornece a base para configuração flexível e segura de aplicações Node.js, permitindo diferentes comportamentos por ambiente sem alterar o código.
