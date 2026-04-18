import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} from '../shared/config.js';
import { AUTH_CONFIG, TOKEN_PAYLOAD_KEYS } from './auth.constants.js';
import { User } from '../user/user.entity.js';
import { logger } from '../shared/logger.js';

interface TokenPayload {
  [TOKEN_PAYLOAD_KEYS.ID]: number;
  [TOKEN_PAYLOAD_KEYS.USER_NAME]: string;
  [TOKEN_PAYLOAD_KEYS.TYPE]: string;
}

interface ResetToken {
  token: string;
  userId: number;
  expiresAt: Date;
}

const refreshTokenStore = new Set<string>();
const resetTokens = new Map<string, ResetToken>();

export const TokenService = {
  generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      [TOKEN_PAYLOAD_KEYS.ID]: user.id as number,
      [TOKEN_PAYLOAD_KEYS.USER_NAME]: user.userName,
      [TOKEN_PAYLOAD_KEYS.TYPE]: user.type as string,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      [TOKEN_PAYLOAD_KEYS.ID]: user.id as number,
      [TOKEN_PAYLOAD_KEYS.USER_NAME]: user.userName,
      [TOKEN_PAYLOAD_KEYS.TYPE]: user.type as string,
    };
    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
    this.addRefreshToken(token);
    return token;
  },

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  },

  addRefreshToken(token: string): void {
    refreshTokenStore.add(token);
  },

  removeRefreshToken(token: string): void {
    refreshTokenStore.delete(token);
  },

  hasRefreshToken(token: string): boolean {
    return refreshTokenStore.has(token);
  },

  createResetToken(userId: number): string {
    const token = randomBytes(AUTH_CONFIG.RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.RESET_TOKEN_EXPIRY_MS);

    resetTokens.set(token, { token, userId, expiresAt });
    logger.info('Reset token created', { userId, expiresAt });

    return token;
  },

  validateResetToken(token: string): { valid: boolean; userId?: number; error?: string } {
    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return { valid: false, error: 'Token inválido' };
    }

    if (tokenData.expiresAt < new Date()) {
      resetTokens.delete(token);
      return { valid: false, error: 'Token expirado' };
    }

    return { valid: true, userId: tokenData.userId };
  },

  removeResetToken(token: string): void {
    resetTokens.delete(token);
  },

  cleanupExpiredTokens(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, data] of resetTokens.entries()) {
      if (data.expiresAt < now) {
        resetTokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Expired reset tokens cleaned', { count: cleanedCount });
    }
  },

  getResetTokensCount(): number {
    return resetTokens.size;
  },
};