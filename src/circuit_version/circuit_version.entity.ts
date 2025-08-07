import { Entity, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';

@Entity()
export class Circuit_version extends BaseEntity {

  @Property({nullable: false})
  status!: string

  @ManyToOne(() => Circuit, { nullable: true})
  circuit!: Rel<Circuit>;

  @ManyToOne(() => Simulator, { nullable: true})
  simulator!: Rel<Circuit>;
}
