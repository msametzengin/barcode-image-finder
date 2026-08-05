"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SearchLog = {
  id: number;
  barcode: string | null;
  provider: string;
  responseStatus: string | null;
  message: string | null;
  createdAt: string;
  productBarcode: {
    id: number;
    productName: string | null;
    brand: string | null;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

const providerOptions = [
  "All",
  "OpenFoodFacts",
  "Wikidata",
  "MarketSearch",
  "DuckDuckGoImages",
  "Manual",
];

const statusOptions = [
  "All",
  "Imported",
  "CandidateAdded",
  "Found",
  "NotFound",
  "Approved",
  "Error",
];


export default function LogsPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [barcode, setBarcode] = useState("");
  const [provider, setProvider] = useState("All");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  async function loadLogs(targetPage = page) {
    setIsLoading(true);

    const params = new URLSearchParams({
      page: String(targetPage),
      limit: "50",
      barcode,
      provider,
      status,
      date,
    });

    const response = await fetch(`/api/logs?${params.toString()}`);
    const json = await response.json();

    if (json.success) {
      setLogs(json.data.logs);
      setPagination(json.data.pagination);
      setPage(json.data.pagination.page);
    }

    setIsLoading(false);
  }

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    loadLogs();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Log Kayıtları</h1>
            <p className="mt-2 text-sm text-slate-600">
              Arama, onay ve hata kayıtları burada listelenir.
            </p>
          </div>

          <div className="flex gap-2">
            <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200" href="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" href="/products">
              Ürünler
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_160px_160px_160px_auto]">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Barkod ile filtrele"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            {providerOptions.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "Tüm Providerlar" : item}
              </option>
            ))}
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "Tüm Durumlar" : item}
              </option>
            ))}
          </select>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
            type="button"
            disabled={isLoading}
            onClick={() => loadLogs(1)}
          >
            {isLoading ? "Yükleniyor..." : "Filtrele"}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Barkod</th>
                <th className="px-4 py-3">Ürün</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Mesaj</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">{log.barcode ?? "-"}</td>
                  <td className="px-4 py-3">
                    {log.productBarcode?.productName ?? "-"}
                    {log.productBarcode?.brand
                      ? ` / ${log.productBarcode.brand}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">{log.provider}</td>
                  <td className="px-4 py-3">{log.responseStatus ?? "-"}</td>
                  <td className="px-4 py-3">{log.message ?? "-"}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    Log kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-600">
            <p>
              Toplam {pagination.totalCount} log kaydı gösteriliyor.
            </p>

            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:text-slate-400"
                type="button"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => loadLogs(pagination.page - 1)}
              >
                Önceki
              </button>

              <span>
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>

              <button
                className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:text-slate-400"
                type="button"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => loadLogs(pagination.page + 1)}
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