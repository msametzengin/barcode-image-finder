import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const currentPage = Number.isFinite(page) && page > 0 ? page : 1;
  const pageSize = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

  const where = {
    ...(status && status !== "All"
      ? {
          status: status as
            | "Pending"
            | "Searching"
            | "Found"
            | "NotFound"
            | "Approved"
            | "Error",
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              barcode: {
                contains: search,
              },
            },
            {
              productName: {
                contains: search,
              },
            },
            {
              brand: {
                contains: search,
              },
            },
          ],
        }
      : {}),
  };

  const [products, totalCount] = await Promise.all([
    prisma.productBarcode.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productBarcode.count({
      where,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Ürünler listelendi.",
    data: {
      products,
      pagination: {
        page: currentPage,
        limit: pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    },
  });
}