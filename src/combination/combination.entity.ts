// Definimos la clase de Combination

import { Entity, Property, ManyToOne, Rel, OneToMany, Cascade, Collection } from "@mikro-orm/mysql";
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from "../category-version/category-version.entity.js";
import { CircuitVersion} from "../circuit-version/circuit-version.entity.js";
import { Race } from "../race/race.entity.js";


@Entity()

export class Combination extends BaseEntity {

    @Property({nullable: false})
    dateFrom!: string;

    @Property({nullable: false})
    dateTo!: string;

    @Property({nullable: false})
    lapsNumber!: number;

    @Property({nullable: false})
    obligatoryStopsQuantity!: number;

    @Property({nullable: false})
    userType!: string;

    @ManyToOne(() =>CategoryVersion, {nullable: false})
    categoryVersion!: Rel<CategoryVersion>;

    @ManyToOne(() => CircuitVersion, {nullable: false})
    circuitVersion!: Rel<CircuitVersion>;

    @OneToMany(() => Race, (race) => race.combination, {
        cascade: [Cascade.ALL]
    })
    races = new Collection<Race>(this);

}