import { Entity, Property, ManyToOne, Cascade, Collection, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
//import { CircuitVersion } from './circuitVersion.entity.js';

@Entity()
export class Circuit extends BaseEntity {

  @Property({ nullable: false })
  name!: string

  @Property({nullable: false})
  description!: string

  @Property({nullable: false})
  abbreviation!: string

  @Property({nullable: false})
  status!: string

//  @ManyToOne(() => CircuitVersion, { nullable: true})
//  circuitVersions: Rel<CircuitVersion>;
}
