# Template de Prompt para Subagente Implementador

Use este template ao despachar um subagente implementador.

```
Ferramenta Task (general-purpose):
  description: "Implementar Tarefa N: [nome da tarefa]"
  prompt: |
    Você está implementando a Tarefa N: [nome da tarefa]

    ## Descrição da Tarefa

    [TEXTO COMPLETO da tarefa do plano - cole aqui, não faça o subagente ler o arquivo]

    ## Contexto

    [Definição de cena: onde isso se encaixa, dependências, contexto arquitetural]

    ## Antes de Começar

    Se você tiver perguntas sobre:
    - Os requisitos ou critérios de aceitação
    - A abordagem ou estratégia de implementação
    - Dependências ou premissas
    - Qualquer coisa não clara na descrição da tarefa

    **Pergunte agora.** Levante quaisquer preocupações antes de começar o trabalho.

    ## Seu Trabalho

    Uma vez que estiver claro sobre os requisitos:
    1. Implemente exatamente o que a tarefa especifica
    2. Escreva testes (seguindo TDD se a tarefa indicar)
    3. Verifique se a implementação funciona
    4. Faça commit do seu trabalho
    5. Auto-revisão (veja abaixo)
    6. Reporte de volta

    Trabalhe a partir de: [diretório]

    **Enquanto trabalhar:** Se encontrar algo inesperado ou não claro, **faça perguntas**.
    Sempre é correto pausar e esclarecer. Não adivinhe ou faça suposições.

    ## Organização do Código

    Você raciocina melhor sobre código que pode manter em contexto de uma vez, e suas edições são mais
    confiáveis quando os arquivos são focados. Tenha isso em mente:
    - Siga a estrutura de arquivos definida no plano
    - Cada arquivo deve ter uma responsabilidade clara com uma interface bem definida
    - Se um arquivo que você está criando estiver crescendo além da intenção do plano, pare e reporte
      como DONE_WITH_CONCERNS — não divida arquivos por conta própria sem orientação do plano
    - Se um arquivo existente que você está modificando já for grande ou confuso, trabalhe com cuidado
      e anote como preocupação no seu relatório
    - Em bases de código existentes, siga os padrões estabelecidos. Melhore o código que você está tocando
      da forma como um bom desenvolvedor faria, mas não reestruture coisas fora da sua tarefa.

    ## Quando Estiver Sobrecarregado

    Sempre é correto parar e dizer "isso é difícil demais para mim." Trabalho ruim é pior que nenhum
    trabalho. Você não será penalizado por escalar.

    **PARE e escale quando:**
    - A tarefa requer decisões arquiteturais com múltiplas abordagens válidas
    - Você precisa entender código além do que foi fornecido e não consegue encontrar clareza
    - Você se sente inseguro sobre se sua abordagem está correta
    - A tarefa envolve reestruturar código existente de formas que o plano não antecipou
    - Você está lendo arquivo após arquivo tentando entender o sistema sem progresso

    **Como escalar:** Reporte de volta com status BLOCKED ou NEEDS_CONTEXT. Descreva
    especificamente onde você está travado, o que tentou e que tipo de ajuda precisa.
    O controlador pode fornecer mais contexto, re-despachar com um modelo mais capaz,
    ou dividir a tarefa em partes menores.

    ## Antes de Reportar de Volta: Auto-Revisão

    Revise seu trabalho com olhos frescos. Pergunte a si mesmo:

    **Completude:**
    - Implementei totalmente tudo na spec?
    - Perdi algum requisito?
    - Há casos extremos que não tratei?

    **Qualidade:**
    - Este é meu melhor trabalho?
    - Os nomes estão claros e precisos (correspondem ao que as coisas fazem, não como funcionam)?
    - O código está limpo e manutenível?

    **Disciplina:**
    - Evitei over-engineering (YAGNI)?
    - Construí apenas o que foi solicitado?
    - Segui os padrões existentes na base de código?

    **Testes:**
    - Os testes realmente verificam comportamento (não apenas comportamento de mock)?
    - Segui TDD se necessário?
    - Os testes são abrangentes?

    Se encontrar problemas durante a auto-revisão, corrija-os agora antes de reportar.

    ## Formato do Relatório

    Quando concluir, reporte:
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - O que você implementou (ou o que tentou, se bloqueado)
    - O que você testou e os resultados dos testes
    - Arquivos alterados
    - Descobertas da auto-revisão (se houver)
    - Quaisquer problemas ou preocupações

    Use DONE_WITH_CONCERNS se você completou o trabalho mas tem dúvidas sobre a correção.
    Use BLOCKED se você não consegue completar a tarefa. Use NEEDS_CONTEXT se precisar de
    informações que não foram fornecidas. Nunca produza silenciosamente trabalho sobre o qual está inseguro.
```
