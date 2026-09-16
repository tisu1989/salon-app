import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useGetCustomerQuery } from "./customer.api";
import { useListAppointmentsQuery } from "../appointments/appointment.api";
import { AppointmentRow } from "../appointments/AppointmentRow";
import { useListServicesQuery } from "../services/service.api";
import { useListStaffQuery } from "../staff/staff.api";
import styles from "./CustomerProfilePage.module.css";

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);

  const { data: customer, isLoading: loadingCustomer } = useGetCustomerQuery(customerId);
  const { data: appointments, isLoading: loadingHistory } = useListAppointmentsQuery({
    customerId,
  });
  const { data: services } = useListServicesQuery();
  const { data: staff } = useListStaffQuery();

  const serviceNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const service of services ?? []) map.set(service.id, service.name);
    return map;
  }, [services]);

  const staffNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const member of staff ?? []) map.set(member.id, member.name);
    return map;
  }, [staff]);

  if (loadingCustomer) return <p className={styles.empty}>Loading…</p>;
  if (!customer) return <p className={styles.empty}>That customer wasn't found.</p>;

  return (
    <div className={styles.page}>
      <Link to="/customers" className={styles.back}>
        ← Customers
      </Link>
      <div className={styles.header}>
        <h1>{customer.name}</h1>
      </div>
      <p className={styles.subtitle}>{customer.phone}</p>

      <h2 className={styles.sectionTitle}>Booking history</h2>
      {loadingHistory && <p className={styles.empty}>Loading…</p>}
      {!loadingHistory && appointments?.length === 0 && (
        <p className={styles.empty}>No appointments yet.</p>
      )}
      <div className={styles.list}>
        {appointments?.map((appointment) => (
          <AppointmentRow
            key={appointment.id}
            appointment={appointment}
            serviceName={
              serviceNameById.get(appointment.serviceId) ?? `Service #${appointment.serviceId}`
            }
            staffName={staffNameById.get(appointment.staffId) ?? `Staff #${appointment.staffId}`}
            showDate
            hideCustomerName
          />
        ))}
      </div>
    </div>
  );
}
