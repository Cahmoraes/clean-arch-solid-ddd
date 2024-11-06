import { injectable } from 'inversify'

import { Warrior } from './warrior'

@injectable()
export class Ninja extends Warrior {
  public fight(): void {
    console.log(`[${this.name}]: Ninja is fighting`)
  }
}
