import { NextRequest, NextResponse } from "next/server";
import { addRow } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url: string = body.url || "";

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch sheet. Make sure it's published to the web." },
        { status: 400 }
      );
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "Sheet appears to be empty or not published as CSV" },
        { status: 400 }
      );
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z]/g, "")
    );
    const expectedHeaders = [
      "date", "user", "model", "serialnumber", "issue", "status", "notes",
    ];

    const headerMap = expectedHeaders.map((eh) => headers.indexOf(eh));
    if (headerMap.some((i) => i === -1)) {
      return NextResponse.json(
        { error: "Sheet columns must be: Date, User, Model, Serial Number, Issue, Status, Notes" },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length < 7) continue;

      const getCol = (idx: number) => (cols[headerMap[idx]] || "").trim();
      if (!getCol(0)) { skipped++; continue; }

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

    return NextResponse.json({ success: true, imported, skipped });
  } catch {
    return NextResponse.json(
      { error: "Failed to import from sheet. Check the URL and try again." },
      { status: 500 }
    );
  }
}
