import bcrypt from 'bcrypt';
import { orm } from '../shared/orm.js';
import { ValidationError } from '../shared/validation-error.js';
import { User, UserType } from './user.entity.js';
import { isValidEmail, validateRequired } from '../utils/validations.js';

export interface UserInput {
  userName: string;
  realName: string;
  email: string;
  password: string;
  type?: UserType;
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

  async findProfile(id: number | undefined): Promise<User> {
    const em = orm.em;
    return em.findOneOrFail(User, { id });
  },

  async findByEmailOrUserName(
    email: string,
    userName: string
  ): Promise<User | null> {
    const em = orm.em;
    return em.findOne(User, { $or: [{ email }, { userName }] });
  },

  async create(data: UserInput): Promise<User> {
    const validationError = validateRequired(
      data as unknown as Record<string, unknown>,
      ['userName', 'realName', 'email', 'password']
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
        'El email o nombre de usuario ya está registrado'
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = em.create(User, {
      ...data,
      type: data.type ?? UserType.COMMON,
      password: hashedPassword,
    });
    await em.flush();
    return user;
  },

  async update(id: number, data: Partial<UserInput>): Promise<User> {
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id });

    if (data.email) {
      if (!isValidEmail(data.email)) {
        throw new ValidationError('El formato del email es inválido');
      }

      const duplicate = await em.findOne(User, {
        email: data.email,
        id: { $ne: id },
      });
      if (duplicate) {
        throw new ValidationError(
          'El email o nombre de usuario ya está registrado'
        );
      }
    }

    if (data.password) {
      if (data.password.length < 6) {
        throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
      }
      data.password = await bcrypt.hash(data.password, 10);
    }

    if (data.userName) {
      if (data.userName.length < 3) {
        throw new ValidationError('userName debe tener al menos 3 caracteres');
      }
      const duplicateUserName = await em.findOne(User, {
        userName: data.userName,
        id: { $ne: id },
      });
      if (duplicateUserName) {
        throw new ValidationError(
          'El email o nombre de usuario ya está registrado'
        );
      }
    }

    em.assign(user, data);
    await em.flush();
    return user;
  },

  async updateProfile(
    id: number | undefined,
    data: Partial<UserInput>
  ): Promise<User> {
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id });

    if (data.email) {
      if (!isValidEmail(data.email)) {
        throw new ValidationError('El formato del email es inválido');
      }
      const duplicate = await em.findOne(User, {
        email: data.email,
        id: { $ne: id },
      });
      if (duplicate) {
        throw new ValidationError(
          'El email o nombre de usuario ya está registrado'
        );
      }
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
