import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const repair = await prisma.repair.update({
    where: { id },
    data: {
      date: body.date,
      user: body.user || "Not Assigned",
      model: body.model,
      serial: body.serial,
      issue: body.issue,
      status: body.status || "Fixed",
      notes: body.notes || "",
    },
  });
  return NextResponse.json(repair);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.repair.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
