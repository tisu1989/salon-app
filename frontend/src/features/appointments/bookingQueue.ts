import type { CreateAppointmentRequest } from "./appointment.types";

const STORAGE_KEY = "salon.bookingQueue";

export interface QueuedBooking {
  localId: string;
  request: CreateAppointmentRequest;
  /** Display-only, captured at queue time - so the pending list reads clearly without
   *  needing fresh lookups while offline. */
  customerName: string;
  serviceName: string;
  staffName: string;
  queuedAt: string;
  /** Set once a sync attempt finds the slot is gone - needs a human to pick a new time,
   *  not another silent retry. */
  conflict: boolean;
}

function readQueue(): QueuedBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedBooking[]) : [];
  } catch {
    // Private browsing / storage disabled / corrupted JSON - treat as empty rather than crash.
    return [];
  }
}

function writeQueue(queue: QueuedBooking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable - the booking still went through this session in memory
    // (the caller already has the entry); it just won't survive a reload. Not fatal.
  }
}

export function getQueue(): QueuedBooking[] {
  return readQueue();
}

export function enqueueBooking(input: {
  request: CreateAppointmentRequest;
  customerName: string;
  serviceName: string;
  staffName: string;
}): QueuedBooking {
  const entry: QueuedBooking = {
    ...input,
    localId: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    conflict: false,
  };
  writeQueue([...readQueue(), entry]);
  return entry;
}

export function removeFromQueue(localId: string): void {
  writeQueue(readQueue().filter((b) => b.localId !== localId));
}

export function markConflict(localId: string): void {
  writeQueue(readQueue().map((b) => (b.localId === localId ? { ...b, conflict: true } : b)));
}

/**
 * True when an RTK Query error means "couldn't reach the server at all" (offline, DNS
 * failure, etc.) rather than "reached the server and it said no" (validation, a real
 * conflict). Only the former should be queued - the latter is a real answer the staff
 * member needs to see and act on right now.
 */
export function isNetworkError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR")
  );
}
