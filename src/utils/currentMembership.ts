import { Membership } from '../membership/membership.entity.js';
import { orm } from '../shared/orm.js';

export const currentMembership = async () => {
  const em = orm.em;
  const membershipRepo = em.getRepository(Membership);

  const currentMembershipArray = await membershipRepo.find(
    {},
    {
      orderBy: { dateFrom: 'DESC' },
      limit: 1,
    }
  );

  return currentMembershipArray[0] as Membership;
};
