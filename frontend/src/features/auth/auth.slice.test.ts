import { describe, expect, it } from "vitest";
import {
  accessTokenRefreshed,
  authReducer,
  loggedOut,
  profileLoaded,
  restoreFailed,
  sessionEstablished,
} from "./auth.slice";

const staff = { id: 1, name: "Priya", role: "ADMIN" as const };

// A known starting point, so each test controls exactly what the reducer sees.
const signedOut = { staff: null, accessToken: null, refreshToken: null, isRestoring: false };
const signedIn = { staff, accessToken: "access-1", refreshToken: "refresh-1", isRestoring: false };

describe("auth slice", () => {
  it("logging in stores the session and saves ONLY the refresh token to localStorage", () => {
    const state = authReducer(
      signedOut,
      sessionEstablished({ staff, accessToken: "access-1", refreshToken: "refresh-1" }),
    );

    expect(state).toMatchObject({ staff, accessToken: "access-1", refreshToken: "refresh-1" });
    expect(localStorage.getItem("salon.refreshToken")).toBe("refresh-1");
    // The access token stays in memory: anything in localStorage is readable by injected scripts.
    expect(JSON.stringify({ ...localStorage })).not.toContain("access-1");
  });

  it("a silent token refresh swaps the access token without touching who is logged in", () => {
    const state = authReducer(signedIn, accessTokenRefreshed({ accessToken: "access-2" }));

    expect(state.accessToken).toBe("access-2");
    expect(state.staff).toEqual(staff);
    expect(state.refreshToken).toBe("refresh-1");
  });

  it("finishes restoring only once the profile has loaded", () => {
    const restoring = { ...signedOut, refreshToken: "refresh-1", isRestoring: true };

    const afterRefresh = authReducer(restoring, accessTokenRefreshed({ accessToken: "a" }));
    expect(afterRefresh.isRestoring).toBe(true); // still waiting for /auth/me

    const afterProfile = authReducer(afterRefresh, profileLoaded({ staff }));
    expect(afterProfile.isRestoring).toBe(false);
    expect(afterProfile.staff).toEqual(staff);
  });

  it.each([
    ["logging out", loggedOut()],
    ["a failed session restore", restoreFailed()],
  ])("%s wipes the session and the saved refresh token", (_name, action) => {
    localStorage.setItem("salon.refreshToken", "refresh-1");

    const state = authReducer(signedIn, action);

    expect(state).toEqual(signedOut);
    expect(localStorage.getItem("salon.refreshToken")).toBeNull();
  });
});
