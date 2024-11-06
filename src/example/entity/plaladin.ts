import { injectable } from 'inversify'

import { Warrior } from './warrior'

@injectable()
export class Paladin extends Warrior {
  fight(): void {
    console.log(`[${this.name}]: Paladin is fighting`)
  }
}
