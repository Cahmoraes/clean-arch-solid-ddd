export type Optional<Type, Keys extends keyof Type> = Pick<
  Partial<Type>,
  Keys
> &
  Omit<Type, Keys>
