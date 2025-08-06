import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';

@Entity()
export class User extends BaseEntity {

  @Property({ nullable: false })
  description!: string; // Corresponde a 'descripcion' en tu diagrama

  @Property({ nullable: false })
  type!: string; // Corresponde a 'tipo_usuario' en tu diagrama
}