# IORedis

IORedis é um cliente Redis robusto e rico em recursos para Node.js. É conhecido por sua performance, confiabilidade e suporte extensivo para recursos avançados do Redis.

## Principais Características

- **Cliente Redis Completo**: Suporte completo para todos os comandos Redis
- **Performance Otimizada**: Pipeline automático e estratégias de conexão inteligentes
- **Redis Cluster**: Suporte nativo para clusters Redis com descoberta automática de nós
- **Pub/Sub**: Sistema de mensageria publish/subscribe para comunicação assíncrona
- **Sentinel**: Suporte para Redis Sentinel para alta disponibilidade
- **Streams**: Suporte para Redis Streams para processamento de dados em tempo real
- **Transactions**: Suporte completo para transações Redis (MULTI/EXEC)
- **Pipeline**: Batching de comandos para melhor performance
- **TypeScript**: Suporte nativo ao TypeScript com tipagem completa
- **TLS/SSL**: Conexões seguras com certificados personalizados
- **Lua Scripts**: Execução de scripts Lua personalizados no Redis

## Versão

Versão utilizada no projeto: **5.6.1**

## Instalação

```bash
npm install ioredis
npm install --save-dev @types/node
```

## Casos de Uso no Projeto

### Cache de Dados
```javascript
const Redis = require("ioredis");
const redis = new Redis();

// Armazenar dados no cache
await redis.set("user:123", JSON.stringify(userData), "EX", 3600);

// Recuperar dados do cache
const cachedUser = await redis.get("user:123");
```

### Sessões de Usuário
```javascript
// Armazenar sessão
await redis.setex(`session:${sessionId}`, 1800, JSON.stringify(sessionData));

// Verificar sessão
const session = await redis.get(`session:${sessionId}`);
```

### Pub/Sub para Notificações
```javascript
// Publisher
const pub = new Redis();
pub.publish("notifications", JSON.stringify({ userId: 123, message: "Welcome!" }));

// Subscriber
const sub = new Redis();
sub.subscribe("notifications");
sub.on("message", (channel, message) => {
  const notification = JSON.parse(message);
  console.log("Nova notificação:", notification);
});
```

### Rate Limiting
```javascript
// Implementar rate limiting
const key = `rate_limit:${userId}`;
const current = await redis.incr(key);
if (current === 1) {
  await redis.expire(key, 60); // 1 minuto
}
if (current > 10) {
  throw new Error("Rate limit exceeded");
}
```

### Filas de Trabalho
```javascript
// Adicionar trabalho à fila
await redis.lpush("job_queue", JSON.stringify({
  id: jobId,
  type: "email",
  data: emailData
}));

// Processar trabalhos
while (true) {
  const job = await redis.brpop("job_queue", 0);
  if (job) {
    const jobData = JSON.parse(job[1]);
    await processJob(jobData);
  }
}
```

## Configurações Avançadas

### Conexão com Configurações Personalizadas
```javascript
const redis = new Redis({
  port: 6379,
  host: "127.0.0.1",
  password: "my-password",
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableOfflineQueue: false,
  connectTimeout: 10000,
  commandTimeout: 5000
});
```

### Redis Cluster
```javascript
const cluster = new Redis.Cluster([
  {
    port: 6380,
    host: "127.0.0.1",
  },
  {
    port: 6381,
    host: "127.0.0.1",
  },
], {
  scaleReads: "slave",
  redisOptions: {
    password: "cluster-password"
  }
});
```

### Pipeline para Performance
```javascript
const pipeline = redis.pipeline();
pipeline.set("foo", "bar");
pipeline.get("foo");
pipeline.incr("counter");

const results = await pipeline.exec();
// results é um array de [error, result] para cada comando
```

### Transações
```javascript
const multi = redis.multi();
multi.set("key1", "value1");
multi.set("key2", "value2");
multi.incr("counter");

const results = await multi.exec();
```

### Streams para Processamento em Tempo Real
```javascript
// Produzir mensagens
await redis.xadd("mystream", "*", "field1", "value1", "field2", "value2");

// Consumir mensagens
async function consumeMessages(lastId = "$") {
  const results = await redis.xread("BLOCK", 0, "STREAMS", "mystream", lastId);
  const [key, messages] = results[0];
  
  for (const message of messages) {
    const [id, fields] = message;
    console.log("Mensagem recebida:", { id, fields });
  }
  
  // Processar próximas mensagens
  const newLastId = messages[messages.length - 1][0];
  await consumeMessages(newLastId);
}
```

## Monitoramento e Debug

### Eventos de Conexão
```javascript
redis.on("connect", () => console.log("Conectado ao Redis"));
redis.on("ready", () => console.log("Redis pronto para comandos"));
redis.on("error", (err) => console.error("Erro Redis:", err));
redis.on("close", () => console.log("Conexão fechada"));
redis.on("reconnecting", () => console.log("Reconectando..."));
```

### Debug Logging
```bash
DEBUG=ioredis:* node app.js
```

### Monitor de Comandos
```javascript
const monitor = await redis.monitor();
monitor.on("monitor", (time, args, source, database) => {
  console.log("Comando executado:", args);
});
```

## Integração com TypeScript

```typescript
import Redis from "ioredis";

interface UserData {
  id: number;
  name: string;
  email: string;
}

const redis = new Redis({
  host: "localhost",
  port: 6379,
});

async function cacheUser(user: UserData): Promise<void> {
  await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user));
}

async function getUser(userId: number): Promise<UserData | null> {
  const cached = await redis.get(`user:${userId}`);
  return cached ? JSON.parse(cached) : null;
}
```

## Performance e Otimizações

### Auto Pipelining
```javascript
const redis = new Redis({
  enableAutoPipelining: true
});

// Comandos executados no mesmo tick do event loop serão automaticamente agrupados
redis.get("key1");
redis.get("key2");
redis.get("key3");
```

### Scan para Grandes Datasets
```javascript
// Escanear chaves sem bloquear o servidor
const stream = redis.scanStream({
  match: "user:*",
  count: 100
});

stream.on("data", (keys) => {
  console.log("Chaves encontradas:", keys);
});

stream.on("end", () => {
  console.log("Scan completo");
});
```

## Segurança

### Conexão TLS
```javascript
const redis = new Redis({
  host: "redis.example.com",
  port: 6380,
  tls: {
    ca: fs.readFileSync("ca.pem"),
    cert: fs.readFileSync("cert.pem"),
    key: fs.readFileSync("key.pem")
  }
});
```

### Autenticação
```javascript
const redis = new Redis({
  host: "localhost",
  port: 6379,
  username: "default",
  password: "my-secure-password"
});
```

## Recursos Relacionados

- [Documentação Oficial](https://redis.github.io/ioredis/)
- [Redis Commands Reference](https://redis.io/commands)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)
- [Redis Streams Guide](https://redis.io/docs/data-types/streams/)

IORedis é fundamental para operações de cache, sessões, filas e comunicação assíncrona em aplicações Node.js de alta performance, fornecendo uma interface robusta e confiável para o Redis.
