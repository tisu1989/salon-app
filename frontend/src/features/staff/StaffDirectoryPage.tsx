import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useListStaffQuery, useCreateStaffMutation } from "./staff.api";
import { StaffForm } from "./StaffForm";
import styles from "./StaffDirectoryPage.module.css";

export function StaffDirectoryPage() {
  const isAdmin = useAppSelector((s) => s.auth.staff?.role === "ADMIN");
  const { data: staff, isLoading, isError } = useListStaffQuery();
  const [creating, setCreating] = useState(false);
  const [createStaff, { isLoading: saving, error: createError }] = useCreateStaffMutation();

  const handleCreate = async (values: Parameters<typeof createStaff>[0]) => {
    await createStaff(values).unwrap();
    setCreating(false);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Staff</h1>
        {isAdmin && !creating && (
          <button type="button" className={styles.addButton} onClick={() => setCreating(true)}>
            + Add staff
          </button>
        )}
      </div>

      {creating && (
        <StaffForm
          isSaving={saving}
          error={Boolean(createError)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {isLoading && <p className={styles.empty}>Loading staff…</p>}
      {isError && <p className={styles.empty}>Couldn't load staff. Try again.</p>}
      {!isLoading && !isError && staff?.length === 0 && (
        <p className={styles.empty}>No staff on file yet.</p>
      )}

      <div className={styles.grid}>
        {staff?.map((member) => (
          <Link key={member.id} to={`/staff/${member.id}`} className={styles.card}>
            <div className={styles.cardMain}>
              <span className={styles.name}>{member.name}</span>
              <span className={styles.meta}>{member.email ?? member.phone}</span>
            </div>
            <span
              className={`${styles.rolePill} ${
                member.role === "ADMIN" ? styles.admin : styles.staff
              }`}
            >
              {member.role === "ADMIN" ? "Admin" : "Staff"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
