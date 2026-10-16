// BE-21: patrón service replicado de src/circuit (BE-20). `getCurrent` absorbe
// la consulta de la membresía vigente que antes vivía en el controller.
import { orm } from '../shared/orm.js';
import { Membership } from './membership.entity.js';
import { currentMembership } from '../utils/currentMembership.js';

export interface MembershipInput {
  dateFrom: Date | string;
  price: number;
}

export const MembershipService = {
  async findAll(): Promise<Membership[]> {
    const em = orm.em;
    return em.find(Membership, {});
  },

  async findOne(id: number): Promise<Membership> {
    const em = orm.em;
    return em.findOneOrFail(Membership, { id });
  },

  async create(data: MembershipInput): Promise<Membership> {
    const em = orm.em;
    const membership = em.create(Membership, data);
    await em.flush();
    return membership;
  },

  async update(
    id: number,
    data: Partial<MembershipInput>,
  ): Promise<Membership> {
    const em = orm.em;
    const membership = await em.findOneOrFail(Membership, { id });
    em.assign(membership, data);
    await em.flush();
    return membership;
  },

  async remove(id: number): Promise<Membership> {
    const em = orm.em;
    const membership = await em.findOneOrFail(Membership, { id });
    await em.removeAndFlush(membership);
    return membership;
  },

  async getCurrent(): Promise<Membership | undefined> {
    const membership = await currentMembership();
    return membership;
  },
};
