export class Left<L> {
  constructor(readonly value: L) {}

  get force() {
    const _self = this
    return {
      right() {
        throw new Error('Cannot call right on left')
      },
      left() {
        return {
          get value() {
            return _self.value
          },
        }
      },
    }
  }

  forceLeft() {
    const _self = this
    return {
      get value() {
        return _self.value
      },
    }
  }

  forceRight() {
    return {
      get value(): never {
        throw new Error('Cannot call right on left')
      },
    }
  }

  public isLeft(): this is L {
    return true
  }

  public isRight(): this is never {
    return false
  }
}

export class Right<R> {
  constructor(readonly value: R) {}

  get force() {
    const _self = this
    return {
      right() {
        return {
          get value() {
            return _self.value
          },
        }
      },
      left() {
        throw new Error('Cannot call left on right')
      },
    }
  }

  forceLeft() {
    return {
      get value(): never {
        throw new Error('Cannot call left on on right')
      },
    }
  }

  forceRight() {
    const _self = this
    return {
      get value() {
        return _self.value
      },
    }
  }

  public isLeft(): this is never {
    return false
  }

  public isRight(): this is R {
    return true
  }
}

export type Either<L, R> = Left<L> | Right<R>

export const left = <L, R>(value: L): Either<L, R> => new Left<L>(value)
export const right = <L, R>(value: R): Either<L, R> => new Right<R>(value)
