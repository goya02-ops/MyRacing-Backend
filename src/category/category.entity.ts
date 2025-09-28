import { Entity, Property, OneToMany, Cascade, Collection } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';

@Entity()
export class Category extends BaseEntity {

  @Property({ nullable: false })
  name!: string

  @Property({nullable: false})
  description!: string

  @Property({nullable: false})
  abbreviation!: string

  @OneToMany(() => CategoryVersion, (categoryVersion) => categoryVersion.category,{
    cascade: [Cascade.ALL] 
  })
  categoryVersions = new Collection<CategoryVersion>(this);
}
