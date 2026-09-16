export type Role = "STAFF" | "ADMIN";

export interface AuthenticatedStaff {
  id: number;
  name: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export type LoginResponse = AuthTokens & { staff: AuthenticatedStaff };
