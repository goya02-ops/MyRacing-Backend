import { Entity, ManyToOne, Property, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
//import { CategoryVersion } from '../categoryVersion/categoryVersion.entity.js';
//import { CircuitVersion } from '../circuitVersion/circuitVersion.entity.js';

@Entity()
export class Simulator extends BaseEntity {

  @Property({ nullable: false })
  name!: string;

  @Property({ nullable: false })
  status?: string;  

  //@ManyToOne(() => CategoryVersion, { nullable: true})
  //categoryVersions = Rel<CategoryVersion>;

  //@ManyToOne(() => CirtcuitVersion, { nullable: true})
  //circuitVersions = Rel<CircuitVersion>;
}