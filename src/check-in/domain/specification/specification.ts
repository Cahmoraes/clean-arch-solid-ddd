export interface Specification<Entity> {
  isSatisfiedBy(entity: Entity): boolean
}
