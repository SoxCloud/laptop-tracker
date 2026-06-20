import { prisma } from "@/lib/prisma";

export interface RepairRow {
  id: string;
  date: string;
  user: string;
  model: string;
  serial: string;
  issue: string;
  status: string;
  notes: string;
}

function keyLooksValid(): boolean {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return !!process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  try {
    const parsed = JSON.parse(raw);
    return !!(parsed.client_email && parsed.private_key);
  } catch {
    return false;
  }
}

const googleConfigured = keyLooksValid();

export function getStorageMode(): "sheets" | "sqlite" {
  return googleConfigured ? "sheets" : "sqlite";
}

async function getAllRowsSQLite(): Promise<RepairRow[]> {
  const rows = await prisma.repair.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    user: r.user,
    model: r.model,
    serial: r.serial,
    issue: r.issue,
    status: r.status,
    notes: r.notes,
  }));
}

async function addRowSQLite(data: Omit<RepairRow, "id">): Promise<RepairRow> {
  const created = await prisma.repair.create({ data });
  return { id: created.id, ...data };
}

async function updateRowSQLite(
  id: string,
  data: Omit<RepairRow, "id">
): Promise<RepairRow> {
  await prisma.repair.update({ where: { id }, data });
  return { id, ...data };
}

async function deleteRowSQLite(id: string): Promise<void> {
  await prisma.repair.delete({ where: { id } });
}

let sheetsModule: typeof import("./sheets") | null = null;

async function getSheets() {
  if (!sheetsModule) {
    sheetsModule = await import("./sheets");
  }
  return sheetsModule;
}

async function getAllRowsSheets(): Promise<RepairRow[]> {
  const s = await getSheets();
  const rows = await s.getAllRows();
  return rows.map((r) => ({
    id: String(r.id),
    date: r.date,
    user: r.user,
    model: r.model,
    serial: r.serial,
    issue: r.issue,
    status: r.status,
    notes: r.notes,
  }));
}

async function addRowSheets(data: Omit<RepairRow, "id">): Promise<RepairRow> {
  const s = await getSheets();
  const created = await s.addRow(data);
  return { id: String(created.id), ...data };
}

async function updateRowSheets(
  id: string,
  data: Omit<RepairRow, "id">
): Promise<RepairRow> {
  const s = await getSheets();
  await s.updateRow(parseInt(id), data);
  return { id, ...data };
}

async function deleteRowSheets(id: string): Promise<void> {
  const s = await getSheets();
  await s.deleteRow(parseInt(id));
}

export const getAllRows = googleConfigured ? getAllRowsSheets : getAllRowsSQLite;
export const addRow = googleConfigured ? addRowSheets : addRowSQLite;
export const updateRow = googleConfigured ? updateRowSheets : updateRowSQLite;
export const deleteRow = googleConfigured ? deleteRowSheets : deleteRowSQLite;

export function getConfigError(): string | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw && !process.env.GOOGLE_SERVICE_ACCOUNT_FILE) return null;
  if (!raw) return null; // uses file, can't validate further here
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email) return "Missing client_email in service account key";
    if (!parsed.private_key) return "Missing private_key in service account key";
    return null;
  } catch {
    return "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Check the quotes in .env";
  }
}
