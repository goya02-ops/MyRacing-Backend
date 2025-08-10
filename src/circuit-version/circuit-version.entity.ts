import { Entity, Property, ManyToOne, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';

@Entity()
export class CircuitVersion extends BaseEntity {

  @Property({nullable: false})
  status!: string

  @ManyToOne(() => Circuit, { nullable: false})
  circuit!: Rel<Circuit>;

  @ManyToOne(() => Simulator, { nullable: false})
  simulator!: Rel<Simulator>;
}
