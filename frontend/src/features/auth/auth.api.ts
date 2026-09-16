import { baseApi } from "../../app/base-api";
import type { AuthenticatedStaff, AuthTokens, LoginRequest, LoginResponse } from "./auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    /** Redeems a stored refresh token for a fresh access token on app boot. */
    restoreSession: build.mutation<AuthTokens, { refreshToken: string }>({
      query: (body) => ({ url: "/auth/refresh", method: "POST", body }),
    }),
    /** The logged-in staff's own profile - fetched after a session restore so the
     *  displayed name/role always reflects the account, not a stale local cache. */
    getMe: build.query<AuthenticatedStaff, void>({
      query: () => "/auth/me",
      transformResponse: (res: { staff: AuthenticatedStaff }) => res.staff,
    }),
    changePassword: build.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: "/auth/change-password", method: "PATCH", body }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRestoreSessionMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;
