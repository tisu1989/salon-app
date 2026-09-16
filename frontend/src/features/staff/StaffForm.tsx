import { useState, type FormEvent } from "react";
import type { CreateStaffRequest } from "./staff.api";
import styles from "./StaffDirectoryPage.module.css";

export function StaffForm({
  isSaving,
  error,
  onSubmit,
  onCancel,
}: {
  isSaving: boolean;
  error: boolean;
  onSubmit: (values: CreateStaffRequest) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim() || password.length < 8) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      ...(email.trim() && { email: email.trim() }),
      password,
      role,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="staff-name">Name</label>
          <input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="staff-phone">Phone</label>
          <input
            id="staff-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91…"
            required
          />
        </div>
      </div>
      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="staff-email">Email (optional)</label>
          <input
            id="staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="staff-role">Role</label>
          <select
            id="staff-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "STAFF" | "ADMIN")}
          >
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="staff-password">Temporary password</label>
        <input
          id="staff-password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          placeholder="At least 8 characters"
          required
        />
      </div>

      {error && <p className={styles.error}>Couldn't create that account. Check the fields.</p>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.addButton} disabled={isSaving}>
          {isSaving ? "Creating…" : "Create account"}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
