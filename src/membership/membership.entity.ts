import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';

@Entity()
export class Membership extends BaseEntity {

  @Property({nullable: false})
  denomination!: string;

  @Property({nullable: false})
  price!: number;

}