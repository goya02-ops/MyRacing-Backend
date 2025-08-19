import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';

@Entity()
export class Membresia extends BaseEntity {

  @Property({nullable: false})
  descripcion!: string;

  @Property({nullable: false})
  valorMembresia!: number;

}