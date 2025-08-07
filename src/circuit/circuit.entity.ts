import { Entity, Property, Cascade, Collection, OneToMany } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { Circuit_version } from '../circuit_version/circuit_version.entity.js';

@Entity()
export class Circuit extends BaseEntity {

  @Property({ nullable: false })
  name!: string

  @Property({nullable: false})
  description!: string

  @Property({nullable: false})
  abbreviation!: string

  @OneToMany(() => Circuit_version, (circuit_version) => circuit_version.circuit,{
    cascade: [Cascade.ALL] 
  })
  circuit_versions = new Collection<Circuit_version>(this);
}
