import { beforeEach, describe, expect, it } from "vitest";
import {
  enqueueBooking,
  getQueue,
  isNetworkError,
  markConflict,
  removeFromQueue,
} from "./bookingQueue";

const sampleInput = {
  request: {
    customerId: 1,
    staffId: 2,
    serviceId: 3,
    startTime: "2026-10-11T09:00:00.000Z",
    endTime: "2026-10-11T09:30:00.000Z",
  },
  customerName: "Ravi Kumar",
  serviceName: "Haircut",
  staffName: "Asha Stylist",
};

beforeEach(() => {
  localStorage.clear();
});

describe("bookingQueue", () => {
  it("starts empty", () => {
    expect(getQueue()).toEqual([]);
  });

  it("enqueuing adds an entry with a generated id, timestamp and no conflict", () => {
    const entry = enqueueBooking(sampleInput);

    expect(entry.localId).toBeTruthy();
    expect(entry.queuedAt).toBeTruthy();
    expect(entry.conflict).toBe(false);
    expect(getQueue()).toEqual([entry]);
  });

  it("enqueuing twice keeps both, in order", () => {
    const first = enqueueBooking(sampleInput);
    const second = enqueueBooking({ ...sampleInput, customerName: "Priya Admin" });

    expect(getQueue().map((b) => b.localId)).toEqual([first.localId, second.localId]);
  });

  it("removeFromQueue takes out only the matching entry", () => {
    const first = enqueueBooking(sampleInput);
    const second = enqueueBooking(sampleInput);

    removeFromQueue(first.localId);

    expect(getQueue()).toEqual([second]);
  });

  it("markConflict flags one entry without touching the others", () => {
    const first = enqueueBooking(sampleInput);
    const second = enqueueBooking(sampleInput);

    markConflict(first.localId);

    const queue = getQueue();
    expect(queue.find((b) => b.localId === first.localId)?.conflict).toBe(true);
    expect(queue.find((b) => b.localId === second.localId)?.conflict).toBe(false);
  });

  it("survives a corrupted localStorage value instead of throwing", () => {
    localStorage.setItem("salon.bookingQueue", "{not valid json");
    expect(getQueue()).toEqual([]);
  });
});

describe("isNetworkError", () => {
  it("is true for a fetch failure (offline/unreachable)", () => {
    expect(isNetworkError({ status: "FETCH_ERROR", error: "Failed to fetch" })).toBe(true);
  });

  it("is true for a timeout", () => {
    expect(isNetworkError({ status: "TIMEOUT_ERROR" })).toBe(true);
  });

  it("is false for a real HTTP error response (e.g. a slot conflict)", () => {
    expect(isNetworkError({ status: 409, data: { code: "SLOT_UNAVAILABLE" } })).toBe(false);
  });

  it("is false for non-error-shaped values", () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError("some string")).toBe(false);
  });
});
