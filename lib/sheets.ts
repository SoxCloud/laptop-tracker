import { google, sheets_v4 } from "googleapis";

const SPREADSHEET_ID =
  process.env.GOOGLE_SHEET_ID ||
  "1yLaSB7-pPgSaOeNmahl4Vd8EgfW6YI29tV-I5kRuwxU";
const CONFIGURED_TAB = process.env.GOOGLE_SHEET_TAB || "";

export function isConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  );
}

export function getConfigError(): string | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw && !process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    return "GOOGLE_SERVICE_ACCOUNT_KEY not set in .env";
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.client_email) return "Missing client_email in service account key";
      if (!parsed.private_key) return "Missing private_key in service account key";
    } catch {
      return "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON";
    }
  }
  return null;
}

function getAuth() {
  const err = getConfigError();
  if (err) throw new Error(err);

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE!,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

let sheetsClient: sheets_v4.Sheets | null = null;
let cachedTabName: string | null = null;

async function getSheets() {
  if (!sheetsClient) {
    const auth = getAuth();
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

export async function getTabName(): Promise<string> {
  if (cachedTabName) return cachedTabName;
  if (CONFIGURED_TAB) {
    cachedTabName = CONFIGURED_TAB;
    return cachedTabName;
  }
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [],
    includeGridData: false,
  });
  const tab = meta.data.sheets?.[0]?.properties?.title;
  cachedTabName = tab || "Sheet1";
  return cachedTabName;
}

async function tabRange(suffix: string): Promise<string> {
  const tab = await getTabName();
  return `${tab}!${suffix}`;
}

export interface SheetRow {
  id: number;
  date: string;
  user: string;
  model: string;
  serial: string;
  issue: string;
  status: string;
  notes: string;
}

export async function getAllRows(): Promise<SheetRow[]> {
  const sheets = await getSheets();
  const range = await tabRange("A:G");
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = response.data.values || [];
  const results: SheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || row.every((c: string) => !c?.toString().trim()))
      continue;
    results.push({
      id: i + 1,
      date: (row[0] || "").toString().trim(),
      user: (row[1] || "Not Assigned").toString().trim(),
      model: (row[2] || "").toString().trim(),
      serial: (row[3] || "").toString().trim(),
      issue: (row[4] || "").toString().trim(),
      status: (row[5] || "Fixed").toString().trim(),
      notes: (row[6] || "").toString().trim(),
    });
  }

  return results;
}

export async function addRow(data: Omit<SheetRow, "id">): Promise<SheetRow> {
  const sheets = await getSheets();
  const range = await tabRange("A:G");
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [data.date, data.user, data.model, data.serial, data.issue, data.status, data.notes],
      ],
    },
  });

  const updatedRange = response.data.updates?.updatedRange || "";
  const match = updatedRange.match(/(\d+)/);
  const rowIndex = match ? parseInt(match[1]) : -1;

  return { id: rowIndex, ...data };
}

export async function updateRow(
  id: number,
  data: Omit<SheetRow, "id">
): Promise<SheetRow> {
  const sheets = await getSheets();
  const range = await tabRange(`A${id}:G${id}`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [data.date, data.user, data.model, data.serial, data.issue, data.status, data.notes],
      ],
    },
  });
  return { id, ...data };
}

export async function deleteRow(id: number): Promise<void> {
  const sheets = await getSheets();
  const range = await tabRange(`A${id}:G${id}`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
}
