import {
  Entity,
  Property,
  OneToMany,
  Cascade,
  Collection,
  Enum,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { RaceUser } from '../race-user/race-user.entity.js';

@Entity()
export class User extends BaseEntity {
  @Property({ nullable: false })
  userName!: string;

  @Property({ nullable: false })
  realName!: string;

  @Property({ nullable: false })
  email!: string;

  @Property({ nullable: false })
  password!: string;

  @Enum(() => UserType)
  type!: UserType;

  @OneToMany(() => RaceUser, (raceUser) => raceUser.user, {
    cascade: [Cascade.ALL],
  })
  raceUsers = new Collection<RaceUser>(this);
}

export enum UserType {
  ADMIN = 'admin',
  COMMON = 'common',
  PREMIUM = 'premium',
}
