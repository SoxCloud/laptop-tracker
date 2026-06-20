import { NextRequest, NextResponse } from "next/server";
import {
  getAllRows,
  addRow,
  getStorageMode,
  getConfigError,
  type RepairRow,
} from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "25"))
  );
  const sortColumn = searchParams.get("sortColumn") || "date";
  const sortDirection =
    searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const storage = getStorageMode();
  const configError = getConfigError();

  if (storage === "sheets" && configError) {
    return NextResponse.json(
      {
        repairs: [],
        total: 0,
        page,
        pageSize,
        storage,
        error: `Sheets config error: ${configError}`,
      },
      { status: 200 }
    );
  }

  try {
    let rows = await getAllRows();

    if (status) {
      rows = rows.filter((r) => r.status === status);
    }

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

    const sortField = sortColumn as keyof RepairRow;
    rows.sort((a, b) => {
      const aVal = String(a[sortField] ?? "");
      const bVal = String(b[sortField] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const repairs = rows.slice(start, start + pageSize);

    return NextResponse.json({ repairs, total, page, pageSize, storage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        repairs: [],
        total: 0,
        page,
        pageSize,
        storage,
        error: msg.includes("Google Sheets")
          ? `Google Sheets error: ${msg}`
          : `Database error: ${msg}`,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
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
