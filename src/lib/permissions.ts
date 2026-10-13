import { prisma } from "./db";
import type { SessionUser } from "./auth";

/** Roll numbers allowed to upload timetable (Ram + Ananya) */
export const UPLOAD_ROLL_NUMBERS = new Set(["DM136", "DM149"]);

/** Ram + Kabir — add, edit, or remove individual classes on the timetable */
export const TIMETABLE_MANAGE_ROLL_NUMBERS = new Set(["DM136", "DM127"]);

/** Ram-only admin tools (email tests, etc.) */
export const RAM_ROLL = "DM136";

export const KABIR_ROLL = "DM127";

/** CR-only cohort attendance board */
export const CR_ROLL = "DM149";

export function isCr(rollNumber: string | null | undefined): boolean {
  if (!rollNumber) return false;
  return rollNumber.toUpperCase() === CR_ROLL;
}

export function canAccessCrBoard(rollNumber: string | null | undefined): boolean {
  return isCr(rollNumber);
}

export function isRamAdmin(rollNumber: string | null | undefined): boolean {
  if (!rollNumber) return false;
  return rollNumber.toUpperCase() === RAM_ROLL;
}

export function canUpload(rollNumber: string | null | undefined): boolean {
  if (!rollNumber) return false;
  return UPLOAD_ROLL_NUMBERS.has(rollNumber.toUpperCase());
}

export function canManageTimetable(rollNumber: string | null | undefined): boolean {
  if (!rollNumber) return false;
  return TIMETABLE_MANAGE_ROLL_NUMBERS.has(rollNumber.toUpperCase());
}

export async function sessionCanUpload(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { rollNumber: true },
  });
  return canUpload(user?.rollNumber);
}

export async function sessionCanManageTimetable(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { rollNumber: true },
  });
  return canManageTimetable(user?.rollNumber);
}

export async function sessionIsRamAdmin(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { rollNumber: true },
  });
  return isRamAdmin(user?.rollNumber);
}

export async function sessionCanAccessCrBoard(session: SessionUser | null): Promise<boolean> {
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { rollNumber: true },
  });
  return canAccessCrBoard(user?.rollNumber);
}
