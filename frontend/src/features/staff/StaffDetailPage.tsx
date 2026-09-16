import { Link, useParams } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useListStaffQuery } from "./staff.api";
import { ProfileSection } from "./ProfileSection";
import { WorkingHoursSection } from "./WorkingHoursSection";
import { TimeOffSection } from "./TimeOffSection";
import styles from "./StaffDetailPage.module.css";

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const staffId = Number(id);
  const isAdmin = useAppSelector((s) => s.auth.staff?.role === "ADMIN");

  // No GET /staff/:id on the backend - the directory list is the only source, so
  // reuse its cached data instead of adding a call the API can't actually serve.
  const { data: staffList, isLoading } = useListStaffQuery();
  const staff = staffList?.find((s) => s.id === staffId);

  if (isLoading) return <p className={styles.empty}>Loading…</p>;
  if (!staff) return <p className={styles.empty}>That staff member wasn't found.</p>;

  return (
    <div className={styles.page}>
      <Link to="/staff" className={styles.back}>
        ← Staff
      </Link>
      <div className={styles.header}>
        <h1>{staff.name}</h1>
      </div>
      <p className={styles.subtitle}>{staff.isActive ? "Active" : "Deactivated"}</p>

      <ProfileSection staff={staff} isAdmin={isAdmin ?? false} />
      <WorkingHoursSection staffId={staff.id} isAdmin={isAdmin ?? false} />
      <TimeOffSection staffId={staff.id} isAdmin={isAdmin ?? false} />
    </div>
  );
}
