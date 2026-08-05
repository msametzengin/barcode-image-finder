"use client";

import Link from "next/link";
import { useState } from "react";

const MAX_EXCEL_SIZE = 10 * 1024 * 1024;
type UploadResult = {
  addedCount: number;
  updatedCount: number;
  failedCount: number;
  totalProcessedCount: number;
};

export default function ProductUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Lütfen bir Excel dosyası seçin.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setMessage("");
    setResult(null);

    const response = await fetch("/api/products/upload", {
      method: "POST",
      body: formData,
    });

    const json = await response.json();

    setIsUploading(false);
    setMessage(json.message);

    if (json.success) {
      setResult(json.data);
      setFile(null);
      setFileInputKey((current) => current + 1);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Excel Yükleme</h1>
            <p className="mt-2 text-sm text-slate-600">
              Barkod listesini .xlsx formatında yükleyin. Zorunlu kolon: Barcode.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/dashboard"
            >
              Dashboard
            </Link>

            <Link
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              href="/products"
            >
              Ürün Listesi
            </Link>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <label className="block text-sm font-medium">Excel dosyası</label>

          <input
            key={fileInputKey}
            className="mt-3 block w-full rounded-md border border-slate-300 p-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            type="file"
            accept=".xlsx"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;

              setMessage("");
              setResult(null);

              if (!selectedFile) {
                setFile(null);
                return;
              }

              if (!selectedFile.name.toLowerCase().endsWith(".xlsx")) {
                setFile(null);
                setFileInputKey((current) => current + 1);
                setMessage("Sadece .xlsx formatında Excel dosyası yüklenebilir.");
                return;
              }

              if (selectedFile.size > MAX_EXCEL_SIZE) {
                setFile(null);
                setFileInputKey((current) => current + 1);
                setMessage("Excel dosyası en fazla 10 MB olabilir.");
                return;
              }

              setFile(selectedFile);
            }}
          />

          {file && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Seçilen dosya: <span className="font-medium">{file.name}</span>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={isUploading || !file}
              onClick={handleUpload}
            >
              {isUploading ? "Yükleniyor..." : "Yükle"}
            </button>

            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/products"
            >
              Vazgeç
            </Link>
          </div>

          {message && (
            <p className="mt-4 text-sm text-slate-700">
              {message}
            </p>
          )}
        </div>

        {result && (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Eklenen" value={result.addedCount} />
            <Stat label="Güncellenen" value={result.updatedCount} />
            <Stat label="Hatalı" value={result.failedCount} />
            <Stat label="Toplam" value={result.totalProcessedCount} />
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}