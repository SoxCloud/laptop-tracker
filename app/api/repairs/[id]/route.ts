import { NextRequest, NextResponse } from "next/server";
import { updateRow, deleteRow } from "@/lib/data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const repair = await updateRow(id, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteRow(id);
  return NextResponse.json({ success: true });
}
