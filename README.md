# Projeto API Solid

## Descrição

Este projeto é uma API desenvolvida com princípios de Clean Architecture, utilizando TypeScript, Node.js, e Prisma ORM. A API é projetada para ser escalável, testável e fácil de manter, seguindo os princípios de desenvolvimento de software como coesão e acoplamento.

## Estrutura do Projeto

A estrutura do projeto segue os princípios de Clean Architecture, dividindo o código em camadas bem definidas:

- **Domain**: Contém as entidades e objetos de valor do domínio.
- **Application**: Contém os casos de uso e lógica de aplicação.
- **Infra**: Contém a implementação de infraestrutura, como repositórios, controladores e serviços externos.

## Funcionalidades

- **Autenticação de Usuários**: Criação, autenticação e gerenciamento de perfis de usuários.
- **Gerenciamento de Academias**: Criação, busca e validação de academias.
- **Check-ins**: Registro e validação de check-ins de usuários em academias.
- **Métricas de Usuários**: Consulta de métricas e histórico de check-ins dos usuários.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript.
- **TypeScript**: Superset de JavaScript que adiciona tipagem estática.
- **Prisma ORM**: ORM para Node.js e TypeScript.
- **Fastify**: Framework web para Node.js.
- **Inversify**: Container de injeção de dependência para TypeScript.
- **Vitest**: Framework de testes unitários e de integração.
- **Zod**: Biblioteca de validação de esquemas.
- **RabbitMQ**: Sistema de barramento de mensagens para comunicação assíncrona.
- **NodeMailer**: Módulo para disparos de e-mails.

## Instalação

1. Clone o repositório (HTTPS):
```sh
  git clone https://github.com/Cahmoraes/clean-arch-solid-ddd.git
  cd clean-arch-solid-ddd
```

1.1 Clone o repositório (SSH):
```sh
  git clone git@github.com:Cahmoraes/clean-arch-solid-ddd.git
  cd clean-arch-solid-ddd
```

1.2 Execute o Docker Compose:
```sh
  docker compose up -D
```

2. Instale as dependências:
```sh
  npm ci
```

3. Configure as variáveis de ambiente: Crie um arquivo .env baseado no `.env.example` e ajuste as variáveis conforme necessário.

4. Execute as migrações do Prisma:

```sh
  npx prisma migrate dev
```

Scripts Disponíveis:
  - **npm start**: Inicia o servidor em modo de produção.
  - **npm run dev**: Inicia o servidor em modo de desenvolvimento com hot-reload.
  - **npm test**: Executa os testes unitários.
  - **npm run test**:integration: Executa os testes de integração.
  - **npm run build**: Compila o projeto para a pasta build.
  - **npm run prisma**:studio: Abre o Prisma Studio para gerenciar o banco de dados.

## Configuração do Dependency Cruiser

O arquivo `.dependency-cruiser.js` contém as regras de dependência para o projeto. Ele define quais dependências são permitidas e quais são proibidas entre diferentes camadas do sistema. Aqui estão as principais regras configuradas:

- **noDomainToApplicationExceptPermitted**: Impede que a camada `domain` dependa da camada `application`, exceto para arquivos permitidos.
- **noDomainToInfraExceptPermitted**: Impede que a camada `domain` dependa da camada `infra`, exceto para arquivos permitidos.
- **noApplicationToInfraExceptPermitted**: Impede que a camada `application` dependa da camada `infra`, exceto para arquivos permitidos.
- **allowInfraCircularDependency**: Permite dependências circulares dentro da pasta `infra/`, mas impede ciclos em outras camadas do sistema.

As regras são configuradas na seção `forbidden` do arquivo, e opções adicionais de configuração estão disponíveis na seção `options`.

Para mais detalhes, consulte o arquivo [.dependency-cruiser.js](./.dependency-cruiser.js).

### Licença
Este projeto está licenciado sob a licença MIT. 

Desenvolvido por **Caique Vinícius de Moraes**

