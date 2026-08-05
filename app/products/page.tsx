"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = {
  id: number;
  barcode: string;
  productName: string | null;
  brand: string | null;
  category: string | null;
  confidenceScore: number;
  status: string;
  source: string | null;
  selectedImageUrl: string | null;
  selectedImagePath: string | null;
  isApproved: boolean;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

type BulkSearchSummary = {
  processedCount: number;
  foundCount: number;
  notFoundCount: number;
  errorCount: number;
};
type WeeklyExportSummary = {
  weekName: string;
  productCount: number;
  exportDirectory: string;
};

const statuses = ["All", "Pending", "Searching", "Found", "NotFound", "Approved", "Error"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkSearching, setIsBulkSearching] = useState(false);
  const [bulkSearchSummary, setBulkSearchSummary] = useState<BulkSearchSummary | null>(null);
  const [searchingProductId, setSearchingProductId] = useState<number | null>(null);
  const [isCreatingWeeklyExport, setIsCreatingWeeklyExport] = useState(false);
  const [weeklyExportSummary, setWeeklyExportSummary] = useState<WeeklyExportSummary | null>(null);

  async function loadProducts(pageToLoad = currentPage) {
    setIsLoading(true);

    const params = new URLSearchParams({
      page: String(pageToLoad),
      limit: "20",
      status,
      search,
    });

    const response = await fetch(`/api/products?${params.toString()}`);
    const json = await response.json();

    if (json.success) {
      setProducts(json.data.products);
      setPagination(json.data.pagination);
      setCurrentPage(json.data.pagination.page);
    }

    setIsLoading(false);
  }

  async function searchProductImage(productId: number) {
    setSearchingProductId(productId);

    await fetch("/api/products/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productBarcodeId: productId,
      }),
    });

    await loadProducts();
    setSearchingProductId(null);
  }

  async function searchBulkProductImages() {
    setIsBulkSearching(true);
    setBulkSearchSummary(null);

    const response = await fetch("/api/products/bulk-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        limit: 20,
      }),
    });

    const json = await response.json();

    if (json.success) {
      setBulkSearchSummary({
        processedCount: json.data.processedCount,
        foundCount: json.data.foundCount,
        notFoundCount: json.data.notFoundCount,
        errorCount: json.data.errorCount,
      });
    }

    await loadProducts();
    setIsBulkSearching(false);
  }

  async function createWeeklyExport() {
    setIsCreatingWeeklyExport(true);
    setWeeklyExportSummary(null);

    const response = await fetch("/api/exports/weekly", {
      method: "POST",
    });

    const json = await response.json();

    if (json.success) {
      setWeeklyExportSummary({
        weekName: json.data.weekName,
        productCount: json.data.productCount,
        exportDirectory: json.data.exportDirectory,
      });
    }

    setIsCreatingWeeklyExport(false);
  }
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    loadProducts(1);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Ürün Listesi</h1>
            <p className="mt-2 text-sm text-slate-600">
              Excel ile yüklenen barkod kayıtları burada listelenir.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
              type="button"
              disabled={isBulkSearching}
              onClick={searchBulkProductImages}
            >
              {isBulkSearching ? "Aranıyor..." : "Toplu Görsel Ara"}
            </button>
            <button
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:bg-slate-100"
              type="button"
              disabled={isCreatingWeeklyExport}
              onClick={createWeeklyExport}
            >
              {isCreatingWeeklyExport ? "Hazırlanıyor..." : "Haftalık Teslim Oluştur"}
            </button>

            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/api/products/export"
            >
              Excel Dışa Aktar
            </Link>

            <Link
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              href="/products/upload"
            >
              Excel Yükle
            </Link>
          </div>
        </div>

        {bulkSearchSummary && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            {bulkSearchSummary.processedCount === 0 ? (
              "Aranacak bekleyen veya hatalı ürün bulunamadı."
            ) : (
              <>
                Toplu arama tamamlandı. İşlenen: {bulkSearchSummary.processedCount}, Bulunan:{" "}
                {bulkSearchSummary.foundCount}, Bulunamayan: {bulkSearchSummary.notFoundCount},
                Hatalı: {bulkSearchSummary.errorCount}
              </>
            )}
          </div>
        )}

        {weeklyExportSummary && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            Haftalık teslim klasörü hazırlandı. Hafta: {weeklyExportSummary.weekName},
            Ürün sayısı: {weeklyExportSummary.productCount}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row">
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Barkod, ürün adı veya marka ara"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "Tümü" : item}
              </option>
            ))}
          </select>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            type="button"
            disabled={isLoading}
            onClick={() => loadProducts(1)}
          >
            {isLoading ? "Yükleniyor..." : "Filtrele"}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Barkod</th>
                <th className="px-4 py-3">Görsel</th>
                <th className="px-4 py-3">Ürün Adı</th>
                <th className="px-4 py-3">Marka</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Skor</th>
                <th className="px-4 py-3">Kaynak</th>
                <th className="px-4 py-3">Onay</th>
                <th className="px-4 py-3">İşlemler</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium">{product.barcode}</td>
                  <td className="px-4 py-3">
                    {product.selectedImagePath || product.selectedImageUrl ? (
                      <img
                        className="h-16 w-16 rounded-md border border-slate-200 bg-white object-contain"
                        src={product.selectedImagePath ?? product.selectedImageUrl ?? ""}
                        alt={product.productName ?? product.barcode}
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Yok</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatText(product.productName)}</td>
                  <td className="px-4 py-3">{formatText(product.brand)}</td>
                  <td className="max-w-72 px-4 py-3">
                    <span className="block" title={formatCategory(product.category)}>
                      {formatCategory(product.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-3">{product.confidenceScore}</td>
                  <td className="px-4 py-3">{product.source ?? "-"}</td>
                  <td className="px-4 py-3">{product.isApproved ? "Evet" : "Hayır"}</td>
                  <td className="px-4 py-3">
                    <a
                      className="mb-2 block rounded-md bg-white px-3 py-1.5 text-center text-xs font-medium text-slate-900 ring-1 ring-slate-200"
                      href={`/products/${product.id}`}
                    >
                      Detay
                    </a>

                    <button
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:bg-slate-400"
                      type="button"
                      disabled={searchingProductId === product.id || product.isApproved}
                      onClick={() => searchProductImage(product.id)}
                    >
                      {product.isApproved
                        ? "Onaylı"
                        : searchingProductId === product.id
                          ? "Aranıyor..."
                          : "Görsel Ara"}
                    </button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={10}>
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <p>
              Toplam {pagination.totalCount} kayıt var. Bu sayfada{" "}
              {products.length} kayıt gösteriliyor.
            </p>

            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                type="button"
                disabled={isLoading || pagination.page <= 1}
                onClick={() => loadProducts(pagination.page - 1)}
              >
                Önceki
              </button>

              <span className="px-2 text-slate-700">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>

              <button
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                type="button"
                disabled={isLoading || pagination.page >= pagination.totalPages}
                onClick={() => loadProducts(pagination.page + 1)}
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
function formatText(value: string | null) {
  if (!value) {
    return "-";
  }

  const cleaned = cleanTextPart(value);

  if (!cleaned) {
    return "-";
  }

  return toTitleCase(cleaned);
}

function formatCategory(value: string | null) {
  if (!value) {
    return "-";
  }

  const parts = value
    .split(",")
    .map((part) => cleanTextPart(part))
    .filter(Boolean)
    .slice(0, 3);

  if (parts.length === 0) {
    return "-";
  }

  return parts.map((part) => toTitleCase(part)).join(", ");
}

function cleanTextPart(value: string) {
  return value
    .trim()
    .replace(/^[a-z]{2}:/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) =>
      word ? word[0].toLocaleUpperCase("tr-TR") + word.slice(1) : ""
    )
    .join(" ");
}
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-slate-100 text-slate-700",
    Searching: "bg-yellow-100 text-yellow-800",
    Found: "bg-green-100 text-green-800",
    NotFound: "bg-red-100 text-red-800",
    Approved: "bg-blue-100 text-blue-800",
    Error: "bg-red-100 text-red-800",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status] ?? colors.Pending}`}>
      {status}
    </span>
  );
}