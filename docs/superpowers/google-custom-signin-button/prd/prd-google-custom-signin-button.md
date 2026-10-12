# PRD: Botão Google customizado

**Spec:** `../specs/google-custom-signin-button-design.md`

## Visão Geral

Quem entra no VOLT hoje vê um botão de Google que destoa do resto do app: fonte, cores e formato são os do Google, não os do design system. Esta entrega deixa o botão igual aos demais botões do produto nas telas de login, cadastro e confirmação de senha, sem mudar as regras de conta nem os erros que o usuário já conhece.

## Objetivos

Os critérios de sucesso da spec valem (## Visão Geral e ## Testes).

- Nenhuma das 3 telas exibe botão de Google com aparência de terceiro.
- O login por Google continua concluindo com as mesmas respostas de sucesso e erro de hoje (AC-06 a AC-09).

## Histórias de Usuário

- **US-01** — Como visitante da tela de login, eu quero entrar com Google por um botão com a aparência do app para que a página não pareça um formulário de terceiro no meio do produto · **UI:** sim
- **US-02** — Como visitante da tela de cadastro, eu quero criar conta com Google pelo mesmo botão das outras telas para que o acesso por Google seja consistente em todo o app · **UI:** sim
- **US-03** — Como usuário Google sem senha local, eu quero confirmar minha identidade com o botão do app para que a tela de senha pareça parte do produto · **UI:** sim
- **US-04** — Como usuário, eu quero ser avisado com clareza quando o Google não concluir o login para que eu saiba recorrer ao login por e-mail em vez de ficar esperando · **UI:** sim

## Funcionalidades Principais

- **FR-001** (US-01, US-02, US-03) — O botão "Continuar com Google" deve aparecer com a tipografia, o chanfro, a altura e as cores de tema do design system, com o logo oficial do Google, nas três telas (AC-02)
- **FR-002** (US-01, US-02, US-03) — O botão deve concluir o login e entregar à tela uma sessão válida, mantendo as regras de conta e os erros atuais de e-mail não verificado e de conta externa sem vínculo (AC-01, AC-03, AC-08, AC-09)
- **FR-003** (US-01, US-02, US-03) — O botão deve recusar provas de login que não venham do app registrado no Google, recusando também o formato antigo de credencial (AC-06, AC-10)
- **FR-004** (US-04) — Quando o navegador impedir a abertura do consentimento, o app deve avisar o usuário e liberar o botão, mantendo o login por e-mail disponível (AC-04)
- **FR-005** (US-04) — Quando o usuário fechar a janela de consentimento, o app deve liberar o botão sem exibir mensagem de erro (AC-05)
- **FR-006** (US-01, US-02, US-03) — Quando o app não conseguir se comunicar com o provedor, o usuário deve receber o aviso de credencial inválida já existente (AC-07)

## Experiência do Usuário

O botão ocupa a largura do formulário até 400px, com 40px de altura, e aparece abaixo do separador "ou" nas telas de login e cadastro e acima dos campos na tela de senha (norte visual em `../specs/mockups/google-custom-signin-button-visual.md`).

O rótulo é o mesmo nas três telas: "Continuar com Google". Durante a autenticação o botão fica desabilitado com a opacidade do design system; ao final, volta ao estado normal.

Acessibilidade: botão com nome acessível, ícone marcado como decorativo, foco pelo teclado visível e ordem de tabulação igual à dos demais botões da tela.

## Fora de Escopo

As exclusões da spec valem (## Escopo).