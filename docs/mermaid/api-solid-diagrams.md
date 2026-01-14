# Diagramas Mermaid - API Solid

## Visao Geral

A API Solid e um sistema de gerenciamento de academias desenvolvido com Clean Architecture e Domain-Driven Design. O sistema permite o cadastro de usuarios, gerenciamento de academias, realizacao de check-ins e gerenciamento de assinaturas. A arquitetura segue principios de separacao de responsabilidades com camadas bem definidas (Domain, Application, Infra) organizadas por bounded contexts.

## Elementos Identificados

### Fluxos Externos
- Usuarios finais (clientes e administradores)
- Stripe API (processamento de pagamentos)
- Sistema de Email (NodeMailer)
- RabbitMQ (fila de mensagens)

### Processos Internos
- Autenticacao e gerenciamento de sessoes
- Cadastro e gerenciamento de usuarios
- Cadastro e busca de academias
- Realizacao e validacao de check-ins
- Gerenciamento de assinaturas

### Variacoes de Comportamento
- Tipos de usuario: MEMBER, ADMIN
- Status do usuario: ACTIVE, SUSPENDED, PENDING
- Modos de persistencia: PostgreSQL, SQLite, In-Memory
- Status de assinatura: active, canceled, pending

### Contratos Publicos
- Either Pattern para tratamento de erros
- Interfaces de Repository
- Value Objects com validacao
- Domain Events

---

## Diagramas

### Arquitetura de Camadas por Bounded Context

Este diagrama ilustra a estrutura de camadas seguida em cada bounded context do sistema. A arquitetura Clean Architecture define regras de dependencia estritas onde a camada Domain nao possui dependencias externas, Application depende apenas de Domain, e Infra implementa as interfaces definidas em Application.

```mermaid
flowchart TD
    subgraph "Bounded Context"
        direction TB
        subgraph Domain["Domain Layer"]
            E[Entities]
            VO[Value Objects]
            DE[Domain Events]
            SP[Specifications]
        end
        
        subgraph Application["Application Layer"]
            UC[Use Cases]
            RI[Repository Interfaces]
            ER[Application Errors]
        end
        
        subgraph Infra["Infrastructure Layer"]
            CT[Controllers]
            RP[Repository Implementations]
            GW[Gateways]
        end
    end
    
    Infra --> Application
    Infra --> Domain
    Application --> Domain
```

**Notas**:
- Domain Layer nao possui dependencias externas
- Application Layer define interfaces que Infra implementa
- Dependency Cruiser valida estas regras automaticamente

---

### Contextos de Dominio

Este diagrama apresenta os bounded contexts identificados no sistema e suas responsabilidades principais. Cada contexto possui sua propria estrutura de Domain, Application e Infra, seguindo o padrao DDD.

```mermaid
flowchart LR
    subgraph Contexts["Bounded Contexts"]
        U[User Context]
        G[Gym Context]
        C[Check-in Context]
        S[Session Context]
        SB[Subscription Context]
        SH[Shared Context]
    end
    
    U --> SH
    G --> SH
    C --> SH
    S --> SH
    SB --> SH
    
    C --> U
    C --> G
    S --> U
    SB --> U
```

**Notas**:
- Shared Context contem componentes reutilizaveis
- Check-in depende de User e Gym para validacoes
- Session depende de User para autenticacao

---

### Fluxo de Autenticacao

Este diagrama de sequencia representa o fluxo completo de autenticacao de um usuario. O processo inclui validacao de credenciais, geracao de tokens JWT e refresh tokens para manter a sessao ativa.

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AuthController
    participant UseCase as AuthenticateUseCase
    participant Repository as UserRepository
    participant Token as AuthToken
    
    Client->>Controller: POST /sessions
    Controller->>UseCase: execute credentials
    UseCase->>Repository: userOfEmail
    Repository-->>UseCase: User or null
    
    alt User not found
        UseCase-->>Controller: failure InvalidCredentials
        Controller-->>Client: 401 Unauthorized
    else User found
        UseCase->>UseCase: checkPassword
        alt Invalid password
            UseCase-->>Controller: failure InvalidCredentials
            Controller-->>Client: 401 Unauthorized
        else Valid password
            UseCase->>Token: sign JWT
            Token-->>UseCase: token
            UseCase->>Token: createRefreshToken
            Token-->>UseCase: refreshToken
            UseCase-->>Controller: success tokens
            Controller-->>Client: 200 OK with tokens
        end
    end
```

**Notas**:
- Utiliza Either pattern para tratamento de erros
- JWT assinado com chave privada
- Refresh token para renovacao de sessao

---

### Fluxo de Criacao de Usuario

Este diagrama demonstra o processo de criacao de um novo usuario no sistema. O fluxo inclui validacao de unicidade, criacao da entidade com validacoes de dominio, persistencia com transacao e publicacao de eventos.

```mermaid
sequenceDiagram
    participant Client
    participant Controller as CreateUserController
    participant UseCase as CreateUserUseCase
    participant Repository as UserRepository
    participant Domain as User Entity
    participant UoW as UnitOfWork
    participant Queue as RabbitMQ
    
    Client->>Controller: POST /users
    Controller->>Controller: parseBody with Zod
    Controller->>UseCase: execute input
    UseCase->>Repository: userOfEmail
    Repository-->>UseCase: null or User
    
    alt User exists
        UseCase-->>Controller: failure UserAlreadyExists
        Controller-->>Client: 409 Conflict
    else User not exists
        UseCase->>Domain: User.create
        Domain->>Domain: validate Name Email Password
        Domain-->>UseCase: Either Error or User
        
        alt Validation failed
            UseCase-->>Controller: failure ValidationErrors
            Controller-->>Client: 400 Bad Request
        else Validation success
            UseCase->>UoW: performTransaction
            UoW->>Repository: save User
            Repository-->>UoW: OK
            UoW-->>UseCase: OK
            UseCase->>Queue: publish UserCreatedEvent
            UseCase-->>Controller: success email
            Controller-->>Client: 201 Created
        end
    end
```

**Notas**:
- Validacoes de Value Objects ocorrem na criacao da entidade
- Transacao garante consistencia na persistencia
- Evento de dominio publicado apos sucesso

---

### Fluxo de Check-in

Este diagrama apresenta o processo complexo de realizacao de check-in em uma academia. O fluxo valida a existencia do usuario, verifica se ja realizou check-in no dia, valida a distancia ate a academia e persiste o registro.

```mermaid
sequenceDiagram
    participant Client
    participant Controller as CheckInController
    participant UseCase as CheckInUseCase
    participant UserRepo as UserRepository
    participant GymRepo as GymRepository
    participant CheckInRepo as CheckInRepository
    participant Spec as MaxDistanceSpec
    participant UoW as UnitOfWork
    
    Client->>Controller: POST /gyms/gymId/check-ins
    Controller->>UseCase: execute input
    
    UseCase->>UserRepo: userExists
    alt User not found
        UseCase-->>Controller: failure UserNotFound
        Controller-->>Client: 404 Not Found
    end
    
    UseCase->>CheckInRepo: hasCheckedInToday
    alt Already checked in
        UseCase-->>Controller: failure AlreadyCheckedIn
        Controller-->>Client: 409 Conflict
    end
    
    UseCase->>GymRepo: gymOfId
    alt Gym not found
        UseCase-->>Controller: failure GymNotFound
        Controller-->>Client: 404 Not Found
    end
    
    UseCase->>Spec: isSatisfiedBy distance
    alt Distance exceeds 100m
        UseCase-->>Controller: failure MaxDistance
        Controller-->>Client: 400 Bad Request
    end
    
    UseCase->>UseCase: CheckIn.create
    UseCase->>UoW: performTransaction
    UoW->>CheckInRepo: save CheckIn
    UoW-->>UseCase: checkInId
    UseCase-->>Controller: success checkInId
    Controller-->>Client: 201 Created
```

**Notas**:
- Limite de distancia: 100 metros da academia
- Apenas um check-in por dia por usuario
- Evento CheckInCreated publicado automaticamente

---

### Estrutura de Entidades de Dominio

Este diagrama de classes apresenta as principais entidades do sistema e seus relacionamentos. Cada entidade possui Value Objects para garantir validacoes e invariantes de dominio.

```mermaid
classDiagram
    class User {
        -Id id
        -Name name
        -Email email
        -Password password
        -Role role
        -UserStatus status
        -string billingCustomerId
        +create() Either
        +restore() User
        +suspend() void
        +activate() void
    }
    
    class Gym {
        -Id id
        -Name title
        -CNPJ cnpj
        -Phone phone
        -Coordinate coordinate
        +create() Either
        +restore() Gym
    }
    
    class CheckIn {
        -Id id
        -ExistingId userId
        -ExistingId gymId
        -Date createdAt
        -Date validatedAt
        -boolean isValidated
        +create() CheckIn
        +validate() Either
    }
    
    class Subscription {
        -string id
        -string userId
        -string billingSubscriptionId
        -SubscriptionStatus status
        +create() Subscription
        +activate() void
        +cancel() void
    }
    
    User "1" --> "*" CheckIn : realiza
    Gym "1" --> "*" CheckIn : recebe
    User "1" --> "0..1" Subscription : possui
```

**Notas**:
- Metodo create retorna Either para validacoes
- Metodo restore ignora validacoes para hidratacao
- Entities estendem Observable para Domain Events

---

### Value Objects do Sistema

Este diagrama apresenta os principais Value Objects utilizados nas entidades. Value Objects garantem validacoes e encapsulam regras de dominio especificas.

```mermaid
classDiagram
    class Email {
        -string value
        +create() Either
        +getValue() string
    }
    
    class Name {
        -string value
        +create() Either
        +getValue() string
    }
    
    class Password {
        -string hash
        +create() Either
        +check() boolean
    }
    
    class CNPJ {
        -string value
        +create() Either
        +getValue() string
    }
    
    class Coordinate {
        -number latitude
        -number longitude
        +create() Either
        +distanceTo() Distance
    }
    
    class Role {
        <<enumeration>>
        MEMBER
        ADMIN
    }
    
    class UserStatus {
        <<enumeration>>
        ACTIVE
        SUSPENDED
        PENDING
    }
    
    Email --> InvalidEmailError : pode gerar
    Name --> InvalidNameLengthError : pode gerar
    CNPJ --> InvalidCNPJError : pode gerar
    Coordinate --> InvalidLatitudeError : pode gerar
    Coordinate --> InvalidLongitudeError : pode gerar
```

**Notas**:
- Todos retornam Either na criacao
- Imutaveis apos criacao
- Validacoes encapsuladas no proprio objeto

---

### Padrao Either para Tratamento de Erros

Este diagrama flowchart ilustra como o padrao Either e utilizado no sistema para tratamento de erros de forma funcional. O padrao elimina a necessidade de exceptions para fluxos de erro esperados.

```mermaid
flowchart TD
    A[UseCase.execute] --> B{Operacao}
    B -->|Sucesso| C[success value]
    B -->|Falha| D[failure error]
    
    C --> E[Either Right]
    D --> F[Either Left]
    
    E --> G{isSuccess}
    F --> G
    
    G -->|true| H[Processar valor]
    G -->|false| I[Tratar erro]
    
    H --> J[Controller retorna sucesso]
    I --> K[Controller retorna erro HTTP]
    
    subgraph "Either Type"
        L["Either<Error, Success>"]
    end
```

**Notas**:
- success cria um Right com o valor
- failure cria um Left com o erro
- isSuccess e isFailure para verificacao

---

### Inversao de Controle com Inversify

Este diagrama apresenta a estrutura do container IoC utilizado para injecao de dependencias. O sistema utiliza Inversify com modulos organizados por bounded context.

```mermaid
flowchart TD
    subgraph Container["IoC Container"]
        direction TB
        subgraph Modules["Container Modules"]
            UM[User Module]
            GM[Gym Module]
            CM[CheckIn Module]
            SM[Session Module]
            SBM[Subscription Module]
            SHM[Shared Module]
        end
        
        subgraph Bindings["Service Bindings"]
            direction LR
            R[Repositories]
            U[UseCases]
            C[Controllers]
            S[Services]
        end
    end
    
    UM --> Bindings
    GM --> Bindings
    CM --> Bindings
    SM --> Bindings
    SBM --> Bindings
    SHM --> Bindings
    
    subgraph Types["Service Identifiers"]
        USER_TYPES
        GYM_TYPES
        CHECKIN_TYPES
        AUTH_TYPES
        SHARED_TYPES
    end
    
    Types --> Modules
```

**Notas**:
- Symbols usados como identificadores
- Singleton para Repositories
- RequestScope para transacoes

---

### Infraestrutura e Servicos Externos

Este diagrama mostra os componentes de infraestrutura e integracao com servicos externos. O sistema utiliza PostgreSQL para persistencia, Redis para cache de sessoes, RabbitMQ para mensageria e Stripe para pagamentos.

```mermaid
flowchart LR
    subgraph Application["API Solid"]
        F[Fastify Server]
        C[Controllers]
        UC[Use Cases]
        R[Repositories]
    end
    
    subgraph Database["Persistencia"]
        PG[(PostgreSQL)]
        PR[Prisma ORM]
    end
    
    subgraph Cache["Cache e Sessoes"]
        RD[(Redis)]
    end
    
    subgraph Messaging["Mensageria"]
        RQ[RabbitMQ]
        W[Workers]
    end
    
    subgraph External["Servicos Externos"]
        ST[Stripe API]
        EM[Email Service]
    end
    
    F --> C
    C --> UC
    UC --> R
    R --> PR
    PR --> PG
    
    UC --> RD
    UC --> RQ
    RQ --> W
    
    UC --> ST
    W --> EM
```

**Notas**:
- Prisma como ORM para PostgreSQL
- Redis para validacao de tokens revogados
- RabbitMQ para processamento assincrono
- Workers processam eventos de dominio

