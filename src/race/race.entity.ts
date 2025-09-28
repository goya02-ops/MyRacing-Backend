import { Entity, Property, OneToMany, Cascade, Collection, Rel, DateTimeType, ManyToOne } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { Combination } from '../combination/combination.entity.js';
import { RaceUser } from '../race-user/race-user.entity.js';

@Entity()
export class Race extends BaseEntity {
  @Property({ type: DateTimeType, nullable: false })
  raceDateTime!: Date;

  @Property({ nullable: false })
  description!: string;

  @Property({ type: DateTimeType, nullable: false })
  registrationDeadline!: Date;

  @ManyToOne(() => Combination, { nullable: false })
  combination!: Rel<Combination>;

  @OneToMany(() => RaceUser, (raceUser) => raceUser.race, {
    cascade: [Cascade.ALL]
  })
  raceUsers = new Collection<RaceUser>(this);
}