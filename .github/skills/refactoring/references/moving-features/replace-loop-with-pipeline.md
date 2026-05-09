# Replace Loop with Pipeline

    **Formerly:** — | **Inverse of:** —

    ## When to Use
    Use esta refatoração quando um loop percorre uma coleção só para filtrar, transformar
    e acumular resultados.
    A pipeline deixa o fluxo de dados visível de cima para baixo com operações como filter e map.
    Ela costuma deixar a intenção mais legível do que o controle manual do loop.

    ## Code Smells Addressed
    - Loop verboso usado apenas para seleção e transformação de coleções.

    - Lógica de processamento escondida em control flow imperativo desnecessário.

    ## Example

    ### Before
    ```typescript
    function acquireData(input: string) {
      const lines = input.split("
");
      const result: Array<{ city: string; phone: string }> = [];

      for (const line of lines.slice(1)) {
        if (line.trim() === "") {
          continue;
        }
        const fields = line.split(",");
        if (fields[1].trim() === "India") {
          result.push({ city: fields[0].trim(), phone: fields[2].trim() });
        }
      }

      return result;
    }
    ```

    ### After
    ```typescript
    function acquireData(input: string) {
      const lines = input.split("
");

      return lines
        .slice(1)
        .filter(line => line.trim() !== "")
        .map(line => line.split(","))
        .filter(fields => fields[1].trim() === "India")
        .map(fields => ({ city: fields[0].trim(), phone: fields[2].trim() }));
    }
    ```

    ## Mechanics
    1. Crie uma nova variável para a coleção do loop.
       Ela pode ser uma simples cópia de uma variável já existente.

    2. Começando do topo, pegue cada pedaço de comportamento do loop e substitua-o por
       uma operação de pipeline na derivação da variável da coleção do loop.
       Teste após cada mudança.

    3. Quando todo o comportamento tiver saído do loop, remova o loop.

    4. Se o loop atribuía valores a um acumulador, atribua o resultado da pipeline a esse acumulador.

    ## Notes
    - Fowler considera pipelines mais fáceis de seguir porque o leitor acompanha o fluxo de objetos.

    - O exemplo do livro migra o loop em passos pequenos: slice, filter, map, filter, map.

    - O processo é incremental: cada parte do loop vira uma operação antes que o loop desapareça.

    - A troca fica mais segura quando você testa após cada transformação do pipeline.

    - Se o loop só alimenta um acumulador, o resultado natural é devolver a pipeline inteira.

    - Depois da refatoração principal, o autor ainda faz limpeza de nomes e layout.

    - Nem toda iteração precisa virar pipeline, mas coleções com transformação em série costumam ganhar clareza.

    ## Related Refactorings
    - Split Loop

    - Slide Statements

    - Extract Function
