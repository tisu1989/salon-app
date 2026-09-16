import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthenticatedStaff } from "./auth.types";

const REFRESH_TOKEN_STORAGE_KEY = "salon.refreshToken";

interface AuthState {
  staff: AuthenticatedStaff | null;
  accessToken: string | null;
  /**
   * The refresh token is the only credential kept in localStorage - it's what lets a page
   * reload (or a closed tab) stay logged in instead of bouncing back to /login every time.
   * The access token deliberately stays in-memory only (Redux state), never localStorage.
   * The staff profile itself is never cached locally - GET /auth/me is the source of truth
   * on every reload, so a name/role change elsewhere is never stale here.
   */
  refreshToken: string | null;
  /** True until a stored refresh token has been redeemed and the profile fetched (or both have failed/there's nothing to restore). */
  isRestoring: boolean;
}

const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

const initialState: AuthState = {
  staff: null,
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
    },
    accessTokenRefreshed: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
    },
    /** The profile fetch (GET /auth/me) after a boot-time session restore completed. */
    profileLoaded: (state, action: PayloadAction<{ staff: AuthenticatedStaff }>) => {
      state.staff = action.payload.staff;
      state.isRestoring = false;
    },
    restoreFailed: (state) => {
      state.staff = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isRestoring = false;
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    },
    loggedOut: (state) => {
      state.staff = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isRestoring = false;
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    },
  },
});

export const { sessionEstablished, accessTokenRefreshed, profileLoaded, restoreFailed, loggedOut } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
