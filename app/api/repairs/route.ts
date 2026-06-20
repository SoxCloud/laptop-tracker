import { NextRequest, NextResponse } from "next/server";
import { getAllRows, addRow, isConfigured, type SheetRow } from "@/lib/sheets";

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({
      repairs: [],
      total: 0,
      page: 1,
      pageSize: 25,
      configured: false,
      error: "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY in .env",
    });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
  const sortColumn = searchParams.get("sortColumn") || "date";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  try {
    let rows = await getAllRows();

    if (status) rows = rows.filter((r) => r.status === status);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.user.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q) ||
          r.serial.toLowerCase().includes(q) ||
          r.issue.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }

    const sortField = sortColumn as keyof SheetRow;
    rows.sort((a, b) => {
      const aVal = String(a[sortField] ?? "");
      const bVal = String(b[sortField] ?? "");
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const repairs = rows.slice(start, start + pageSize);

    return NextResponse.json({ repairs, total, page, pageSize, configured: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      repairs: [],
      total: 0,
      page,
      pageSize,
      configured: true,
      error: msg.includes("Google Sheets API has not been used")
        ? "Google Sheets API is not enabled. Enable it at https://console.cloud.google.com/apis/api/sheets.googleapis.com"
        : msg.includes("not valid JSON")
        ? msg
        : `Sheets error: ${msg}`,
    });
  }
}

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
  }
  const body = await request.json();
  const repair = await addRow({
    date: body.date,
    user: body.user || "Not Assigned",
    model: body.model,
    serial: body.serial,
    issue: body.issue,
    status: body.status || "Fixed",
    notes: body.notes || "",
  });
  return NextResponse.json(repair, { status: 201 });
}
