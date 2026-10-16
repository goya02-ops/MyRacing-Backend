// BE-22: patrón service replicado de Familia A/B. Las reglas de negocio que
// el controller resolvía con `res.status(400)` ahora se lanzan como
// ValidationError y `handleControllerError` las mapea a 400 con el mismo
// mensaje.
import { orm } from '../shared/orm.js';
import { ValidationError } from '../shared/validation-error.js';
import { User, type UserType } from './user.entity.js';
import { isValidEmail, validateRequired } from '../utils/validations.js';

export interface UserInput {
  userName: string;
  realName: string;
  email: string;
  password: string;
  // La entity lo define como Enum no anulable: omitirlo hoy responde 500.
  type: UserType;
}

export const UserService = {
  async findAll(): Promise<User[]> {
    const em = orm.em;
    return em.find(User, {});
  },

  async findOne(id: number): Promise<User> {
    const em = orm.em;
    return em.findOneOrFail(User, { id });
  },

  // getMe: el id sale del JWT y puede faltar si el token no lo trae.
  async findProfile(id: number | undefined): Promise<User> {
    const em = orm.em;
    return em.findOneOrFail(User, { id });
  },

  async findByEmailOrUserName(
    email: string,
    userName: string,
  ): Promise<User | null> {
    const em = orm.em;
    return em.findOne(User, { $or: [{ email }, { userName }] });
  },

  async create(data: UserInput): Promise<User> {
    const validationError = validateRequired(
      data as unknown as Record<string, unknown>,
      ['userName', 'realName', 'email', 'password'],
    );
    if (validationError) {
      throw new ValidationError(validationError);
    }

    if (!isValidEmail(data.email)) {
      throw new ValidationError('El formato del email es inválido');
    }

    if (!data.userName || data.userName.length < 3) {
      throw new ValidationError('userName debe tener al menos 3 caracteres');
    }

    if (!data.password || data.password.length < 6) {
      throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    }

    const em = orm.em;

    const existingUser = await em.findOne(User, {
      $or: [{ email: data.email }, { userName: data.userName }],
    });

    if (existingUser) {
      throw new ValidationError(
        'El email o nombre de usuario ya está registrado',
      );
    }

    const user = em.create(User, data);
    await em.flush();
    return user;
  },

  async update(id: number, data: Partial<UserInput>): Promise<User> {
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id });

    if (data.email && !isValidEmail(data.email)) {
      throw new ValidationError('El formato del email es inválido');
    }

    em.assign(user, data);
    await em.flush();
    return user;
  },

  // El usuario no puede elevar su propio tipo: se descarta del payload.
  async updateProfile(
    id: number | undefined,
    data: Partial<UserInput>,
  ): Promise<User> {
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id });

    if (data.email && !isValidEmail(data.email)) {
      throw new ValidationError('El formato del email es inválido');
    }

    const sanitizedInput = { ...data };
    delete sanitizedInput.type;

    em.assign(user, sanitizedInput);
    await em.flush();
    return user;
  },

  async remove(id: number): Promise<User> {
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id });
    await em.removeAndFlush(user);
    return user;
  },
};
