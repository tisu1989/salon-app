import { PrismaClient } from "@prisma/client";

// One shared connection pool for the whole app - never instantiate PrismaClient
// anywhere else. Repositories receive this via constructor injection.
export const prisma = new PrismaClient();
