import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NotFoundError, RequestContext } from '@mikro-orm/mysql';
import { orm } from './shared/orm.js';
import { ValidationError } from './shared/validation-error.js';
import { User, UserType } from './user/user.entity.js';
import { UserService, type UserInput } from './user/user.service.js';
import { Race } from './race/race.entity.js';
import { RaceService, type RaceInput } from './race/race.service.js';
import { Combination } from './combination/combination.entity.js';
import {
  CombinationService,
  type CombinationInput,
} from './combination/combination.service.js';
import {
  cleanupCatalog,
  seedCatalog,
  seedCombination,
  seedRace,
  type CatalogIds,
} from './test/fixtures.js';

// BE-22: la Familia C (user, race, combination) migra al patrón service. Las
// reglas de negocio que el controller resolvía con `res.status(400)` ahora se
// lanzan como ValidationError y `handleControllerError` las mapea a 400 con el
// mismo mensaje. Los tests de integración HTTP existentes (combination.test,
// race.controller.test, app.error-handling.test) siguen cubriendo el contrato.
function inContext<T>(fn: () => Promise<T>): Promise<T> {
  return RequestContext.create(orm.em, fn);
}

describe('Familia C: UserService (BE-22)', () => {
  const suffix = `be22u_${Date.now()}`;
  const userIds: number[] = [];
  let userSeq = 0;

  async function createUser(
    overrides: Partial<UserInput> = {},
  ): Promise<User> {
    userSeq += 1;
    const user = await inContext(() =>
      UserService.create({
        userName: `${suffix}_name_${userSeq}`,
        realName: 'BE-22 user',
        email: `${suffix}_${userSeq}@example.com`,
        password: 'secret1',
        type: UserType.COMMON,
        ...overrides,
      }),
    );
    userIds.push(user.id!);
    return user;
  }

  afterAll(async () => {
    const em = orm.em.fork();
    for (const id of userIds) {
      await em.nativeDelete(User, { id });
    }
  });

  it('1. create valida devuelve el usuario con id', async () => {
    const user = await createUser();
    expect(user.id).toBeTypeOf('number');
    expect(user.type).toBe(UserType.COMMON);
  });

  it('2. create con email ya registrado lanza ValidationError', async () => {
    const user = await createUser();
    const error = await inContext(() =>
      UserService.create({
        userName: `${suffix}_dup`,
        realName: 'otro',
        email: user.email,
        password: 'secret1',
      }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as Error).message).toBe(
      'El email o nombre de usuario ya está registrado',
    );
  });

  it('3. create valida las reglas de negocio con los mismos mensajes', async () => {
    await expect(
      inContext(() =>
        UserService.create({
          userName: `${suffix}_x`,
          email: 'a@b.c',
        } as UserInput),
      ),
    ).rejects.toThrow('Campo requerido: realName');

    await expect(
      inContext(() =>
        UserService.create({
          userName: `${suffix}_x`,
          realName: 'x',
          email: 'no-es-email',
          password: 'secret1',
        }),
      ),
    ).rejects.toThrow('El formato del email es inválido');

    await expect(
      inContext(() =>
        UserService.create({
          userName: 'ab',
          realName: 'x',
          email: 'a@b.c',
          password: 'secret1',
        }),
      ),
    ).rejects.toThrow('userName debe tener al menos 3 caracteres');

    await expect(
      inContext(() =>
        UserService.create({
          userName: `${suffix}_x`,
          realName: 'x',
          email: 'a@b.c',
          password: 'abc',
        }),
      ),
    ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
  });

  it('4. findOne devuelve el usuario y con id inexistente lanza NotFoundError', async () => {
    const user = await createUser();
    const found = await inContext(() => UserService.findOne(user.id!));
    expect(found.id).toBe(user.id);
    await expect(
      inContext(() => UserService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('5. findByEmailOrUserName encuentra el usuario creado', async () => {
    const user = await createUser();
    const found = await inContext(() =>
      UserService.findByEmailOrUserName(user.email, user.userName),
    );
    expect(found?.id).toBe(user.id);
  });

  it('6. update persiste y valida el formato del email', async () => {
    const user = await createUser();
    const updated = await inContext(() =>
      UserService.update(user.id!, { realName: 'actualizado' }),
    );
    expect(updated.realName).toBe('actualizado');

    await expect(
      inContext(() => UserService.update(user.id!, { email: 'malformado' })),
    ).rejects.toThrow('El formato del email es inválido');
  });

  it('7. updateProfile no permite cambiar el tipo de usuario', async () => {
    const user = await createUser();
    const updated = await inContext(() =>
      UserService.updateProfile(user.id!, {
        realName: 'perfil',
        type: UserType.ADMIN,
      }),
    );
    expect(updated.realName).toBe('perfil');
    expect(updated.type).toBe(UserType.COMMON);
  });

  it('8. remove borra el usuario y luego findOne lanza NotFoundError', async () => {
    const user = await createUser();
    await inContext(() => UserService.remove(user.id!));
    await expect(
      inContext(() => UserService.findOne(user.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia C: RaceService (BE-22)', () => {
  const DATE_FROM = '2026-01-01T00:00:00.000Z';
  const DATE_TO = '2026-01-01T04:00:00.000Z';
  const RACE_AT = '2026-01-01T02:00:00.000Z';
  const DEADLINE = '2026-01-01T01:45:00.000Z';

  let catalog: CatalogIds;
  let combinationId: number;
  let raceId: number;

  beforeAll(async () => {
    catalog = await seedCatalog('be22r');
    const combination = await seedCombination(catalog, {
      dateFrom: new Date(DATE_FROM),
      dateTo: new Date(DATE_TO),
    });
    combinationId = combination.id!;
    const race = await seedRace(
      combination.id!,
      new Date(RACE_AT),
      new Date(DEADLINE),
    );
    raceId = race.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(Race, { id: raceId });
    await em.nativeDelete(Combination, { id: combinationId });
    await cleanupCatalog(catalog);
  });

  it('1. create devuelve la carrera poblada con su combinación', async () => {
    const created = await inContext(() =>
      RaceService.create({
        raceDateTime: new Date(RACE_AT),
        registrationDeadline: new Date(DEADLINE),
        combination: combinationId,
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.combination.id).toBe(combinationId);
    await orm.em.fork().nativeDelete(Race, { id: created.id! });
  });

  it('2. create valida fechas e id de combinación con los mismos mensajes', async () => {
    await expect(
      inContext(() =>
        RaceService.create({
          raceDateTime: new Date(RACE_AT),
          registrationDeadline: new Date('2026-01-01T02:00:00.000Z'),
          combination: combinationId,
        }),
      ),
    ).rejects.toThrow(
      'registrationDeadline debe ser anterior a raceDateTime',
    );

    await expect(
      inContext(() =>
        RaceService.create({
          raceDateTime: new Date(RACE_AT),
          registrationDeadline: new Date(DEADLINE),
          combination: 'abc',
        }),
      ),
    ).rejects.toThrow('ID de combinación inválido');

    await expect(
      inContext(() =>
        RaceService.create({
          raceDateTime: new Date(RACE_AT),
          registrationDeadline: new Date(DEADLINE),
          combination: 999999999,
        }),
      ),
    ).rejects.toThrow(
      'registrationDeadline debe ser anterior a raceDateTime',
    );

    await expect(
      inContext(() =>
        RaceService.create({
          raceDateTime: new Date(RACE_AT),
        } as RaceInput),
      ),
    ).rejects.toThrow('Campo requerido: registrationDeadline');
  });

  it('3. update valida SIEMPRE la entidad fusionada (regresión BE-17)', async () => {
    await expect(
      inContext(() =>
        RaceService.update(raceId, {
          registrationDeadline: '2026-01-01T03:00:00.000Z',
        }),
      ),
    ).rejects.toThrow(
      'registrationDeadline debe ser anterior a raceDateTime',
    );

    const updated = await inContext(() =>
      RaceService.update(raceId, {
        registrationDeadline: '2026-01-01T01:55:00.000Z',
      }),
    );
    expect(updated.registrationDeadline.toISOString()).toBe(
      '2026-01-01T01:55:00.000Z',
    );
  });

  it('4. findCurrentByCombination separa carreras pasadas y futuras', async () => {
    const result = await inContext(() =>
      RaceService.findCurrentByCombination('5', '5', combinationId),
    );
    expect(result.limitPrev).toBe(5);
    expect(result.previousRaces.map((r) => r.id)).toContain(raceId);
    expect(Array.isArray(result.nextRaces)).toBe(true);
  });

  it('5. findCurrentByCombination con combinación inválida lanza ValidationError', async () => {
    await expect(
      inContext(() => RaceService.findCurrentByCombination('5', '5', 'abc')),
    ).rejects.toThrow('ID de combinación inválido');
  });

  it('6. findOne popula combination/raceUsers y con id inexistente lanza NotFoundError', async () => {
    const found = await inContext(() => RaceService.findOne(raceId));
    expect(found.id).toBe(raceId);
    expect(found.raceUsers.isInitialized()).toBe(true);
    await expect(
      inContext(() => RaceService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('7. remove borra la carrera y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      RaceService.create({
        raceDateTime: new Date('2026-01-01T03:30:00.000Z'),
        registrationDeadline: new Date('2026-01-01T03:20:00.000Z'),
        combination: combinationId,
      }),
    );
    await inContext(() => RaceService.remove(temp.id!));
    await expect(
      inContext(() => RaceService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia C: CombinationService (BE-22)', () => {
  let catalog: CatalogIds;
  let otherCatalog: CatalogIds;
  const combinationIds: number[] = [];

  beforeAll(async () => {
    catalog = await seedCatalog('be22c');
    otherCatalog = await seedCatalog('be22o');
  });

  afterAll(async () => {
    // nativeDelete en orden de dependencias: el cascade no dispara al borrar
    // combinaciones sin la colección `races` cargada (FK race.combination_id).
    const em = orm.em.fork();
    await em.nativeDelete(Race, { combination: { $in: combinationIds } });
    await em.nativeDelete(Combination, { id: { $in: combinationIds } });
    await cleanupCatalog(otherCatalog);
    await cleanupCatalog(catalog);
  });

  function payload(overrides: Record<string, unknown> = {}): CombinationInput {
    return {
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-01-01T04:00:00.000Z',
      lapsNumber: 3,
      obligatoryStopsQuantity: 1,
      userType: 'common',
      raceIntervalMinutes: 60,
      categoryVersion: catalog.categoryVersionId,
      circuitVersion: catalog.circuitVersionId,
      ...overrides,
    } as CombinationInput;
  }

  async function countRacesFor(combinationId: number): Promise<number> {
    return orm.em.fork().count(Race, { combination: combinationId });
  }

  it('1. create genera exactamente las carreras esperadas', async () => {
    const created = await inContext(() =>
      CombinationService.create(payload()),
    );
    combinationIds.push(created.id!);
    expect(created.id).toBeTypeOf('number');
    expect(await countRacesFor(created.id!)).toBe(5); // 00,01,02,03,04
    expect(created.categoryVersion.category.id).toBe(catalog.categoryId);
    expect(created.circuitVersion.circuit.id).toBe(catalog.circuitId);
  });

  it('2. create valida intervalo, tope y simulador con los mismos mensajes', async () => {
    await expect(
      inContext(() =>
        CombinationService.create(
          payload({ raceIntervalMinutes: 0 }),
        ),
      ),
    ).rejects.toThrow(/raceIntervalMinutes/i);

    await expect(
      inContext(() =>
        CombinationService.create(
          payload({
            dateFrom: '2026-01-01T00:00:00.000Z',
            dateTo: '2027-01-01T00:00:00.000Z',
            raceIntervalMinutes: 1,
          }),
        ),
      ),
    ).rejects.toThrow(/10000/);

    await expect(
      inContext(() =>
        CombinationService.create(
          payload({
            categoryVersion: catalog.categoryVersionId,
            circuitVersion: otherCatalog.circuitVersionId,
          }),
        ),
      ),
    ).rejects.toThrow(
      'CategoryVersion and CircuitVersion must belong to the same Simulator.',
    );

    await expect(
      inContext(() =>
        CombinationService.create(
          payload({
            dateFrom: '2026-01-01T04:00:00.000Z',
            dateTo: '2026-01-01T00:00:00.000Z',
          }),
        ),
      ),
    ).rejects.toThrow('dateFrom must be earlier than dateTo.');
  });

  it('3. update extiende dateTo y agrega solo las carreras nuevas', async () => {
    const created = await inContext(() =>
      CombinationService.create(
        payload({ dateTo: '2026-01-01T01:00:00.000Z' }),
      ),
    );
    combinationIds.push(created.id!);
    expect(await countRacesFor(created.id!)).toBe(2); // 00,01

    const updated = await inContext(() =>
      CombinationService.update(
        created.id!,
        payload({ dateTo: '2026-01-01T03:00:00.000Z' }),
      ),
    );
    expect(updated.id).toBe(created.id!);
    expect(await countRacesFor(created.id!)).toBe(4); // +02,03
  });

  it('4. update no permite modificar dateFrom', async () => {
    const created = await inContext(() =>
      CombinationService.create(
        payload({ dateTo: '2026-01-01T01:00:00.000Z' }),
      ),
    );
    combinationIds.push(created.id!);

    await expect(
      inContext(() =>
        CombinationService.update(
          created.id!,
          payload({ dateFrom: '2025-12-31T00:00:00.000Z' }),
        ),
      ),
    ).rejects.toThrow(
      'No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.',
    );
  });

  it('5. findOne popula versiones y carreras; id inexistente lanza NotFoundError', async () => {
    const created = await inContext(() =>
      CombinationService.create(
        payload({ dateTo: '2026-01-01T01:00:00.000Z' }),
      ),
    );
    combinationIds.push(created.id!);

    const found = await inContext(() => CombinationService.findOne(created.id!));
    expect(found.races.isInitialized()).toBe(true);
    expect(found.races.getItems()).toHaveLength(2);
    await expect(
      inContext(() => CombinationService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('6. findAll y findCurrent filtran con populate aplicado', async () => {
    const all = await inContext(() => CombinationService.findAll());
    expect(Array.isArray(all)).toBe(true);
    const current = await inContext(() => CombinationService.findCurrent());
    expect(Array.isArray(current)).toBe(true);
  });

  it('7. remove borra la combinación y luego findOne lanza NotFoundError', async () => {
    const created = await inContext(() =>
      CombinationService.create(
        payload({ dateTo: '2026-01-01T01:00:00.000Z' }),
      ),
    );
    combinationIds.push(created.id!);
    // Las carreras generadas deben borrarse antes: `remove` no carga `races`
    // (mismo quirk de FK que el afterAll).
    await orm.em
      .fork()
      .nativeDelete(Race, { combination: created.id! });
    await inContext(() => CombinationService.remove(created.id!));
    await expect(
      inContext(() => CombinationService.findOne(created.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});
