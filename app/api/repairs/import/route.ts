import { NextRequest, NextResponse } from "next/server";
import { addRow, isConfigured } from "@/lib/sheets";

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header and at least one data row" }, { status: 400 });
    }

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; }
        else current += char;
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
    const expectedHeaders = ["date", "user", "model", "serialnumber", "issue", "status", "notes"];
    const headerMap = expectedHeaders.map((eh) => headers.indexOf(eh));
    if (headerMap.some((i) => i === -1)) {
      return NextResponse.json({ error: "CSV must have columns: Date, User, Model, Serial Number, Issue, Status, Notes" }, { status: 400 });
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 7) continue;
      const getCol = (idx: number) => (cols[headerMap[idx]] || "").trim();
      if (!getCol(0)) continue;
      await addRow({
        date: getCol(0),
        user: getCol(1) || "Not Assigned",
        model: getCol(2),
        serial: getCol(3),
        issue: getCol(4),
        status: getCol(5) || "Fixed",
        notes: getCol(6),
      });
      imported++;
    }

    return NextResponse.json({ success: true, imported });
  } catch {
    return NextResponse.json({ error: "Failed to import CSV. Check file format." }, { status: 500 });
  }
}
