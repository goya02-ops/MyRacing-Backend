import { Entity, Property, OneToMany, Cascade, Collection } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { RaceUser } from '../race-user/race-user.entity.js';

@Entity()
export class User extends BaseEntity {

  @Property({ nullable: false })
  description!: string; // Corresponde a 'descripcion' en tu diagrama

  @Property({ nullable: false })
  type!: string; // Corresponde a 'tipo_usuario' en tu diagrama

  @OneToMany(() => RaceUser, (raceUser) => raceUser.user, {
    cascade: [Cascade.ALL]
  })
  raceUsers = new Collection<RaceUser>(this);
}