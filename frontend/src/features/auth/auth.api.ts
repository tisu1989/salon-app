import { baseApi } from "../../app/base-api";
import type { AuthTokens, LoginRequest, LoginResponse } from "./auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    /**
     * Redeems a stored refresh token for a fresh access token on app boot. Returns tokens
     * only (no staff profile) - the backend has no GET /auth/me yet, see Blueprint > Backend
     * Gaps - so the staff's name/role for this session comes from what was cached locally
     * at login, not from this response.
     */
    restoreSession: build.mutation<AuthTokens, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/refresh", method: "POST", body }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
});

export const { useLoginMutation, useRestoreSessionMutation, useLogoutMutation } = authApi;
