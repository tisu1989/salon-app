import { useMemo, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { useListStaffQuery } from "../staff/staff.api";
import { useListServicesQuery } from "../services/service.api";
import { useListAppointmentsQuery } from "./appointment.api";
import { AppointmentRow } from "./AppointmentRow";
import { toDateInputValue } from "../../lib/date";
import styles from "./TodayBoardPage.module.css";

export function TodayBoardPage() {
  const currentStaff = useAppSelector((s) => s.auth.staff);
  const isAdmin = currentStaff?.role === "ADMIN";

  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [staffId, setStaffId] = useState<number>(currentStaff?.id ?? 0);

  const { data: staffList } = useListStaffQuery(undefined, { skip: !isAdmin });
  const { data: services } = useListServicesQuery();
  const {
    data: appointments,
    isLoading,
    isError,
  } = useListAppointmentsQuery({ staffId, date }, { skip: !staffId });

  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const service of services ?? []) map.set(service.id, service.name);
    return map;
  }, [services]);

  const sorted = useMemo(
    () =>
      [...(appointments ?? [])].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [appointments],
  );

  return (
    <div>
      <div className={styles.header}>
        <h1>Today's Board</h1>

        <label className={styles.control}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {isAdmin && (
          <label className={styles.control}>
            Staff
            <select value={staffId} onChange={(e) => setStaffId(Number(e.target.value))}>
              <option value={0} disabled>
                Choose staff…
              </option>
              {staffList?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isLoading && <p className={styles.empty}>Loading appointments…</p>}
      {isError && <p className={styles.empty}>Couldn't load appointments. Try again.</p>}
      {!isLoading && !isError && sorted.length === 0 && (
        <p className={styles.empty}>Nothing booked for this day.</p>
      )}

      <div className={styles.list}>
        {sorted.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            serviceName={serviceNameById.get(appointment.serviceId) ?? `Service #${appointment.serviceId}`}
          />
        ))}
      </div>
    </div>
  );
}
