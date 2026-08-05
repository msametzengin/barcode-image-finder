import { NextResponse } from "next/server";
import { parseProductExcel } from "@/lib/excel";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Excel dosyası bulunamadı.",
        },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        {
          success: false,
          message: "Sadece .xlsx dosyası kabul edilir.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Excel dosyası en fazla 10 MB olabilir.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseProductExcel(buffer);

    let addedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        const existingProduct = await prisma.productBarcode.findUnique({
          where: {
            barcode: row.barcode,
          },
        });

        await prisma.productBarcode.upsert({
          where: {
            barcode: row.barcode,
          },
          create: {
            barcode: row.barcode,
            productName: row.productName,
            brand: row.brand,
            status: "Pending",
          },
          update: {
            productName: row.productName,
            brand: row.brand,
          },
        });

        if (existingProduct) {
          updatedCount += 1;
        } else {
          addedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Excel dosyası işlendi.",
      data: {
        addedCount,
        updatedCount,
        failedCount,
        totalProcessedCount: rows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Excel yükleme işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}