# Move Statements to Callers

**Formerly:** — | **Inverse of:** Move Statements into Function

## When to Use
Use esta refatoração quando a fronteira da função deixou de ser coesa e parte do seu
comportamento precisa variar conforme o caller.
Ela é útil quando um comportamento comum continua existindo, mas alguns callers agora
precisam tratá-lo de forma diferente.

## Code Smells Addressed
- Função que mistura comportamentos que mudam por motivos diferentes.

- Abstração com fronteiras erradas entre caller e callee.

## Example

### Before
```typescript
function renderPerson(person: Person) {
  emitPhotoData(person.photo);
}

function listRecentPhotos(photos: Photo[]) {
  for (const photo of photos) {
    emitPhotoData(photo);
  }
}

function emitPhotoData(photo: Photo) {
  console.log(`title: ${photo.title}`);
  console.log(`date: ${photo.date}`);
  console.log(`location: ${photo.location}`);
}
```

### After
```typescript
function renderPerson(person: Person) {
  emitPhotoData(person.photo);
  console.log(`location: ${person.photo.location}`);
}

function listRecentPhotos(photos: Photo[]) {
  for (const photo of photos) {
    emitPhotoData(photo);
    console.log(`location: ${photo.city}, ${photo.location}`);
  }
}

function emitPhotoData(photo: Photo) {
  console.log(`title: ${photo.title}`);
  console.log(`date: ${photo.date}`);
}
```

## Mechanics
1. Em circunstâncias simples, com um ou dois callers e uma função pequena, corte a linha
   que ficou na borda da função chamada, cole-a nos callers, ajuste se necessário, teste e pare.

2. Caso contrário, aplique Extract Function a todos os statements que você não quer mover.
   Use um nome temporário, mas fácil de localizar.

3. Se a função for um método sobrescrito por subclasses, faça a extração em todas elas para
   que o método restante fique idêntico em todas as classes. Depois remova os métodos das subclasses.

4. Aplique Inline Function na função original.

5. Aplique Change Function Declaration na função extraída para renomeá-la com o nome original,
   ou com um nome melhor.

## Notes
- Fowler costuma usar Slide Statements antes, para levar o comportamento variável ao início ou ao fim.

- A refatoração funciona melhor em mudanças pequenas nos limites da abstração.

- Quando a fronteira inteira precisa ser redesenhada, o autor recomenda Inline Function primeiro,
  seguido de novos slides e extrações.

- O alvo aqui não é remover comportamento comum, mas separar o comportamento que deixou de ser comum.

- O texto mostra tanto o atalho direto quanto o procedimento mais seguro para casos menos triviais.

## Related Refactorings
- Slide Statements

- Extract Function

- Inline Function
