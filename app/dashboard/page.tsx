"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardStats = {
  totalProducts: number;
  pendingProducts: number;
  searchingProducts: number;
  foundProducts: number;
  notFoundProducts: number;
  approvedProducts: number;
  errorProducts: number;
  downloadedImageProducts: number;
  candidateCount: number;
  readyForExportProducts: number;
};

type SearchLog = {
  id: number;
  barcode: string | null;
  provider: string;
  responseStatus: string | null;
  message: string | null;
  createdAt: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<SearchLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch("/api/dashboard");
      const json = await response.json();

      if (json.success) {
        setStats(json.data.stats);
        setRecentLogs(json.data.recentLogs);
      }

      setIsLoading(false);
    }

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
        <p>Dashboard yükleniyor...</p>
      </main>
    );
  }

  const approvedRate =
    stats && stats.totalProducts > 0
      ? Math.round((stats.approvedProducts / stats.totalProducts) * 100)
      : 0;

  const remainingCount = stats
    ? stats.pendingProducts + stats.notFoundProducts + stats.errorProducts
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Barkod kayıtlarının genel durum özeti ve teslim kontrolü.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/products"
            >
              Ürünler
            </Link>
            <Link
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              href="/products/upload"
            >
              Excel Yükle
            </Link>
          </div>
        </div>

        {stats && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Toplam Ürün" value={stats.totalProducts} />
              <StatCard label="Bekleyen" value={stats.pendingProducts} />
              <StatCard label="Görsel Bulunan" value={stats.foundProducts} />
              <StatCard label="Onaylanan" value={stats.approvedProducts} />
              <StatCard label="Bulunamayan" value={stats.notFoundProducts} />
              <StatCard label="Hatalı" value={stats.errorProducts} />
              <StatCard label="Görsel Adayı" value={stats.candidateCount} />
              <StatCard label="İndirilen Görsel" value={stats.downloadedImageProducts} />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Onay Oranı</p>
                <p className="mt-2 text-3xl font-semibold">%{approvedRate}</p>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${approvedRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Teslime Hazır Ürün</p>
                <p className="mt-2 text-3xl font-semibold">
                  {stats.readyForExportProducts}
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Onaylanmış ve lokal görsel dosyası oluşmuş kayıtlar.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Kalan Kontrol</p>
                <p className="mt-2 text-3xl font-semibold">{remainingCount}</p>
                <p className="mt-3 text-sm text-slate-600">
                  Pending, NotFound ve Error durumundaki kayıtlar.
                </p>
              </div>
            </section>
          </>
        )}

        <section className="mt-8 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Son Log Kayıtları</h2>
            <Link className="text-sm font-medium text-slate-700" href="/logs">
              Tüm Loglar
            </Link>
          </div>

          {recentLogs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Henüz log kaydı bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Barkod</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Mesaj</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        {new Date(log.createdAt).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">{log.barcode ?? "-"}</td>
                      <td className="px-4 py-3">{log.provider}</td>
                      <td className="px-4 py-3">{log.responseStatus ?? "-"}</td>
                      <td className="px-4 py-3">{log.message ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}