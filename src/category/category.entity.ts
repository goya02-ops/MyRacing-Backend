import { Entity, Property, ManyToOne, Cascade, Collection, Rel } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
//import { CategoryVersion } from './categoryVersion.entity.js';

@Entity()
export class Category extends BaseEntity {

  @Property({ nullable: false })
  name!: string

  @Property({nullable: false})
  description!: string

  @Property({nullable: false})
  abbreviation!: string

  @Property({nullable: false})
  status!: string

//  @ManyToOne(() => CategoryVersion, { nullable: true})
//  categoryVersions: Rel<CategoryVersion>;
}
