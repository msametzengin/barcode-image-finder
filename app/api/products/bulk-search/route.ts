import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchProductById } from "@/lib/product-search";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Number(body.limit ?? 20);

    const safeLimit = Math.min(Math.max(limit, 1), 20);

    // Toplu aramada sistemi yormamak için sadece bekleyen ve hatalı ürünlerden sınırlı sayıda kayıt alınır.
    const products = await prisma.productBarcode.findMany({
      where: {
        status: {
          in: ["Pending", "Error"],
        },
      },
      orderBy: {
        id: "asc",
      },
      take: safeLimit,
    });

    const results = [];
    const batchSize = 3;

    for (let index = 0; index < products.length; index += batchSize) {
      const batch = products.slice(index, index + batchSize);
      const batchResults = await Promise.all(
        batch.map((product) => searchProductById(product.id))
      );

      results.push(...batchResults);
    }

    const foundCount = results.filter((result) => result.status === "Found").length;
    const notFoundCount = results.filter(
      (result) => result.status === "NotFound"
    ).length;
    const errorCount = results.filter((result) => result.status === "Error").length;

    return NextResponse.json({
      success: true,
      message: "Toplu görsel arama işlemi tamamlandı.",
      data: {
        requestedLimit: safeLimit,
        processedCount: results.length,
        foundCount,
        notFoundCount,
        errorCount,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Toplu görsel arama işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}