import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerStep } from "./CustomerStep";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ConfirmStep } from "./ConfirmStep";
import { WIZARD_STEPS, STEP_LABELS, furthestReachableIndex, type BookingDraft } from "./booking-draft";
import { useBookAppointmentMutation } from "./appointment.api";
import { useListServicesQuery } from "../services/service.api";
import { useListStaffQuery } from "../staff/staff.api";
import { toDateInputValue } from "../../lib/date";
import styles from "./NewBookingWizard.module.css";

const emptyDraft: BookingDraft = {
  customer: null,
  serviceId: null,
  staffId: null,
  date: toDateInputValue(new Date()),
  slot: null,
};

export function NewBookingWizard() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [bookAppointment, { isLoading: booking, error: bookError }] = useBookAppointmentMutation();

  const { data: services } = useListServicesQuery();
  const { data: staff } = useListStaffQuery();

  const reachable = furthestReachableIndex(draft);
  const step = WIZARD_STEPS[stepIndex];

  const canAdvance =
    (step === "customer" && draft.customer !== null) ||
    (step === "service" && draft.serviceId !== null) ||
    (step === "staff" && draft.staffId !== null) ||
    (step === "time" && draft.slot !== null) ||
    step === "confirm";

  const goTo = (index: number) => {
    if (index <= reachable) setStepIndex(index);
  };

  const handlePrimaryAction = async () => {
    if (step !== "confirm") {
      setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
      return;
    }
    if (!draft.customer || !draft.serviceId || !draft.staffId || !draft.slot) return;
    try {
      const appointment = await bookAppointment({
        customerId: draft.customer.id,
        staffId: draft.staffId,
        serviceId: draft.serviceId,
        startTime: draft.slot.start,
        endTime: draft.slot.end,
      }).unwrap();
      navigate(`/?date=${toDateInputValue(new Date(appointment.startTime))}`, { replace: true });
    } catch {
      // Nothing to do here: the mutation state (bookError) already drives the message on screen.
      // Catching stops the rejection escaping the click handler as an uncaught error.
    }
  };

  return (
    <div className={styles.page}>
      <h1>New booking</h1>

      <div className={styles.stepper}>
        {WIZARD_STEPS.map((s, index) => (
          <button
            key={s}
            type="button"
            className={`${styles.step} ${index === stepIndex ? styles.active : ""} ${
              index < stepIndex ? styles.done : ""
            } ${index <= reachable ? styles.reachable : ""}`}
            onClick={() => goTo(index)}
            disabled={index > reachable}
          >
            <span className={styles.stepDot}>{index + 1}</span>
            <span>{STEP_LABELS[s]}</span>
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        {step === "customer" && (
          <CustomerStep
            onSelect={(customer) => {
              setDraft((d) => ({ ...d, customer }));
              setStepIndex(1);
            }}
          />
        )}

        {step === "service" && (
          <ServiceStep
            selectedId={draft.serviceId}
            onSelect={(serviceId) => {
              setDraft((d) => ({ ...d, serviceId, slot: null }));
              setStepIndex(2);
            }}
          />
        )}

        {step === "staff" && (
          <StaffStep
            selectedId={draft.staffId}
            onSelect={(staffId) => {
              setDraft((d) => ({ ...d, staffId, slot: null }));
              setStepIndex(3);
            }}
          />
        )}

        {step === "time" && draft.staffId && draft.serviceId && (
          <TimeStep
            staffId={draft.staffId}
            serviceId={draft.serviceId}
            date={draft.date}
            selectedSlot={draft.slot}
            onDateChange={(date) => setDraft((d) => ({ ...d, date, slot: null }))}
            onSlotSelect={(slot) => setDraft((d) => ({ ...d, slot }))}
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            draft={draft}
            service={services?.find((s) => s.id === draft.serviceId)}
            staff={staff?.find((s) => s.id === draft.staffId)}
          />
        )}

        {bookError && <p className={styles.error}>Couldn't book that slot. It may have just been taken - go back and pick another.</p>}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.button}
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
        >
          Back
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={!canAdvance || booking}
          onClick={handlePrimaryAction}
        >
          {step === "confirm" ? (booking ? "Booking…" : "Confirm booking") : "Next"}
        </button>
      </div>
    </div>
  );
}
