import { PrimaryKey, Property, DateTimeType } from "@mikro-orm/mysql";

export abstract class BaseEntity {
  @PrimaryKey()
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