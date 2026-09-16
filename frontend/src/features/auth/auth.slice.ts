import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthenticatedStaff } from "./auth.types";

const REFRESH_TOKEN_STORAGE_KEY = "salon.refreshToken";
/**
 * Non-sensitive profile fields only (id/name/role) - NOT a security boundary. Kept because
 * the backend's /auth/refresh returns tokens only, not staff details, and there is no
 * GET /auth/me endpoint yet (see Blueprint > Backend Gaps). Once that endpoint exists,
 * this can be replaced with a real fetch-on-boot instead of trusting stale localStorage.
 */
const STAFF_STORAGE_KEY = "salon.staff";

interface AuthState {
  staff: AuthenticatedStaff | null;
  accessToken: string | null;
  /**
   * The refresh token is the only credential kept in localStorage - it's what lets a page
   * reload (or a closed tab) stay logged in instead of bouncing back to /login every time.
   * The access token deliberately stays in-memory only (Redux state), never localStorage.
   */
  refreshToken: string | null;
  /** True while the app is still trying to redeem a stored refresh token on first load. */
  isRestoring: boolean;
}

function readStoredStaff(): AuthenticatedStaff | null {
  const raw = localStorage.getItem(STAFF_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedStaff;
  } catch {
    return null;
  }
}

const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

const initialState: AuthState = {
  staff: readStoredStaff(),
  accessToken: null,
  refreshToken: storedRefreshToken,
  isRestoring: storedRefreshToken !== null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionEstablished: (
      state,
      action: PayloadAction<{
        staff: AuthenticatedStaff;
        accessToken: string;
        refreshToken: string;
      }>,
    ) => {
      state.staff = action.payload.staff;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isRestoring = false;
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, action.payload.refreshToken);
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(action.payload.staff));
    },
    accessTokenRefreshed: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.isRestoring = false;
    },
    restoreFailed: (state) => {
      state.staff = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isRestoring = false;
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(STAFF_STORAGE_KEY);
    },
    loggedOut: (state) => {
      state.staff = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isRestoring = false;
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(STAFF_STORAGE_KEY);
    },
  },
});

export const { sessionEstablished, accessTokenRefreshed, restoreFailed, loggedOut } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
