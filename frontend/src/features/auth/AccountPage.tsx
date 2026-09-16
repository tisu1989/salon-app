import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useChangePasswordMutation, useLogoutMutation } from "./auth.api";
import { loggedOut } from "./auth.slice";
import styles from "./AccountPage.module.css";

export function AccountPage() {
  const staff = useAppSelector((s) => s.auth.staff);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changePassword, { isLoading: changing, error: changeError }] =
    useChangePasswordMutation();
  const [message, setMessage] = useState<string | null>(null);

  const [logout] = useLogoutMutation();

  const handleChangePassword = async () => {
    setMessage(null);
    if (newPassword.length < 8) return;
    await changePassword({ currentPassword, newPassword }).unwrap();
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password changed.");
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // Already logging out client-side regardless - a failed logout call shouldn't trap the user in the app.
    }
    dispatch(loggedOut());
    navigate("/login", { replace: true });
  };

  if (!staff) return null;

  return (
    <div className={styles.page}>
      <h1>My profile</h1>

      <section className={styles.section} style={{ marginTop: 20 }}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <p className={styles.meta}>{staff.name}</p>
        <p className={styles.meta}>{staff.role === "ADMIN" ? "Admin" : "Staff"}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change password</h2>
        <div className={styles.field}>
          <label htmlFor="account-current-password">Current password</label>
          <input
            id="account-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="account-new-password">New password</label>
          <input
            id="account-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
          />
        </div>
        {changeError && (
          <p className={styles.error}>Current password is incorrect.</p>
        )}
        {message && <p className={styles.success}>{message}</p>}
        <button
          type="button"
          className={styles.button}
          disabled={changing || !currentPassword || newPassword.length < 8}
          onClick={handleChangePassword}
        >
          {changing ? "Saving…" : "Change password"}
        </button>
      </section>

      <section className={styles.section}>
        <button type="button" className={styles.dangerButton} onClick={handleLogout}>
          Log out
        </button>
      </section>
    </div>
  );
}
