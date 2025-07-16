// src/simulator/simulator.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class Simulator {
  // @PrimaryKey() indica que id_simulator es la clave primaria.
  // type: 'number' y autoincrement: true le dicen a MikroORM
  // que este campo es numérico y que la base de datos lo generará automáticamente.
  @PrimaryKey({ type: 'number', autoincrement: true })
  id_simulator!: number; // Usamos ! para indicar que será inicializado por ORM/DB

  // @Property() indica que description es una columna normal.
  // type: 'string' define su tipo de dato.
  @Property({ type: 'string' })
  description!: string;
}