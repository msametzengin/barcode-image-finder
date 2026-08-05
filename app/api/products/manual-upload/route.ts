import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const productBarcodeId = Number(formData.get("productBarcodeId"));
    const file = formData.get("image");

    if (!productBarcodeId || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Ürün ID veya görsel dosyası eksik.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Görsel dosyası en fazla 5 MB olabilir.",
        },
        { status: 400 }
      );
    }

    const extension = allowedImageTypes[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          message: "Sadece jpg, png veya webp görsel yüklenebilir.",
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

    const fileName = `${product.barcode}.${extension}`;
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
    const filePath = path.join(uploadDirectory, fileName);
    const publicPath = `/uploads/products/${fileName}`;

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    await prisma.productImageCandidate.updateMany({
      where: {
        productBarcodeId: product.id,
      },
      data: {
        isSelected: false,
      },
    });

    const candidate = await prisma.productImageCandidate.create({
      data: {
        productBarcodeId: product.id,
        imageUrl: publicPath,
        sourceUrl: null,
        sourceName: "ManualUpload",
        score: 50,
        isSelected: true,
      },
    });

    const updatedProduct = await prisma.productBarcode.update({
      where: {
        id: product.id,
      },
      data: {
        selectedImageUrl: publicPath,
        selectedImagePath: publicPath,
        source: "ManualUpload",
        confidenceScore: 50,
        status: "Found",
        isApproved: false,
      },
    });

    await prisma.searchLog.create({
      data: {
        productBarcodeId: product.id,
        barcode: product.barcode,
        provider: "ManualUpload",
        requestUrl: publicPath,
        responseStatus: "Uploaded",
        message: "Manuel görsel dosyası yüklendi.",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Manuel görsel dosyası yüklendi.",
      data: {
        product: updatedProduct,
        candidate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Manuel görsel yükleme işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}