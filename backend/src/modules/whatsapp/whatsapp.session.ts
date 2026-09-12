import type { Redis } from "ioredis";

/**
 * Where the conversation currently is. Each customer works through these in
 * order; "cancel"/"restart" (handled by the caller) drops back to IDLE at any point.
 */
export type ConversationStep =
  "AWAITING_SERVICE" | "AWAITING_STAFF" | "AWAITING_DATE" | "AWAITING_SLOT";

export interface SlotOption {
  start: string; // ISO string - Redis only stores JSON-serializable data
  end: string;
}

export interface ConversationState {
  step: ConversationStep;
  customerId: number;
  serviceId?: number;
  staffId?: number;
  /** The exact options last presented to the customer, so a numeric reply can be resolved unambiguously. */
  presentedServiceIds?: number[];
  presentedStaffIds?: number[];
  presentedSlots?: SlotOption[];
}

const SESSION_TTL_SECONDS = 15 * 60; // conversation expires after 15 minutes of inactivity

function sessionKey(phone: string): string {
  return `whatsapp:session:${phone}`;
}

export class WhatsappSessionStore {
  constructor(private readonly redis: Redis) {}

  async get(phone: string): Promise<ConversationState | null> {
    const raw = await this.redis.get(sessionKey(phone));
    return raw ? (JSON.parse(raw) as ConversationState) : null;
  }

  async set(phone: string, state: ConversationState): Promise<void> {
    await this.redis.set(sessionKey(phone), JSON.stringify(state), "EX", SESSION_TTL_SECONDS);
  }

  async clear(phone: string): Promise<void> {
    await this.redis.del(sessionKey(phone));
  }
}
