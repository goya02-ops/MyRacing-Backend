import { Entity, Property, ManyToOne, OneToMany, Rel, Cascade, Collection } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';
import { Combination } from '../combination/combination.entity.js';

@Entity()
export class CircuitVersion extends BaseEntity {

  @Property({nullable: false})
  status!: string

  @ManyToOne(() => Circuit, { nullable: false})
  circuit!: Rel<Circuit>;

  @ManyToOne(() => Simulator, { nullable: false})
  simulator!: Rel<Simulator>;

  @OneToMany(() => Combination, (combination) => combination.circuitVersion,{
    cascade: [Cascade.ALL] 
  })
  combinations = new Collection<Combination>(this);
}
