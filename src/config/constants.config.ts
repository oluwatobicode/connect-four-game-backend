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
  NOT_FOUND: "Resource not found",
  VALIDATION_ERROR: "Validation error",
  SERVER_ERROR: "Internal server error",
  DUPLICATE_ENTRY: "Resource already exists",
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
};

export const API_VERSION = "v1";
