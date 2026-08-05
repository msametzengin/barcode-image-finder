import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const weekName = getWeekFolderName();
    const exportDirectory = path.join(process.cwd(), "exports", weekName);
    const imageDirectory = path.join(exportDirectory, "images");

    await fs.mkdir(imageDirectory, {
      recursive: true,
    });

    const products = await prisma.productBarcode.findMany({
      where: {
        isApproved: true,
      },
      orderBy: {
        barcode: "asc",
      },
    });

    let copiedImageCount = 0;

    for (const product of products) {
      if (!product.selectedImagePath) {
        continue;
      }

      const sourcePath = path.join(
        process.cwd(),
        "public",
        product.selectedImagePath.replace(/^\//, "")
      );

      const extension = path.extname(sourcePath) || ".jpg";
      const targetPath = path.join(imageDirectory, `${product.barcode}${extension}`);

      try {
        await fs.copyFile(sourcePath, targetPath);
        copiedImageCount += 1;
      } catch {
        // Görsel dosyası bulunamazsa Excel kaydı yine oluşturulur.
      }
    }

    const rows = products.map((product) => {
      const imageFileName = product.selectedImagePath
        ? path.basename(product.selectedImagePath)
        : "";

      return {
        Barkod: product.barcode,
        "Ürün Adı": product.productName ?? "",
        Marka: product.brand ?? "",
        Kategori: product.category ?? "",
        Kaynak: product.source ?? "",
        Durum: product.status,
        Onay: product.isApproved ? "Evet" : "Hayır",
        Skor: product.confidenceScore,
        "Görsel Dosya Adı": imageFileName,
        "Görsel Klasör Yolu": imageFileName ? `images/${imageFileName}` : "",
        "Uygulama Görsel Yolu": product.selectedImagePath ?? "",
      };
    });

    const summaryRows = [
      {
        Alan: "Haftalık Klasör",
        Değer: weekName,
      },
      {
        Alan: "Onaylanan Ürün Sayısı",
        Değer: products.length,
      },
      {
        Alan: "Kopyalanan Görsel Sayısı",
        Değer: copiedImageCount,
      },
      {
        Alan: "Oluşturulma Tarihi",
        Değer: new Date().toLocaleString("tr-TR"),
      },
    ];

    const workbook = XLSX.utils.book_new();
    const productWorksheet = XLSX.utils.json_to_sheet(rows);
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryRows);

    productWorksheet["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 36 },
      { wch: 18 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
      { wch: 24 },
      { wch: 32 },
      { wch: 34 },
    ];

    summaryWorksheet["!cols"] = [{ wch: 28 }, { wch: 32 }];

    XLSX.utils.book_append_sheet(workbook, productWorksheet, "Urunler");
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Ozet");

    const excelPath = path.join(exportDirectory, "barcode-result.xlsx");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    await fs.writeFile(excelPath, excelBuffer);

    return NextResponse.json({
      success: true,
      message: "Haftalık teslim klasörü hazırlandı.",
      data: {
        weekName,
        productCount: products.length,
        copiedImageCount,
        exportDirectory,
        imageDirectory,
        excelPath,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Haftalık teslim klasörü hazırlanamadı.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}

function getWeekFolderName() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `teslim-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}