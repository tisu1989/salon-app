import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useGetAppointmentQuery,
  useConfirmAppointmentMutation,
  useCancelAppointmentMutation,
  useCompleteAppointmentMutation,
  useNoShowAppointmentMutation,
  useRescheduleAppointmentMutation,
} from "./appointment.api";
import { useGetCustomerQuery } from "../customers/customer.api";
import { useListServicesQuery } from "../services/service.api";
import { useListStaffQuery } from "../staff/staff.api";
import { StatusPill } from "../../components/StatusPill";
import { TimeStep } from "./TimeStep";
import { REACHABLE_ACTIONS, type AvailabilitySlot } from "./appointment.types";
import { formatTime, toDateInputValue } from "../../lib/date";
import styles from "./AppointmentDetailPage.module.css";

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);

  const { data: appointment, isLoading, isError } = useGetAppointmentQuery(appointmentId);
  const { data: customer } = useGetCustomerQuery(appointment?.customerId ?? 0, {
    skip: !appointment,
  });
  const { data: services } = useListServicesQuery();
  const { data: staff } = useListStaffQuery();

  const [confirm, { isLoading: confirming }] = useConfirmAppointmentMutation();
  const [cancel, { isLoading: cancelling }] = useCancelAppointmentMutation();
  const [complete, { isLoading: completing }] = useCompleteAppointmentMutation();
  const [noShow, { isLoading: markingNoShow }] = useNoShowAppointmentMutation();
  const [reschedule, { isLoading: rescheduling, error: rescheduleError }] =
    useRescheduleAppointmentMutation();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(() => toDateInputValue(new Date()));
  const [newSlot, setNewSlot] = useState<AvailabilitySlot | null>(null);

  const busy = confirming || cancelling || completing || markingNoShow;

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError("That didn't go through. Try again.");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newSlot || !appointment) return;
    try {
      await reschedule({
        id: appointment.id,
        startTime: newSlot.start,
        endTime: newSlot.end,
      }).unwrap();
      setShowReschedule(false);
      setNewSlot(null);
    } catch {
      // rescheduleError from the mutation hook already drives the on-screen message below.
    }
  };

  if (isLoading) return <p className={styles.empty}>Loading…</p>;
  if (isError || !appointment) {
    return <p className={styles.empty}>That appointment wasn't found.</p>;
  }

  const service = services?.find((s) => s.id === appointment.serviceId);
  const staffMember = staff?.find((s) => s.id === appointment.staffId);
  // Same set of statuses REACHABLE_ACTIONS allows any action for (BOOKED/CONFIRMED) - a
  // cancelled/completed/no-show appointment has nothing left to move, either.
  const actions = REACHABLE_ACTIONS[appointment.status];
  const canReschedule = actions.length > 0;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Today's Board
      </Link>

      <div className={styles.header}>
        <h1>Appointment #{appointment.id}</h1>
        <StatusPill status={appointment.status} />
      </div>
      <p className={styles.subtitle}>
        {new Date(appointment.startTime).toLocaleDateString()} · {formatTime(appointment.startTime)}
        –{formatTime(appointment.endTime)}
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Customer</span>
          <span>
            {customer ? (
              <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
            ) : (
              `Customer #${appointment.customerId}`
            )}
            {customer && ` · ${customer.phone}`}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Service</span>
          <span>
            {service
              ? `${service.name} (${service.durationMinutes} min, ₹${service.price})`
              : `Service #${appointment.serviceId}`}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Staff</span>
          <span>{staffMember?.name ?? `Staff #${appointment.staffId}`}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Booked via</span>
          <span>{appointment.source === "WHATSAPP" ? "WhatsApp" : "Front desk"}</span>
        </div>
      </section>

      {actions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Actions</h2>
          <div className={styles.buttonRow}>
            {actions.includes("confirm") && (
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() => runAction(() => confirm(appointment.id).unwrap())}
              >
                Confirm
              </button>
            )}
            {actions.includes("complete") && (
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() => runAction(() => complete(appointment.id).unwrap())}
              >
                Mark completed
              </button>
            )}
            {actions.includes("no-show") && (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={busy}
                onClick={() => runAction(() => noShow(appointment.id).unwrap())}
              >
                No-show
              </button>
            )}
            {actions.includes("cancel") && (
              <button
                type="button"
                className={styles.dangerButton}
                disabled={busy}
                onClick={() => runAction(() => cancel(appointment.id).unwrap())}
              >
                Cancel
              </button>
            )}
          </div>
          {actionError && <p className={styles.error}>{actionError}</p>}
        </section>
      )}

      {canReschedule && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reschedule</h2>
          {!showReschedule ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setShowReschedule(true)}
            >
              Pick a new time
            </button>
          ) : (
            <>
              <TimeStep
                staffId={appointment.staffId}
                serviceId={appointment.serviceId}
                date={newDate}
                selectedSlot={newSlot}
                onDateChange={(date) => {
                  setNewDate(date);
                  setNewSlot(null);
                }}
                onSlotSelect={setNewSlot}
                excludeAppointmentId={appointment.id}
              />
              {rescheduleError && (
                <p className={styles.error}>
                  Couldn't move it there. It may have just been taken - pick another slot.
                </p>
              )}
              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.button}
                  disabled={!newSlot || rescheduling}
                  onClick={handleConfirmReschedule}
                >
                  {rescheduling ? "Moving…" : "Confirm new time"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setShowReschedule(false);
                    setNewSlot(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
