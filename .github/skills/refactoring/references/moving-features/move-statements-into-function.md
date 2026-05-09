# Move Statements into Function

    **Formerly:** — | **Inverse of:** Move Statements to Callers

    ## When to Use
    Use esta refatoração quando o mesmo trecho aparece toda vez que certa função é chamada
    e esse trecho faz mais sentido como parte da função chamada.
    Ela remove duplicação e concentra futuras mudanças em um único ponto.

    ## Code Smells Addressed
    - Código duplicado ao redor de chamadas da mesma função.

    - Responsabilidade espalhada entre callers e callee sem uma boa razão.

    ## Example

    ### Before
    ```typescript
    function renderPerson(person: Person) {
      return [
        `<p>${person.name}</p>`,
        `<p>title: ${person.photo.title}</p>`,
        emitPhotoData(person.photo),
      ].join("
");
    }

    function photoDiv(photo: Photo) {
      return [
        "<div>",
        `<p>title: ${photo.title}</p>`,
        emitPhotoData(photo),
        "</div>",
      ].join("
");
    }

    function emitPhotoData(photo: Photo) {
      return [`<p>location: ${photo.location}</p>`, `<p>date: ${photo.date}</p>`].join("
");
    }
    ```

    ### After
    ```typescript
    function renderPerson(person: Person) {
      return [`<p>${person.name}</p>`, emitPhotoData(person.photo)].join("
");
    }

    function photoDiv(photo: Photo) {
      return ["<div>", emitPhotoData(photo), "</div>"].join("
");
    }

    function emitPhotoData(photo: Photo) {
      return [
        `<p>title: ${photo.title}</p>`,
        `<p>location: ${photo.location}</p>`,
        `<p>date: ${photo.date}</p>`,
      ].join("
");
    }
    ```

    ## Mechanics
    1. Se o código repetitivo não estiver adjacente à chamada da função-alvo, use Slide Statements
       para deixá-lo adjacente.

    2. Se a função-alvo só for chamada pela função-fonte, apenas corte o código da origem,
       cole-o no alvo, teste e ignore o restante da mecânica.

    3. Se houver mais chamadores, aplique Extract Function em um call site para extrair tanto
       a chamada da função-alvo quanto os statements que você quer mover.
       Dê a essa nova função um nome temporário, mas fácil de localizar com grep.

    4. Converta todos os outros call sites para usar a nova função e teste após cada conversão.

    5. Quando todas as chamadas originais usarem a nova função, aplique Inline Function para
       embutir a função original completamente na nova função, removendo a original.

    6. Aplique Rename Function para trocar o nome da nova função pelo nome da original,
       ou por um nome melhor.

    ## Notes
    - Fowler usa esta refatoração como remoção direta de duplicação.

    - Se os statements não fizerem sentido como parte da função chamada, prefira apenas
      Extract Function envolvendo os statements e a chamada.

    - Os passos de inline e rename são o que diferenciam esse caso de uma simples extração.

    - O nome temporário precisa ser transitório, mas fácil de encontrar durante a migração.

    - Move Statements to Callers faz o caminho inverso quando a duplicação deixa de ser comum.

    ## Related Refactorings
    - Slide Statements

    - Extract Function

    - Inline Function
