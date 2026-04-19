import bcrypt from 'bcrypt';
import { orm } from '../shared/orm.js';
import { User, UserType } from '../user/user.entity.js';
import { isValidEmail } from '../utils/validations.js';
import { validateRequired } from '../shared/validators.js';
import { TokenService } from './token.service.js';
import { EmailService } from './email.service.js';
import { AUTH_CONFIG } from './auth.constants.js';
import { logger } from '../shared/logger.js';

interface RegisterInput {
  userName: string;
  realName: string;
  email: string;
  password: string;
  type?: UserType;
}

interface LoginInput {
  emailOrUsername: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  data?: {
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  };
  accessToken?: string;
}

export const AuthService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const { userName, realName, email, password, type } = input;

    const validationError = validateRequired({ userName, email, password }, ['userName', 'email', 'password']);
    if (validationError) {
      return { success: false, message: validationError };
    }

    if (!isValidEmail(email)) {
      return { success: false, message: 'El formato del email es inválido' };
    }

    if (!userName || userName.length < 3) {
      return { success: false, message: 'userName debe tener al menos 3 caracteres' };
    }

    if (!password || password.length < 8) {
      return { success: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }

    const em = orm.em;

    const existingUser = await em.findOne(User, {
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      return { success: false, message: 'El email o nombre de usuario ya está registrado' };
    }

    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.BCRYPT_ROUNDS);

    const user = em.create(User, {
      userName,
      realName,
      email,
      password: hashedPassword,
      type: type || UserType.COMMON,
    });

    await em.flush();

    logger.info('User registered', { userId: user.id, email: user.email });

    const accessToken = TokenService.generateAccessToken(user);
    const refreshToken = TokenService.generateRefreshToken(user);

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: userWithoutPassword as Omit<User, 'password'>,
        accessToken,
        refreshToken,
      },
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const { emailOrUsername, password } = input;

    const validationError = validateRequired({ emailOrUsername, password }, ['emailOrUsername', 'password']);
    if (validationError) {
      return { success: false, message: validationError };
    }

    const em = orm.em;

    const user = await em.findOne(User, {
      $or: [{ email: emailOrUsername }, { userName: emailOrUsername }],
    });

    if (!user) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const accessToken = TokenService.generateAccessToken(user);
    const refreshToken = TokenService.generateRefreshToken(user);

    logger.info('User logged in', { userId: user.id });

    const { password: _, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'Login exitoso',
      data: {
        user: userWithoutPassword as Omit<User, 'password'>,
        accessToken,
        refreshToken,
      },
    };
  },

  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
    if (!refreshToken) {
      return { success: false, message: 'Refresh token no proporcionado' };
    }

    TokenService.removeRefreshToken(refreshToken);
    logger.info('User logged out', { refreshToken: refreshToken.substring(0, 10) + '...' });

    return { success: true, message: 'Sesión cerrada exitosamente' };
  },

  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    if (!refreshToken) {
      return { success: false, message: 'Refresh token no proporcionado' };
    }

    if (!TokenService.hasRefreshToken(refreshToken)) {
      return { success: false, message: 'Refresh token inválido o revocado' };
    }

    const decoded = TokenService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      TokenService.removeRefreshToken(refreshToken);
      return { success: false, message: 'Refresh token inválido o expirado' };
    }

    const em = orm.em;
    const user = await em.findOne(User, { id: decoded.id });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const accessToken = TokenService.generateAccessToken(user);

    logger.info('Token refreshed', { userId: user.id });

    return {
      success: true,
      message: 'Token renovado exitosamente',
      accessToken,
    };
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) {
      return { success: false, message: 'Email requerido' };
    }

    TokenService.cleanupExpiredTokens();

    const em = orm.em;
    const user = await em.findOne(User, { email });

    if (!user || !user.id) {
      return { success: true, message: 'Si el email existe, recibirás las instrucciones para restablecer tu contraseña' };
    }

    const token = TokenService.createResetToken(user.id);

    const emailSent = await EmailService.sendPasswordResetEmail(user.email, user.userName, token);

    if (!emailSent) {
      logger.error('Failed to send password reset email', { email: user.email });
    }

    return { success: true, message: 'Si el email existe, recibirás las instrucciones para restablecer tu contraseña' };
  },

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    if (!token || !newPassword) {
      return { success: false, message: 'Token y nueva contraseña son requeridos' };
    }

    TokenService.cleanupExpiredTokens();

    const validation = TokenService.validateResetToken(token);

    if (!validation.valid || !validation.userId) {
      return { success: false, message: validation.error || 'Token inválido' };
    }

    const em = orm.em;
    const user = await em.findOne(User, { id: validation.userId });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    user.password = await bcrypt.hash(newPassword, AUTH_CONFIG.BCRYPT_ROUNDS);
    await em.flush();

    TokenService.removeResetToken(token);

    logger.info('Password reset successfully', { userId: user.id });

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  },
};