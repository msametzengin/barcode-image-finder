import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productBarcodeId = Number(body.productBarcodeId);
    const imageCandidateId = Number(body.imageCandidateId);

    if (!productBarcodeId || !imageCandidateId) {
      return NextResponse.json(
        {
          success: false,
          message: "Ürün veya görsel adayı bilgisi eksik.",
        },
        { status: 400 }
      );
    }

    const candidate = await prisma.productImageCandidate.findFirst({
      where: {
        id: imageCandidateId,
        productBarcodeId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          message: "Görsel adayı bulunamadı.",
        },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.productImageCandidate.updateMany({
        where: {
          productBarcodeId,
        },
        data: {
          isSelected: false,
        },
      }),
      prisma.productImageCandidate.update({
        where: {
          id: candidate.id,
        },
        data: {
          isSelected: true,
        },
      }),
      prisma.productBarcode.update({
        where: {
          id: productBarcodeId,
        },
        data: {
          selectedImageUrl: candidate.imageUrl,
          source: candidate.sourceName,
          confidenceScore: candidate.score,
          status: "Found",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Görsel seçildi.",
      data: {
        selectedImageUrl: candidate.imageUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Görsel seçme işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}