export const STATUS_CODE = {
  Ok: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const ERROR_MESSAGES = {
  NOT_LOGGED_IN: "You need to be logged in!",
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "You are not authorized to perform this action",
  NOT_FOUND: (field: string) => `${field} not found`,
  VALIDATION_ERROR: "Validation error",
  SERVER_ERROR: "Internal server error",
  DUPLICATE_ENTRY: (field: string) => `${field} already exists`,
  INVALID_TOKEN: "Token is invalid or has expired",
  TOKEN_EXPIRED: "Your session has expired, please log in again",
  INVALID_OTP: "Invalid or expired OTP code",
  MAX_OTP_ATTEMPTS: "Too many attempts, please request a new OTP",
  INVALID_MOVE: "Invalid move",
  NOT_YOUR_TURN: "It is not your turn",
  GAME_ALREADY_ENDED: "This game has already ended",
  COLUMN_FULL: "This column is full",
  GAME_NOT_FOUND: "Game not found",
  ALREADY_IN_GAME: "You are already in a game",
  REQUIRED_FIELD: (field: string) => `${field} is required`,
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
  SIGNUP_SUCCESS: "Signup successful",
  UPDATE_SUCCESS: "Update successful",
  DELETE_SUCCESS: "Delete successful",
  CREATE_SUCCESS: "Create successful",
  FETCH_SUCCESS: "Fetched successfully",
  OTP_VERIFIED: "OTP verified successfully",
  OTP_RESENT: "OTP resent successfully",
  PASSWORD_RESET_LINK_SENT: "Kindly check your mail",
};

export const GAME_MESSAGES = {
  CREATED_GAME: "A game room has been created!",
  GAME_ENDED: "A game room has ended",
  PLAYER_JOINED: "A player has joined the game!",
  PLAYER_LEFT: "A player has left the game",
  MOVE_MADE: "A move has been made",
  PLAYER_WON: "Player has won the game!",
  GAME_DRAW: "The game ended in a draw",
  SPECTATOR_JOINED: "A spectator is watching",
};

export const USER_MESSAGES = {
  EMAIL_VERIFIED: "Email verified successfully",
  CHECK_EMAIL: "Kindly check your email for OTP",
  EMAIL_NOT_VERIFIED: "Please verify your email first",
};

export const AUTH = {
  JWT_EXPIRY: "7d",
  REFRESH_TOKEN_EXPIRY: "30d",
  OTP_EXPIRY_MINUTES: 10,
  OTP_LENGTH: 6,
  BCRYPT_SALT_ROUNDS: 12,
  PASSWORD_MIN_LENGTH: 8,
};

export const GAME = {
  BOARD_ROWS: 6,
  BOARD_COLS: 7,
  WIN_LENGTH: 4,
  MAX_SPECTATORS: 50,
  MOVE_TIMEOUT_SECONDS: 30,
  AI_MOVE_DELAY_MS: 1500,
  MINIMAX_DEPTH: { EASY: 1, MEDIUM: 3, HARD: 6, PROFESSIONAL: 7 },
};

export const ELO = {
  DEFAULT_RATING: 1000,
  K_FACTOR: 32,
  MIN_RATING: 100,
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const RATE_LIMIT = {
  AI_GAME_COOLDOWN_MS: 60_000,
  MAX_OTP_ATTEMPTS: 5,
};

export const API_VERSION = "v1";
