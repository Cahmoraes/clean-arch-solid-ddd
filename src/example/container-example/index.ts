import { Container, type interfaces } from 'inversify'

import { Ninja } from '../entity/ninja'
import { Paladin } from '../entity/plaladin'
import type { Warrior } from '../entity/warrior'
import { TYPES_EXAMPLE } from './types-example'

export const containerExample = new Container()

containerExample
  .bind<interfaces.Factory<Warrior>>(TYPES_EXAMPLE.WARRIOR)
  .toFactory<Warrior, [string, string]>(() => {
    return (named: string, name: string) => {
      if (named === 'ninja') return new Ninja(name)
      if (named === 'paladin') return new Paladin(name)
      throw new Error(`Unknown named ${named}`)
    }
  })

export interface NinjaFactory {
  (name: string): Ninja
}

containerExample.bind<Ninja>('Factory<Ninja>').toFactory((): NinjaFactory => {
  return (name: string) => new Ninja(name)
})
