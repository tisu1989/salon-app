import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the `authenticate` middleware after verifying the access token. */
      user?: {
        id: number;
        role: Role;
      };
      /** Raw request body bytes, captured by the express.json() verify hook - needed to check the WhatsApp webhook signature, which is computed over the exact bytes sent. */
      rawBody?: Buffer;
    }
  }
}

export {};
