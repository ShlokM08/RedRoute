import { PrismaClient } from "@prisma/client";

// reuse client in dev
globalThis._prisma = globalThis._prisma || new PrismaClient();
export const prisma = globalThis._prisma;
