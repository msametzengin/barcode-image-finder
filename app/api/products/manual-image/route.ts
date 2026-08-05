import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productBarcodeId = Number(body.productBarcodeId);
    const imageUrl = String(body.imageUrl ?? "").trim();
    const sourceUrl = String(body.sourceUrl ?? "").trim();

    if (!productBarcodeId || !imageUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Ürün ID veya görsel URL bilgisi eksik.",
        },
        { status: 400 }
      );
    }

    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      return NextResponse.json(
        {
          success: false,
          message: "Geçerli bir görsel URL girilmelidir.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.productBarcode.findUnique({
      where: {
        id: productBarcodeId,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Ürün bulunamadı.",
        },
        { status: 404 }
      );
    }

    const candidate = await prisma.productImageCandidate.create({
      data: {
        productBarcodeId: product.id,
        imageUrl,
        sourceUrl: sourceUrl || null,
        sourceName: "Manual",
        score: 30,
        isSelected: false,
      },
    });

    await prisma.searchLog.create({
      data: {
        productBarcodeId: product.id,
        barcode: product.barcode,
        provider: "Manual",
        requestUrl: sourceUrl || imageUrl,
        responseStatus: "CandidateAdded",
        message: "Manuel görsel adayı eklendi.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manuel görsel adayı eklendi.",
      data: {
        candidate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Manuel görsel ekleme işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}