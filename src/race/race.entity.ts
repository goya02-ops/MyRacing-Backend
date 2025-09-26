import { Entity, Property, OneToOne, OneToMany, Cascade, Collection, Rel, DateTimeType } from '@mikro-orm/core';
import { BaseEntity } from '../shared/baseEntity.js';
import { Combination } from '../combination/combination.entity.js';
import { RaceUser } from '../race-user/race-user.entity.js';

@Entity()
export class Race extends BaseEntity {
  @Property({ type: DateTimeType, nullable: false })
  raceDateTime!: Date;

  @Property({ nullable: true })
  result?: string;

  @Property({ nullable: false })
  description!: string;

  @Property({ type: DateTimeType, nullable: false })
  registrationDeadline!: Date;

  @OneToOne(() => Combination, { nullable: false })
  combination!: Rel<Combination>;

  @OneToMany(() => RaceUser, (raceUser) => raceUser.race, {
    cascade: [Cascade.ALL]
  })
  raceUsers = new Collection<RaceUser>(this);
}