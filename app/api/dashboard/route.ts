import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalProducts,
      pendingProducts,
      searchingProducts,
      foundProducts,
      notFoundProducts,
      approvedProducts,
      errorProducts,
      downloadedImageProducts,
      candidateCount,
      recentLogs,
    ] = await Promise.all([
      prisma.productBarcode.count(),
      prisma.productBarcode.count({ where: { status: "Pending" } }),
      prisma.productBarcode.count({ where: { status: "Searching" } }),
      prisma.productBarcode.count({ where: { status: "Found" } }),
      prisma.productBarcode.count({ where: { status: "NotFound" } }),
      prisma.productBarcode.count({ where: { status: "Approved" } }),
      prisma.productBarcode.count({ where: { status: "Error" } }),
      prisma.productBarcode.count({
        where: {
          selectedImagePath: {
            not: null,
          },
        },
      }),
      prisma.productImageCandidate.count(),
      prisma.searchLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
    ]);

    const readyForExportProducts = await prisma.productBarcode.count({
      where: {
        isApproved: true,
        selectedImagePath: {
          not: null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Dashboard verileri getirildi.",
      data: {
        stats: {
          totalProducts,
          pendingProducts,
          searchingProducts,
          foundProducts,
          notFoundProducts,
          approvedProducts,
          errorProducts,
          downloadedImageProducts,
          candidateCount,
          readyForExportProducts,
        },
        recentLogs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Dashboard verileri getirilemedi.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}