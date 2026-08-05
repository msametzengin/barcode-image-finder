import * as XLSX from "xlsx";
function normalizeBarcode(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return `0${digits}`;
  }

  return digits;
}
export type ExcelProductRow = {
  barcode: string;
  productName?: string;
  brand?: string;
};

type RawExcelRow = Record<string, unknown>;

function getCellValue(row: RawExcelRow, key: string) {
  const value = row[key];

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

// Excel dosyasındaki satırları standart ürün formatına çevirme.
export function parseProductExcel(buffer: Buffer): ExcelProductRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Excel dosyasında sayfa bulunamadı.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<RawExcelRow>(worksheet, {
    defval: "",
  });

  return rows
    .map((row) => ({
      barcode: normalizeBarcode(getCellValue(row, "Barcode")),
      productName: getCellValue(row, "ProductName") || undefined,
      brand: getCellValue(row, "Brand") || undefined,
    }))
    .filter((row) => row.barcode.length > 0);
}