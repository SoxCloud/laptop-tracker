import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const repairs = await prisma.repair.findMany({ orderBy: { createdAt: "desc" } });

  const headers = ["Date", "User", "Model", "Serial Number", "Issue", "Status", "Notes"];
  const rows = repairs.map((r) =>
    [
      r.date,
      r.user,
      r.model,
      r.serial,
      r.issue,
      r.status,
      r.notes.replace(/"/g, '""'),
    ].map((v) => `"${v}"`).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="repairs-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
