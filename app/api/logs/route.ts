import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const barcode = searchParams.get("barcode")?.trim();
  const provider = searchParams.get("provider")?.trim();
  const status = searchParams.get("status")?.trim();
  const date = searchParams.get("date")?.trim();
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "50");

  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const pageSize = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;
  const dateStart = date ? new Date(`${date}T00:00:00`) : null;
  const dateEnd = date ? new Date(`${date}T23:59:59.999`) : null;
  const hasValidDate =
    dateStart &&
    dateEnd &&
    !Number.isNaN(dateStart.getTime()) &&
    !Number.isNaN(dateEnd.getTime());

  const where = {
    ...(barcode
      ? {
        barcode: {
          contains: barcode,
        },
      }
      : {}),
    ...(provider && provider !== "All"
      ? {
        provider,
      }
      : {}),
    ...(status && status !== "All"
      ? {
        responseStatus: status,
      }
      : {}),
    ...(hasValidDate
      ? {
        createdAt: {
          gte: dateStart,
          lte: dateEnd,
        },
      }
      : {}),
  };

  const [logs, totalCount] = await Promise.all([
    prisma.searchLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        productBarcode: {
          select: {
            id: true,
            productName: true,
            brand: true,
          },
        },
      },
    }),
    prisma.searchLog.count({
      where,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Log kayıtları listelendi.",
    data: {
      logs,
      pagination: {
        page: currentPage,
        limit: pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    },
  });
}