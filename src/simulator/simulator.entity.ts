import { Entity, OneToMany, Property, Cascade, Collection } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { VersionCategory as Category_version } from '../version_category/version-category.entity.js';
import { Circuit_version } from '../circuit_version/circuit_version.entity.js';

@Entity()
export class Simulator extends BaseEntity {

  @Property({ nullable: false })
  name!: string;

  @Property({ nullable: false })
  status?: string;  

  @OneToMany(() => Circuit_version, (circuit_version) => circuit_version.simulator,{
    cascade: [Cascade.ALL] 
  })
  circuit_versions = new Collection<Circuit_version>(this);

  @OneToMany(() => Category_version, (category_version) => category_version.simulator,{
    cascade: [Cascade.ALL] 
  })
  category_versions = new Collection<Category_version>(this);
}