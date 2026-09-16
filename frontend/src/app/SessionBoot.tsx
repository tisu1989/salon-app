import { useEffect, type ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { useRestoreSessionMutation } from "../features/auth/auth.api";
import { accessTokenRefreshed, restoreFailed } from "../features/auth/auth.slice";

/**
 * Runs once on app load. If a refresh token survived from a previous visit, redeems it
 * for a fresh access token before rendering any route - otherwise a protected screen would
 * flash open, immediately 401, then bounce to /login. Renders nothing of its own; it just
 * gates `children` behind `isRestoring`.
 */
export function SessionBoot({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const isRestoring = useAppSelector((s) => s.auth.isRestoring);
  const [restoreSession] = useRestoreSessionMutation();

  useEffect(() => {
    if (!refreshToken) return;
    restoreSession({ refreshToken })
      .unwrap()
      .then(({ accessToken }) => dispatch(accessTokenRefreshed({ accessToken })))
      .catch(() => dispatch(restoreFailed()));
    // Only ever run this once, against whatever refresh token was in storage at boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isRestoring) {
    return <div className="session-boot-loading">Loading your session…</div>;
  }
  return <>{children}</>;
}
