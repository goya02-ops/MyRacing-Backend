import { Entity, OneToMany, Property, Cascade, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from '../version_category/version-category.entity.js';
import { CircuitVersion } from '../circuit_version/circuit_version.entity.js';

@Entity()
export class Simulator extends BaseEntity {

  @Property({ nullable: false })
  name!: string;

  @Property({ nullable: false })
  status?: string;  

  @OneToMany(() => CircuitVersion, (circuitVersion) => circuitVersion.simulator,{
    cascade: [Cascade.ALL] 
  })
  circuitVersions = new Collection<CircuitVersion>(this);

  @OneToMany(() => CategoryVersion, (categoryVersion) => categoryVersion.simulator,{
    cascade: [Cascade.ALL] 
  })
  categoryVersions = new Collection<CategoryVersion>(this);
}