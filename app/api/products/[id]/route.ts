import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const productId = Number(params.id);

  if (!productId) {
    return NextResponse.json(
      {
        success: false,
        message: "Geçersiz ürün ID.",
      },
      { status: 400 }
    );
  }

  const product = await prisma.productBarcode.findUnique({
    where: {
      id: productId,
    },
    include: {
      imageCandidates: {
        orderBy: {
          score: "desc",
        },
      },
      searchLogs: {
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
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

  return NextResponse.json({
    success: true,
    message: "Ürün detayı getirildi.",
    data: {
      product,
    },
  });
}