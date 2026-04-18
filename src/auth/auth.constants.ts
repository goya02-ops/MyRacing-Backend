export const AUTH_CONFIG = {
  BCRYPT_ROUNDS: 10,
  RESET_TOKEN_EXPIRY_MS: 30 * 60 * 1000,
  RESET_TOKEN_BYTES: 32,
} as const;

export const TOKEN_PAYLOAD_KEYS = {
  ID: 'id',
  USER_NAME: 'userName',
  TYPE: 'type',
} as const;