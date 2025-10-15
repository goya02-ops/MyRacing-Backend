import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { orm } from '../shared/orm.js';
import { User } from '../user/user.entity.js';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } from '../shared/config.js';

// Almacenamiento en memoria de refresh tokens (en producción usa Redis o BD)
const refreshTokenStore = new Set<string>();

// Función auxiliar para generar tokens
function generateTokens(user: User) {
  const payload = {
    id: user.id,
    userName: user.userName,
    type: user.type
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

  // Guardar refresh token
  refreshTokenStore.add(refreshToken);

  return { accessToken, refreshToken };
}

async function register(req: Request, res: Response) {
  try {
    const em = orm.em;
    const { userName, realName, email, password, type } = req.body;

    const existingUser = await em.findOne(User, { 
      $or: [{ email }, { userName }] 
    });

    if (existingUser) {
      res.status(400).json({ 
        message: 'El email o nombre de usuario ya está registrado' 
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = em.create(User, {
      userName,
      realName,
      email,
      password: hashedPassword,
      type: type || 'Común'
    });

    await em.flush();

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente', 
      data: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function login(req: Request, res: Response) {
  try {
    const em = orm.em;
    const { emailOrUsername, password } = req.body;

    const user = await em.findOne(User, {
      $or: [
        { email: emailOrUsername },
        { userName: emailOrUsername }
      ]
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
      refreshToken
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
        type: user.type
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Token renovado exitosamente',
      accessToken: newAccessToken
    });
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(403).json({ message: 'Refresh token inválido o expirado' });
      return;
    }
    res.status(500).json({ message: error.message });
  }
}

async function logout(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token no proporcionado' });
      return;
    }

    // Remover el refresh token del store
    refreshTokenStore.delete(refreshToken);

    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export const AuthController = {
  register,
  login,
  refreshAccessToken,
  logout,
};