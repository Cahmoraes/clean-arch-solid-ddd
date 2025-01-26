export interface Cloneable<Input, Entity> {
  clone(input?: Input): Entity
}
