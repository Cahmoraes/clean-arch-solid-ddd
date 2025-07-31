# Node-cron

Node-cron é uma biblioteca simples e poderosa para agendamento de tarefas em Node.js, baseada no formato cron do Unix. Permite executar funções automaticamente em horários específicos ou intervalos regulares.

## Principais Características

- **Sintaxe Cron Padrão**: Suporte completo à sintaxe cron do Unix com campo de segundos opcional
- **Timezone Support**: Execução de tarefas em diferentes fusos horários
- **Controle de Jobs**: Start, stop, e gerenciamento de tarefas em runtime
- **Múltiplas Tarefas**: Agendamento simultâneo de várias tarefas independentes
- **Callbacks de Conclusão**: Execução de funções quando tarefas são finalizadas
- **Validação**: Validação automática de expressões cron
- **Context Binding**: Execução de tarefas com contexto específico
- **Error Handling**: Tratamento de erros robusto
- **TypeScript Support**: Tipagem completa para TypeScript
- **Lightweight**: Zero dependências externas

## Versão

Versão utilizada no projeto: **4.2.0**

## Instalação

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

## Casos de Uso no Projeto

### Configuração Básica
```javascript
const cron = require('node-cron');

// Executar a cada minuto
cron.schedule('* * * * *', () => {
  console.log('Executando tarefa a cada minuto');
});
```

### Limpeza de Logs Diária
```javascript
const fs = require('fs');
const path = require('path');

// Todo dia às 02:00
cron.schedule('0 2 * * *', () => {
  console.log('Iniciando limpeza de logs...');
  
  const logsDir = path.join(__dirname, 'logs');
  const files = fs.readdirSync(logsDir);
  
  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    
    // Remover logs com mais de 7 dias
    const daysDiff = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
      fs.unlinkSync(filePath);
      console.log(`Log removido: ${file}`);
    }
  });
  
  console.log('Limpeza de logs concluída');
});
```

### Backup Automático de Banco de Dados
```javascript
const { exec } = require('child_process');

// Todo domingo às 03:00
cron.schedule('0 3 * * 0', () => {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFile = `backup_${timestamp}.sql`;
  
  const command = `pg_dump ${process.env.DATABASE_URL} > backups/${backupFile}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Erro no backup:', error);
      // Enviar notificação de erro
      sendErrorNotification('Backup failed', error.message);
    } else {
      console.log(`Backup criado: ${backupFile}`);
      // Enviar confirmação de sucesso
      sendSuccessNotification('Backup completed', backupFile);
    }
  });
});
```

### Verificação de Health Check
```javascript
const axios = require('axios');

// A cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    const response = await axios.get('http://localhost:3000/health', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('Health check OK');
    } else {
      console.warn('Health check warning:', response.status);
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    
    // Enviar alerta
    await sendAlert({
      type: 'health_check_failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### Processamento de Filas
```javascript
// Processar fila de emails a cada 30 segundos
cron.schedule('*/30 * * * * *', async () => {
  try {
    const emailQueue = await getEmailQueue();
    
    if (emailQueue.length === 0) {
      return;
    }
    
    console.log(`Processando ${emailQueue.length} emails...`);
    
    for (const email of emailQueue) {
      try {
        await sendEmail(email);
        await markEmailAsSent(email.id);
        console.log(`Email enviado: ${email.to}`);
      } catch (error) {
        console.error(`Erro ao enviar email para ${email.to}:`, error);
        await markEmailAsFailed(email.id, error.message);
      }
    }
  } catch (error) {
    console.error('Erro no processamento da fila:', error);
  }
});
```

## Sintaxe Cron

### Formato dos Campos
```
 ┌────────────── segundo (opcional)
 │ ┌──────────── minuto
 │ │ ┌────────── hora
 │ │ │ ┌──────── dia do mês
 │ │ │ │ ┌────── mês
 │ │ │ │ │ ┌──── dia da semana
 │ │ │ │ │ │
 │ │ │ │ │ │
 * * * * * *
```

### Valores Permitidos
| Campo          | Valores                                    |
|----------------|-------------------------------------------|
| segundo        | 0-59                                      |
| minuto         | 0-59                                      |
| hora           | 0-23                                      |
| dia do mês     | 1-31                                      |
| mês            | 1-12 (ou nomes: jan, feb, mar, etc.)     |
| dia da semana  | 0-7 (0 ou 7 = domingo, ou nomes: sun, mon, etc.) |

### Exemplos de Expressões
```javascript
// A cada segundo
'* * * * * *'

// A cada minuto
'* * * * *'

// Todo dia às 08:30
'30 8 * * *'

// Toda segunda-feira às 09:00
'0 9 * * 1'

// Primeiro dia de cada mês às 00:00
'0 0 1 * *'

// A cada 15 minutos
'*/15 * * * *'

// De segunda a sexta às 14:30
'30 14 * * 1-5'

// Aos domingos e quartas-feiras às 10:00
'0 10 * * 0,3'
```

## Controle Avançado de Tarefas

### Tarefa com Start/Stop Manual
```javascript
const task = cron.schedule('* * * * *', () => {
  console.log('Tarefa executando...');
}, {
  scheduled: false // Não iniciar automaticamente
});

// Iniciar tarefa
task.start();

// Parar tarefa após 5 minutos
setTimeout(() => {
  task.stop();
  console.log('Tarefa parada');
}, 5 * 60 * 1000);
```

### Tarefa com Timezone
```javascript
// Executar às 09:00 no horário de São Paulo
cron.schedule('0 9 * * *', () => {
  console.log('Executando no horário de São Paulo');
}, {
  timezone: 'America/Sao_Paulo'
});

// Executar às 15:00 no horário UTC
cron.schedule('0 15 * * *', () => {
  console.log('Executando no horário UTC');
}, {
  timezone: 'UTC'
});
```

### Tarefa com Callback de Conclusão
```javascript
const task = cron.schedule('0 */2 * * *', () => {
  console.log('Executando relatório...');
  
  // Simular processamento
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('Relatório concluído');
      resolve();
    }, 30000);
  });
});

task.on('complete', () => {
  console.log('Callback de conclusão executado');
});
```

## Gerenciamento de Múltiplas Tarefas

### Sistema de Tarefas Organizadas
```javascript
class TaskScheduler {
  constructor() {
    this.tasks = new Map();
  }

  addTask(name, cronExpression, callback, options = {}) {
    if (this.tasks.has(name)) {
      throw new Error(`Tarefa '${name}' já existe`);
    }

    const task = cron.schedule(cronExpression, () => {
      console.log(`Executando tarefa: ${name}`);
      
      try {
        callback();
      } catch (error) {
        console.error(`Erro na tarefa '${name}':`, error);
      }
    }, {
      scheduled: false,
      ...options
    });

    this.tasks.set(name, {
      task,
      cronExpression,
      callback,
      options
    });

    return task;
  }

  startTask(name) {
    const taskData = this.tasks.get(name);
    if (!taskData) {
      throw new Error(`Tarefa '${name}' não encontrada`);
    }

    taskData.task.start();
    console.log(`Tarefa '${name}' iniciada`);
  }

  stopTask(name) {
    const taskData = this.tasks.get(name);
    if (!taskData) {
      throw new Error(`Tarefa '${name}' não encontrada`);
    }

    taskData.task.stop();
    console.log(`Tarefa '${name}' parada`);
  }

  listTasks() {
    const taskList = [];
    for (const [name, data] of this.tasks) {
      taskList.push({
        name,
        cronExpression: data.cronExpression,
        running: data.task.running
      });
    }
    return taskList;
  }

  startAll() {
    for (const [name] of this.tasks) {
      this.startTask(name);
    }
  }

  stopAll() {
    for (const [name] of this.tasks) {
      this.stopTask(name);
    }
  }
}

// Uso
const scheduler = new TaskScheduler();

scheduler.addTask('backup', '0 2 * * *', backupDatabase);
scheduler.addTask('cleanup', '0 3 * * 0', cleanupLogs);
scheduler.addTask('health-check', '*/5 * * * *', performHealthCheck);

scheduler.startAll();
```

## Validação e Utilitários

### Validar Expressão Cron
```javascript
function validateCronExpression(expression) {
  try {
    cron.validate(expression);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message 
    };
  }
}

// Uso
const validation = validateCronExpression('0 25 15 * *');
if (!validation.valid) {
  console.error('Expressão inválida:', validation.error);
}
```

### Próximas Execuções
```javascript
function getNextExecutions(cronExpression, count = 5) {
  const task = cron.schedule(cronExpression, () => {}, { 
    scheduled: false 
  });
  
  const nextExecutions = [];
  let date = new Date();
  
  for (let i = 0; i < count; i++) {
    // Usar biblioteca externa para calcular próximas execuções
    // ou implementar lógica personalizada
    nextExecutions.push(date);
  }
  
  return nextExecutions;
}
```

## Monitoramento e Logs

### Sistema de Logs para Tarefas
```javascript
class TaskLogger {
  static log(taskName, message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${taskName}] ${message}`;
    
    console.log(logMessage);
    
    // Salvar em arquivo
    fs.appendFileSync(
      path.join(__dirname, 'logs', 'tasks.log'),
      logMessage + '\n'
    );
  }

  static error(taskName, error) {
    this.log(taskName, `ERROR: ${error.message}`, 'error');
  }

  static success(taskName, message) {
    this.log(taskName, message, 'success');
  }
}

// Uso nas tarefas
cron.schedule('0 1 * * *', () => {
  TaskLogger.log('database-backup', 'Iniciando backup...');
  
  try {
    performBackup();
    TaskLogger.success('database-backup', 'Backup concluído com sucesso');
  } catch (error) {
    TaskLogger.error('database-backup', error);
  }
});
```

## Configuração para Produção

### Configuração Robusta
```javascript
const config = {
  timezone: process.env.TZ || 'America/Sao_Paulo',
  logLevel: process.env.LOG_LEVEL || 'info',
  enableTasks: process.env.ENABLE_CRON_TASKS === 'true',
};

if (config.enableTasks) {
  // Tarefa de manutenção
  cron.schedule('0 2 * * *', async () => {
    console.log('Iniciando manutenção noturna...');
    
    try {
      await performMaintenance();
      console.log('Manutenção concluída');
    } catch (error) {
      console.error('Erro na manutenção:', error);
      await sendAlert('maintenance_failed', error);
    }
  }, {
    timezone: config.timezone
  });

  // Tarefa de monitoramento
  cron.schedule('*/10 * * * *', async () => {
    try {
      await checkSystemHealth();
    } catch (error) {
      console.error('Erro no monitoramento:', error);
    }
  });

  console.log('Tarefas cron iniciadas');
} else {
  console.log('Tarefas cron desabilitadas');
}
```

## Tratamento de Erros

### Error Handling Robusto
```javascript
function createRobustTask(name, cronExpression, taskFunction, options = {}) {
  return cron.schedule(cronExpression, async () => {
    const startTime = Date.now();
    
    try {
      console.log(`[${name}] Iniciando tarefa...`);
      
      await taskFunction();
      
      const duration = Date.now() - startTime;
      console.log(`[${name}] Tarefa concluída em ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[${name}] Erro após ${duration}ms:`, error);
      
      // Log detalhado do erro
      await logTaskError(name, error, duration);
      
      // Notificar administradores em caso de erro crítico
      if (error.critical) {
        await sendCriticalAlert(name, error);
      }
    }
  }, options);
}

async function logTaskError(taskName, error, duration) {
  const errorLog = {
    task: taskName,
    error: error.message,
    stack: error.stack,
    duration,
    timestamp: new Date().toISOString()
  };
  
  // Salvar no banco de dados ou arquivo
  await saveErrorLog(errorLog);
}
```

## Integração com TypeScript

```typescript
import * as cron from 'node-cron';

interface TaskConfig {
  name: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
}

interface TaskResult {
  success: boolean;
  message?: string;
  duration: number;
}

class CronTaskManager {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  addTask(
    config: TaskConfig, 
    handler: () => Promise<TaskResult>
  ): void {
    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    const task = cron.schedule(
      config.cronExpression,
      async () => {
        const startTime = Date.now();
        
        try {
          const result = await handler();
          const duration = Date.now() - startTime;
          
          console.log(`Task ${config.name} completed:`, {
            success: result.success,
            duration,
            message: result.message
          });
        } catch (error) {
          console.error(`Task ${config.name} failed:`, error);
        }
      },
      {
        scheduled: config.enabled ?? true,
        timezone: config.timezone
      }
    );

    this.tasks.set(config.name, task);
  }

  startTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    
    task.start();
    return true;
  }

  stopTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;
    
    task.stop();
    return true;
  }

  getTaskStatus(name: string): boolean | null {
    const task = this.tasks.get(name);
    return task ? task.running : null;
  }
}
```

## Performance e Boas Práticas

### Otimização de Performance
```javascript
// Evitar tarefas muito frequentes
// ❌ Ruim - executa todo segundo
cron.schedule('* * * * * *', heavyTask);

// ✅ Bom - executa a cada minuto
cron.schedule('* * * * *', optimizedTask);

// Usar processamento assíncrono
cron.schedule('0 */6 * * *', async () => {
  const tasks = [
    processEmailQueue(),
    generateReports(),
    cleanupTempFiles()
  ];
  
  // Executar em paralelo
  await Promise.allSettled(tasks);
});

// Implementar debounce para tarefas críticas
const debouncedTask = debounce(criticalTask, 5000);
cron.schedule('*/30 * * * * *', debouncedTask);
```

## Recursos Relacionados

- [Documentação Oficial](https://github.com/node-cron/node-cron)
- [Cron Expression Generator](https://crontab.guru/)
- [Timezone Database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- [Unix Cron Manual](https://man7.org/linux/man-pages/man5/crontab.5.html)

Node-cron é uma solução robusta e flexível para agendamento de tarefas em Node.js, permitindo automatizar processos críticos com precisão e confiabilidade.
