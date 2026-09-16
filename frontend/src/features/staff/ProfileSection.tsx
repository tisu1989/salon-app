import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useUpdateStaffMutation,
  useResetStaffPasswordMutation,
  useDeactivateStaffMutation,
} from "./staff.api";
import type { StaffMember } from "./staff.types";
import styles from "./StaffDetailPage.module.css";

export function ProfileSection({ staff, isAdmin }: { staff: StaffMember; isAdmin: boolean }) {
  const navigate = useNavigate();
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [updateStaff, { isLoading: saving, error: updateError }] = useUpdateStaffMutation();
  const [resetPassword, { isLoading: resetting, error: resetError }] =
    useResetStaffPasswordMutation();
  const [deactivateStaff, { isLoading: deactivating }] = useDeactivateStaffMutation();

  const dirty = name.trim() !== staff.name || email.trim() !== (staff.email ?? "");

  const handleSave = async () => {
    setMessage(null);
    await updateStaff({
      id: staff.id,
      ...(name.trim() !== staff.name && { name: name.trim() }),
      ...(email.trim() !== (staff.email ?? "") && { email: email.trim() || null }),
    }).unwrap();
    setMessage("Saved.");
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) return;
    await resetPassword({ id: staff.id, password: newPassword }).unwrap();
    setNewPassword("");
    setMessage("Password reset. They've been signed out everywhere.");
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${staff.name}? They'll be signed out and can't log back in.`)) {
      return;
    }
    await deactivateStaff(staff.id).unwrap();
    navigate("/staff", { replace: true });
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile</h2>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isAdmin}
          />
        </div>
      </div>
      <p className={styles.empty}>
        Phone {staff.phone} · {staff.role === "ADMIN" ? "Admin" : "Staff"} — change these by
        creating a new account; there's no route to edit them yet.
      </p>

      {updateError && <p className={styles.error}>Couldn't save. Try again.</p>}
      {message && <p className={styles.success}>{message}</p>}

      {isAdmin && (
        <div className={styles.buttonRow}>
          <button type="button" className={styles.button} disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            disabled={deactivating}
            onClick={handleDeactivate}
          >
            Deactivate
          </button>
        </div>
      )}

      {isAdmin && (
        <>
          <div className={styles.field} style={{ maxWidth: 280 }}>
            <label htmlFor="profile-new-password">Reset password</label>
            <input
              id="profile-new-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>
          {resetError && <p className={styles.error}>Couldn't reset the password.</p>}
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={newPassword.length < 8 || resetting}
            onClick={handleResetPassword}
          >
            {resetting ? "Resetting…" : "Set new password"}
          </button>
        </>
      )}
    </section>
  );
}
