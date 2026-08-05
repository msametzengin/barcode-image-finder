import { NextResponse } from "next/server";
import { searchProductById } from "@/lib/product-search";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productBarcodeId = Number(body.productBarcodeId);

    if (!productBarcodeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Ürün ID bilgisi eksik.",
        },
        { status: 400 }
      );
    }

    const result = await searchProductById(productBarcodeId);

    return NextResponse.json({
      success: result.status !== "Error",
      message: result.message,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Görsel arama işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}