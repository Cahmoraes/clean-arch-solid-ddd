# Nodemailer

Nodemailer é uma biblioteca Node.js para envio de emails de forma fácil e segura. É a solução mais popular para envio de emails em aplicações Node.js, oferecendo suporte a múltiplos transportes e recursos avançados.

## Principais Características

- **Múltiplos Transportes**: SMTP, Sendmail, Stream, Amazon SES, e outros
- **Segurança Avançada**: TLS/SSL, OAuth2, DKIM, certificados personalizados
- **Anexos Flexíveis**: Arquivos, URLs, streams, buffers, base64, data URIs
- **Templates HTML**: Suporte completo a HTML com imagens embedadas
- **Pool de Conexões**: Reutilização de conexões para melhor performance
- **Autenticação OAuth2**: Integração com Gmail, Outlook, e outros provedores
- **Plugin System**: Extensibilidade através de plugins customizados
- **TypeScript Support**: Tipagem completa para TypeScript
- **Testing Tools**: Contas de teste Ethereal para desenvolvimento
- **Zero Dependencies**: Nenhuma dependência externa de runtime

## Versão

Versão utilizada no projeto: **7.0.4**

## Instalação

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Casos de Uso no Projeto

### Configuração Básica SMTP
```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Email de Boas-vindas
```javascript
async function sendWelcomeEmail(userEmail, userName) {
  const mailOptions = {
    from: '"App Name" <noreply@example.com>',
    to: userEmail,
    subject: "Bem-vindo ao nosso app! 🎉",
    html: `
      <h1>Olá, ${userName}!</h1>
      <p>Seja bem-vindo ao nosso aplicativo.</p>
      <p>Agora você pode começar a usar todos os recursos disponíveis.</p>
    `,
    text: `Olá, ${userName}! Seja bem-vindo ao nosso aplicativo.`
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Email enviado:", info.messageId);
}
```

### Recuperação de Senha
```javascript
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: '"Support" <support@example.com>',
    to: email,
    subject: "Redefinir sua senha",
    html: `
      <h2>Redefinição de Senha</h2>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Redefinir Senha
      </a>
      <p>Este link expira em 1 hora.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
```

### Notificações do Sistema
```javascript
async function sendNotificationEmail(userEmail, title, message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  const mailOptions = {
    from: '"Sistema" <sistema@example.com>',
    to: userEmail,
    subject: `${icons[type]} ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>${icons[type]} ${title}</h2>
        <p>${message}</p>
        <hr>
        <small>Esta é uma mensagem automática do sistema.</small>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
```

### Email com Anexos
```javascript
async function sendInvoiceEmail(userEmail, invoiceData, pdfBuffer) {
  const mailOptions = {
    from: '"Financeiro" <financeiro@example.com>',
    to: userEmail,
    subject: `Fatura #${invoiceData.number}`,
    html: `
      <h2>Sua fatura está pronta</h2>
      <p>Olá, ${invoiceData.customerName}!</p>
      <p>Segue em anexo a fatura #${invoiceData.number} no valor de R$ ${invoiceData.amount}.</p>
    `,
    attachments: [
      {
        filename: `fatura-${invoiceData.number}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
}
```

## Configurações Avançadas

### Transporter com Pool de Conexões
```javascript
const transporter = nodemailer.createTransport({
  pool: true,
  host: "smtp.example.com",
  port: 465,
  secure: true,
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Configuração OAuth2 (Gmail)
```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});
```

### Configuração para Desenvolvimento
```javascript
function createTransporter() {
  if (process.env.NODE_ENV === "production") {
    // Produção - SendGrid
    return nodemailer.createTransporter({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
  }

  // Desenvolvimento - Ethereal (emails de teste)
  return nodemailer.createTransporter({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USERNAME,
      pass: process.env.ETHEREAL_PASSWORD
    }
  });
}
```

### TLS/SSL Personalizado
```javascript
const transporter = nodemailer.createTransporter({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  tls: {
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    ca: fs.readFileSync("ca-cert.pem"),
    cert: fs.readFileSync("client-cert.pem"),
    key: fs.readFileSync("client-key.pem")
  },
  auth: {
    user: "username",
    pass: "password",
  },
});
```

## Templates e Conteúdo Avançado

### Email com Imagens Embedadas
```javascript
const mailOptions = {
  from: '"App" <app@example.com>',
  to: "user@example.com",
  subject: "Relatório Mensal",
  html: `
    <h1>Relatório Mensal</h1>
    <img src="cid:logo@company" alt="Logo" width="200">
    <p>Confira o gráfico de vendas:</p>
    <img src="cid:chart@report" alt="Gráfico" width="400">
  `,
  attachments: [
    {
      filename: "logo.png",
      path: "./assets/logo.png",
      cid: "logo@company"
    },
    {
      filename: "chart.png",
      content: chartBuffer,
      cid: "chart@report"
    }
  ]
};
```

### Templates com Conteúdo Alternativo
```javascript
const mailOptions = {
  from: '"Newsletter" <news@example.com>',
  to: "subscriber@example.com",
  subject: "Newsletter Semanal",
  text: "Versão em texto simples da newsletter...",
  html: "<h1>Newsletter</h1><p>Versão HTML rica...</p>",
  alternatives: [
    {
      contentType: "text/x-web-markdown",
      content: "# Newsletter\n\nVersão em **Markdown**..."
    }
  ]
};
```

### Múltiplos Anexos
```javascript
const mailOptions = {
  attachments: [
    // String UTF-8
    { filename: "info.txt", content: "Informações importantes" },
    
    // Buffer binário
    { filename: "data.bin", content: Buffer.from("dados", "utf-8") },
    
    // Arquivo local
    { filename: "doc.pdf", path: "/caminho/para/documento.pdf" },
    
    // Stream
    { filename: "stream.txt", content: fs.createReadStream("arquivo.txt") },
    
    // URL remota
    { 
      filename: "remote.jpg", 
      path: "https://example.com/image.jpg" 
    },
    
    // Base64
    { 
      filename: "base64.txt", 
      content: "aGVsbG8gd29ybGQ=", 
      encoding: "base64" 
    },
    
    // Data URI
    { 
      path: "data:text/plain;base64,aGVsbG8gd29ybGQ=" 
    }
  ]
};
```

## Verificação e Teste

### Verificar Configuração
```javascript
// Verificar conexão SMTP
try {
  await transporter.verify();
  console.log("Servidor pronto para enviar emails");
} catch (error) {
  console.error("Erro na configuração:", error);
}
```

### Conta de Teste Ethereal
```javascript
// Criar conta de teste automática
const testAccount = await nodemailer.createTestAccount();

const testTransporter = nodemailer.createTransporter({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass
  }
});

const info = await testTransporter.sendMail(mailOptions);

// URL para visualizar o email enviado
console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
```

## Integração com Serviços Conhecidos

### SendGrid
```javascript
const transporter = nodemailer.createTransporter({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY
  }
});
```

### Mailgun
```javascript
const transporter = nodemailer.createTransporter({
  host: "smtp.mailgun.org",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILGUN_SMTP_LOGIN,
    pass: process.env.MAILGUN_SMTP_PASSWORD
  }
});
```

### Amazon SES
```javascript
const aws = require('aws-sdk');

const transporter = nodemailer.createTransporter({
  SES: new aws.SES({
    apiVersion: '2010-12-01',
    region: 'us-east-1'
  })
});
```

## Monitoramento e Logs

### Configuração de Logs
```javascript
const transporter = nodemailer.createTransporter({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // Log para console
  debug: true,  // Incluir tráfego SMTP
});
```

### Tratamento de Erros
```javascript
async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email enviado com sucesso: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Falha ao enviar email após ${maxRetries} tentativas`);
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Integração com TypeScript

```typescript
import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

interface EmailService {
  sendWelcomeEmail(email: string, name: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
}

class NodemailerService implements EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: '"App" <noreply@app.com>',
      to: email,
      subject: "Bem-vindo!",
      html: `<h1>Olá, ${name}!</h1>`,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/reset?token=${token}`;
    
    const mailOptions: SendMailOptions = {
      from: '"Support" <support@app.com>',
      to: email,
      subject: "Redefinir senha",
      html: `<a href="${resetUrl}">Redefinir senha</a>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
```

## Performance e Boas Práticas

### Pool de Conexões
```javascript
// Configurar pool para alto volume
const transporter = nodemailer.createTransporter({
  pool: true,
  host: "smtp.example.com",
  port: 587,
  secure: false,
  maxConnections: 10,    // Máximo de conexões simultâneas
  maxMessages: 500,      // Máximo de emails por conexão
  rateDelta: 1000,       // Intervalo entre emails (ms)
  rateLimit: 5,          // Máximo de emails por intervalo
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

### Fila de Emails
```javascript
const emailQueue = [];
let isProcessing = false;

async function queueEmail(mailOptions) {
  emailQueue.push(mailOptions);
  
  if (!isProcessing) {
    processEmailQueue();
  }
}

async function processEmailQueue() {
  isProcessing = true;
  
  while (emailQueue.length > 0) {
    const mailOptions = emailQueue.shift();
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('Email enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      // Recolocar na fila ou enviar para dead letter queue
    }
    
    // Delay entre envios
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessing = false;
}
```

## Recursos Relacionados

- [Documentação Oficial](https://nodemailer.com/)
- [Lista de Serviços Conhecidos](https://nodemailer.com/smtp/well-known/)
- [Ethereal Email (Testing)](https://ethereal.email/)
- [OAuth2 Setup Guide](https://nodemailer.com/smtp/oauth2/)

Nodemailer é a solução definitiva para envio de emails em aplicações Node.js, oferecendo flexibilidade, segurança e performance para qualquer necessidade de comunicação por email.
