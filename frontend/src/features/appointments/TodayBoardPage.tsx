import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useListStaffQuery } from "../staff/staff.api";
import { useListServicesQuery } from "../services/service.api";
import { useListAppointmentsQuery } from "./appointment.api";
import { AppointmentRow } from "./AppointmentRow";
import { toDateInputValue } from "../../lib/date";
import styles from "./TodayBoardPage.module.css";

const ALL_STAFF = "ALL";

export function TodayBoardPage() {
  const currentStaff = useAppSelector((s) => s.auth.staff);
  const isAdmin = currentStaff?.role === "ADMIN";
  const [searchParams] = useSearchParams();

  const [date, setDate] = useState(() => searchParams.get("date") ?? toDateInputValue(new Date()));
  // Admins default to the salon-wide board; a staff login only ever sees their own day.
  const [staffFilter, setStaffFilter] = useState<number | typeof ALL_STAFF>(
    isAdmin ? ALL_STAFF : (currentStaff?.id ?? ALL_STAFF),
  );

  const { data: staffList } = useListStaffQuery(undefined, { skip: !isAdmin });
  const { data: services } = useListServicesQuery();
  const {
    data: appointments,
    isLoading,
    isError,
  } = useListAppointmentsQuery(
    staffFilter === ALL_STAFF ? { date } : { date, staffId: staffFilter },
  );

  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const service of services ?? []) map.set(service.id, service.name);
    return map;
  }, [services]);

  const staffNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const member of staffList ?? []) map.set(member.id, member.name);
    return map;
  }, [staffList]);

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

        <Link to="/appointments/new" className={styles.newBookingLink}>
          + New booking
        </Link>

        <label className={styles.control}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {isAdmin && (
          <label className={styles.control}>
            Staff
            <select
              value={staffFilter}
              onChange={(e) =>
                setStaffFilter(e.target.value === ALL_STAFF ? ALL_STAFF : Number(e.target.value))
              }
            >
              <option value={ALL_STAFF}>All staff</option>
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
            {...(staffFilter === ALL_STAFF && {
              staffName: staffNameById.get(appointment.staffId) ?? `Staff #${appointment.staffId}`,
            })}
          />
        ))}
      </div>
    </div>
  );
}
