import { PrimaryKey, Property, DateTimeType } from '@mikro-orm/mysql';

export abstract class BaseEntity {
  // NOTE: tsx no preserva los metadatos de reflection de decorators como tsc,
  // por eso usamos 'type' explícito. Ver: https://mikro-orm.io/docs/decorators
  @PrimaryKey({ type: 'number' })
  public id?: number;

  /*
  @Property({ type: DataTimeType })
  createdAt = new Date();

  @Property({ 
    type: DataTimeType, 
    onUpdate: () => new Date() 
  })
  updatedAt = new Date();
  */
}
