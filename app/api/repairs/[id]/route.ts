import { NextRequest, NextResponse } from "next/server";
import { updateRow, deleteRow, isConfigured } from "@/lib/sheets";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
  }
  const { id } = await params;
  const rowId = parseInt(id);
  if (isNaN(rowId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const repair = await updateRow(rowId, {
    date: body.date,
    user: body.user || "Not Assigned",
    model: body.model,
    serial: body.serial,
    issue: body.issue,
    status: body.status || "Fixed",
    notes: body.notes || "",
  });
  return NextResponse.json(repair);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
  }
  const { id } = await params;
  const rowId = parseInt(id);
  if (isNaN(rowId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await deleteRow(rowId);
  return NextResponse.json({ success: true });
}
