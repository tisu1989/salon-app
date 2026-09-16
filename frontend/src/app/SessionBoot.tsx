import { useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { useRestoreSessionMutation, useLazyGetMeQuery } from "../features/auth/auth.api";
import { accessTokenRefreshed, profileLoaded, restoreFailed } from "../features/auth/auth.slice";

/**
 * Runs once on app load. If a refresh token survived from a previous visit, redeems it
 * for a fresh access token, then fetches the real profile via GET /auth/me - not a
 * localStorage cache - so a name/role change made elsewhere is never stale here. Renders
 * nothing of its own; it just gates `children` behind `isRestoring`.
 */
export function SessionBoot({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const isRestoring = useAppSelector((s) => s.auth.isRestoring);
  const [restoreSession] = useRestoreSessionMutation();
  const [getMe] = useLazyGetMeQuery();

  useEffect(() => {
    if (!refreshToken) return;
    restoreSession({ refreshToken })
      .unwrap()
      .then(async ({ accessToken }) => {
        dispatch(accessTokenRefreshed({ accessToken }));
        const staff = await getMe().unwrap();
        dispatch(profileLoaded({ staff }));
      })
      .catch(() => dispatch(restoreFailed()));
    // Only ever run this once, against whatever refresh token was in storage at boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRestoring) {
    return <div className="session-boot-loading">Loading your session…</div>;
  }
  return <>{children}</>;
}
