import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
  const sortColumn = searchParams.get("sortColumn") || "createdAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const allowedSortColumns = ["date", "user", "model", "serial", "issue", "status", "createdAt", "updatedAt"];
  const safeSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : "createdAt";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { user: { contains: search } },
      { model: { contains: search } },
      { serial: { contains: search } },
      { issue: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const orderBy = { [safeSortColumn]: sortDirection };

  const [repairs, total] = await Promise.all([
    prisma.repair.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.repair.count({ where }),
  ]);

  return NextResponse.json({ repairs, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const repair = await prisma.repair.create({
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
  return NextResponse.json(repair, { status: 201 });
}
