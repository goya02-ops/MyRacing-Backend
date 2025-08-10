//Definimos la clase version categoria

import { Entity, Property, ManyToOne, Rel } from "@mikro-orm/core";
import { BaseEntity } from  "../shared/baseEntity.js";
import { Category } from "../category/category.entity.js";
import { Simulator } from "../simulator/simulator.entity.js";

@Entity()
export class CategoryVersion extends BaseEntity {

    @Property({nullable: false})
    status!: string;

    @ManyToOne(() => Category, {nullable: false})
    category!: Rel<Category>;
    @ManyToOne(() => Simulator, {nullable:false})
    simulator!: Rel<Simulator>

}