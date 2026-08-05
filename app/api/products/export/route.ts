import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.productBarcode.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows = products.map((product) => ({
    Barcode: product.barcode,
    ProductName: product.productName ?? "",
    Brand: product.brand ?? "",
    Category: product.category ?? "",
    SelectedImageUrl: product.selectedImageUrl ?? "",
    SelectedImagePath: product.selectedImagePath ?? "",
    Source: product.source ?? "",
    ConfidenceScore: product.confidenceScore,
    Status: product.status,
    IsApproved: product.isApproved ? "Yes" : "No",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="barcode-result.xlsx"',
    },
  });
}