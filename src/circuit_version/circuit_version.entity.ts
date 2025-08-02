import { Entity, Property, ManyToMany, Cascade, Collection, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
//import { Circuit_VersionVersion } from './circuit_versionVersion.entity.js';

@Entity()
export class Circuit_Version extends BaseEntity {

  @Property({ nullable: false })
  name!: string

  @Property({nullable: false})
  description!: string

  @Property({nullable: false})
  abbreviation!: string

  @Property({nullable: false})
  status!: string

//  @ManyToMany(() => Circuit_VersionVersion, { nullable: true})
//  circuit_versionVersions: Rel<Circuit_VersionVersion>;
}
