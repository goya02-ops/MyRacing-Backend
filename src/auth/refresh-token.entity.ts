import { Entity, Property, ManyToOne, Rel } from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { User } from '../user/user.entity.js';

@Entity()
export class RefreshToken extends BaseEntity {
  @Property({ type: 'string', length: 500 })
  token!: string;

  @ManyToOne(() => User, { nullable: false })
  user!: Rel<User>;

  @Property({ type: 'datetime', nullable: true })
  expiresAt?: Date;
}
