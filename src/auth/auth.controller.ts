import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { orm } from '../shared/orm.js';
import { User } from '../user/user.entity.js';
import { handleControllerError } from '../shared/error.util.js';
import { isValidEmail } from '../utils/validations.js';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
  BREVO_API_KEY,
  FROM_EMAIL,
  URL_FRONTEND,
} from '../shared/config.js';

interface ResetToken {
  token: string;
  userId: number;
  expiresAt: Date;
}

const resetTokens = new Map<string, ResetToken>();

const refreshTokenStore = new Set<string>();

function cleanupExpiredTokens() {
  const now = new Date();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token);
    }
  }
}

// Función auxiliar para generar tokens
function generateTokens(user: User) {
  const payload = {
    id: user.id,
    userName: user.userName,
    type: user.type,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  // Guardar refresh token
  refreshTokenStore.add(refreshToken);

  return { accessToken, refreshToken };
}

async function register(req: Request, res: Response) {
  try {
    const em = orm.em;
    const { userName, realName, email, password, type } = req.body;

    // Validación de email
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ message: 'El formato del email es inválido' });
      return;
    }

    const existingUser = await em.findOne(User, {
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      res.status(400).json({
        message: 'El email o nombre de usuario ya está registrado',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = em.create(User, {
      userName,
      realName,
      email,
      password: hashedPassword,
      type: type || 'Común',
    });

    await em.flush();

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      data: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function login(req: Request, res: Response) {
  try {
    const em = orm.em;
    const { emailOrUsername, password } = req.body;

    const user = await em.findOne(User, {
      $or: [{ email: emailOrUsername }, { userName: emailOrUsername }],
    });

    if (!user) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login exitoso',
      data: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({ message: 'Refresh token no proporcionado' });
      return;
    }

    // Verificar que el refresh token existe en nuestro store
    if (!refreshTokenStore.has(refreshToken)) {
      res.status(403).json({ message: 'Refresh token inválido o revocado' });
      return;
    }

    // Verificar y decodificar el refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    // Buscar el usuario actualizado
    const em = orm.em;
    const user = await em.findOne(User, { id: decoded.id });

    if (!user) {
      res.status(403).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Generar nuevo access token (mantenemos el mismo refresh token)
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        userName: user.userName,
        type: user.type,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    res.status(200).json({
      message: 'Token renovado exitosamente',
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (
      (error as any).name === 'JsonWebTokenError' ||
      (error as any).name === 'TokenExpiredError'
    ) {
      res.status(403).json({ message: 'Refresh token inválido o expirado' });
      return;
    }
    handleControllerError(error, res);
  }
}

async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token no proporcionado' });
      return;
    }

    refreshTokenStore.delete(refreshToken);

    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function forgotPassword(req: Request, res: Response) {
  try {
    cleanupExpiredTokens();

    const em = orm.em;
    const { email } = req.body;

    const user = await em.findOne(User, { email });

    if (!user || !user.id) {
      res.status(200).json({
        message:
          'Si el email existe, recibirás las instrucciones para restablecer tu contraseña',
      });
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    resetTokens.set(token, { token, userId: user.id, expiresAt });

    const resetUrl = `${URL_FRONTEND}/reset-password?token=${token}`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'MyRacing',
          email: FROM_EMAIL,
        },
        to: [{ email: user.email, name: user.userName }],
        subject: 'Restablecer contraseña - MyRacing',
        htmlContent: `
          <h1>Restablecer contraseña</h1>
          <p>Hola ${user.userName},</p>
          <p>Recibiste este email porque solicitaste restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Restablecer contraseña</a>
          <p>Este enlace expira en 30 minutos.</p>
          <p>Si no solicitaste este cambio, ignora este email.</p>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Brevo:', errorData);
      throw new Error('Error al enviar email');
    }

    res.status(200).json({
      message:
        'Si el email existe, recibirás las instrucciones para restablecer tu contraseña',
    });
  } catch (error: any) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
}

async function resetPassword(req: Request, res: Response) {
  try {
    const em = orm.em;
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res
        .status(400)
        .json({ message: 'Token y nueva contraseña son requeridos' });
      return;
    }

    cleanupExpiredTokens();

    const tokenData = resetTokens.get(token);

    if (!tokenData || tokenData.expiresAt < new Date()) {
      res.status(400).json({ message: 'Token inválido o expirado' });
      return;
    }

    const user = await em.findOne(User, { id: tokenData.userId });

    if (!user) {
      res.status(400).json({ message: 'Usuario no encontrado' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await em.flush();

    resetTokens.delete(token);

    res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error: any) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ message: 'Error al restablecer la contraseña' });
  }
}

export const AuthController = {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
