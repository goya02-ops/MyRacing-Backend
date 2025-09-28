import { Entity, Property, ManyToOne, Rel, DateTimeType } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { Race } from '../race/race.entity.js';
import { User } from '../user/user.entity.js';

@Entity()
export class RaceUser extends BaseEntity {
  @Property({ type: DateTimeType, nullable: false })
  registrationDateTime!: Date; // Corresponde a 'fecha_hora_inscripcion'

  @Property({ nullable: false })
  startPosition!: number; // Corresponde a 'puesto_salida'

  @Property({ nullable: false })
  finishPosition!: number; // Corresponde a 'puesto_llegada'

  // Relación Many-to-One con Race
  @ManyToOne(() => Race, { nullable: false })
  race!: Rel<Race>;

  // Relación Many-to-One con User
  @ManyToOne(() => User, { nullable: false })
  user!: Rel<User>;
}