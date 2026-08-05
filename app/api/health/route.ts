import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ProductBarcode tablosundaki kayıt sayısını sorgusu
export async function GET() {
  const productCount = await prisma.productBarcode.count();

  return NextResponse.json({
    success: true,
    message: "Veritabanı bağlantısı başarılı",
    data: {
      productCount,
    },
  });
}