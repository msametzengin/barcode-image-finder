import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadProductImage } from "@/lib/image-download";

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

    if (!product.selectedImageUrl && !product.selectedImagePath) {
      return NextResponse.json(
        {
          success: false,
          message: "Onaylanacak görsel bulunamadı.",
        },
        { status: 400 }
      );
    }

    let selectedImagePath = product.selectedImagePath;

    if (!selectedImagePath && product.selectedImageUrl) {
      const downloadedImage = await downloadProductImage(
        product.selectedImageUrl,
        product.barcode
      );

      selectedImagePath = downloadedImage.publicPath;
    }

    const approvedProduct = await prisma.productBarcode.update({
      where: {
        id: product.id,
      },
      data: {
        selectedImagePath,
        isApproved: true,
        status: "Approved",
      },
    });

    await prisma.searchLog.create({
      data: {
        productBarcodeId: product.id,
        barcode: product.barcode,
        provider: "Manual",
        responseStatus: "Approved",
        message: "Ürün kullanıcı tarafından onaylandı ve görsel klasöre kaydedildi.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ürün onaylandı ve görsel klasöre kaydedildi.",
      data: {
        productId: approvedProduct.id,
        selectedImagePath: approvedProduct.selectedImagePath,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Ürün onaylama işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}