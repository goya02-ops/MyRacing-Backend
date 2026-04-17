import {
  Entity,
  Property,
  OneToMany,
  Cascade,
  Collection,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';

@Entity()
export class Category extends BaseEntity {
  @Property({ type: 'string', nullable: false })
  denomination!: string;

  @Property({ type: 'string', nullable: false })
  description!: string;

  @Property({ type: 'string', nullable: false })
  abbreviation!: string;

  @OneToMany(
    () => CategoryVersion,
    (categoryVersion) => categoryVersion.category,
    {
      cascade: [Cascade.ALL],
    }
  )
  categoryVersions = new Collection<CategoryVersion>(this);
}
