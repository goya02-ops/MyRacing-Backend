import { Entity, Property } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';

@Entity()
export class Membership extends BaseEntity {
  @Property({ type: 'datetime', nullable: false })
  dateFrom!: Date;

  @Property({ type: 'number', nullable: false })
  price!: number;
}
