"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const MAX_MANUAL_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedManualImageTypes = ["image/jpeg", "image/png", "image/webp"];
type ImageCandidate = {
  id: number;
  imageUrl: string;
  sourceUrl: string | null;
  sourceName: string;
  width: number | null;
  height: number | null;
  score: number;
  isSelected: boolean;
};

type SearchLog = {
  id: number;
  provider: string;
  responseStatus: string | null;
  message: string | null;
  createdAt: string;
};

type ProductDetail = {
  id: number;
  barcode: string;
  productName: string | null;
  brand: string | null;
  category: string | null;
  selectedImageUrl: string | null;
  selectedImagePath: string | null;
  source: string | null;
  confidenceScore: number;
  status: string;
  isApproved: boolean;
  imageCandidates: ImageCandidate[];
  searchLogs: SearchLog[];
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualSourceUrl, setManualSourceUrl] = useState("");
  const [isAddingManualImage, setIsAddingManualImage] = useState(false);
  const [manualImageFile, setManualImageFile] = useState<File | null>(null);
  const [manualImageFileMessage, setManualImageFileMessage] = useState("");
  const [isUploadingManualFile, setIsUploadingManualFile] = useState(false);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  async function selectImageCandidate(imageCandidateId: number) {
    if (!product) {
      return;
    }

    setSelectedCandidateId(imageCandidateId);

    await fetch("/api/products/select-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productBarcodeId: product.id,
        imageCandidateId,
      }),
    });

    const response = await fetch(`/api/products/${product.id}`);
    const json = await response.json();

    if (json.success) {
      setProduct(json.data.product);
    }

    setSelectedCandidateId(null);
  }
  async function approveProduct() {
    if (!product) {
      return;
    }

    setIsApproving(true);

    try {
      const approveResponse = await fetch("/api/products/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBarcodeId: product.id,
        }),
      });

      const approveJson = await approveResponse.json();

      if (!approveJson.success) {
        alert(approveJson.error || approveJson.message || "Ürün onaylanamadı.");
        return;
      }

      const response = await fetch(`/api/products/${product.id}`);
      const json = await response.json();

      if (json.success) {
        setProduct(json.data.product);
      }
    } finally {
      setIsApproving(false);
    }
  }
  async function addManualImageCandidate() {
    if (!product || !manualImageUrl.trim()) {
      return;
    }

    setIsAddingManualImage(true);

    await fetch("/api/products/manual-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productBarcodeId: product.id,
        imageUrl: manualImageUrl,
        sourceUrl: manualSourceUrl,
      }),
    });

    const response = await fetch(`/api/products/${product.id}`);
    const json = await response.json();

    if (json.success) {
      setProduct(json.data.product);
      setManualImageUrl("");
      setManualSourceUrl("");
    }

    setIsAddingManualImage(false);
  }

  async function uploadManualImageFile() {
    if (!product || !manualImageFile) {
      return;
    }

    setIsUploadingManualFile(true);

    const formData = new FormData();
    formData.append("productBarcodeId", String(product.id));
    formData.append("image", manualImageFile);

    await fetch("/api/products/manual-upload", {
      method: "POST",
      body: formData,
    });

    const response = await fetch(`/api/products/${product.id}`);
    const json = await response.json();

    if (json.success) {
      setProduct(json.data.product);
      setManualImageFile(null);
    }

    setIsUploadingManualFile(false);
  }

  async function searchProductImage() {
    if (!product) {
      return;
    }

    setIsSearchingImage(true);

    await fetch("/api/products/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productBarcodeId: product.id,
      }),
    });

    const response = await fetch(`/api/products/${product.id}`);
    const json = await response.json();

    if (json.success) {
      setProduct(json.data.product);
    }

    setIsSearchingImage(false);
  }

  useEffect(() => {
    async function loadProduct() {
      const response = await fetch(`/api/products/${params.id}`);
      const json = await response.json();

      if (json.success) {
        setProduct(json.data.product);
      }

      setIsLoading(false);
    }

    loadProduct();
  }, [params.id]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
        <p>Ürün detayı yükleniyor...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
        <p>Ürün bulunamadı.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Ürün Detayı</h1>
            <p className="mt-2 text-sm text-slate-600">{product.barcode}</p>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              type="button"
              disabled={isSearchingImage}
              onClick={searchProductImage}
            >
              {isSearchingImage ? "Aranıyor..." : "Görsel Ara"}
            </button>

            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
              type="button"
              disabled={isApproving || product.isApproved}
              onClick={approveProduct}
            >
              {product.isApproved ? "Onaylandı" : isApproving ? "Onaylanıyor..." : "Onayla"}
            </button>

            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-200"
              href="/products"
            >
              Ürün Listesi
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
            <h2 className="font-semibold">Ürün Bilgileri</h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Ürün Adı" value={product.productName} />
              <Info label="Marka" value={product.brand} />
              <Info label="Kategori" value={product.category} />
              <Info label="Durum" value={product.status} />
              <Info label="Kaynak" value={product.source} />
              <Info label="Skor" value={String(product.confidenceScore)} />
              <Info label="Onay" value={product.isApproved ? "Evet" : "Hayır"} />
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Seçili Görsel</h2>

            {product.selectedImageUrl ? (
              <img
                className="mt-4 max-h-72 w-full rounded-md object-contain"
                src={product.selectedImageUrl}
                alt={product.productName ?? product.barcode}
              />
            ) : (
              <p className="mt-4 text-sm text-slate-500">Seçili görsel yok.</p>
            )}
          </div>
        </section>
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Manuel Görsel Ekle</h2>

          <div className="mt-4 grid gap-3">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Görsel URL"
              value={manualImageUrl}
              onChange={(event) => setManualImageUrl(event.target.value)}
            />

            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Kaynak URL (isteğe bağlı)"
              value={manualSourceUrl}
              onChange={(event) => setManualSourceUrl(event.target.value)}
            />

            <button
              className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
              type="button"
              disabled={isAddingManualImage || !manualImageUrl.trim()}
              onClick={addManualImageCandidate}
            >
              {isAddingManualImage ? "Ekleniyor..." : "Manuel Görsel Ekle"}
            </button>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Bilgisayardan görsel yükle
              </p>

              <input
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;

                  setManualImageFileMessage("");

                  if (!selectedFile) {
                    setManualImageFile(null);
                    return;
                  }

                  if (!allowedManualImageTypes.includes(selectedFile.type)) {
                    setManualImageFile(null);
                    setManualImageFileMessage("Sadece jpg, png veya webp görsel yüklenebilir.");
                    return;
                  }

                  if (selectedFile.size > MAX_MANUAL_IMAGE_SIZE) {
                    setManualImageFile(null);
                    setManualImageFileMessage("Görsel dosyası en fazla 5 MB olabilir.");
                    return;
                  }

                  setManualImageFile(selectedFile);
                }}
              />

              {manualImageFileMessage && (
                <p className="mt-2 text-sm text-red-600">
                  {manualImageFileMessage}
                </p>
              )}

              {manualImageFile && (
                <p className="mt-2 text-sm text-slate-600">
                  Seçilen dosya: {manualImageFile.name}
                </p>
              )}

              <button
                className="mt-3 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                type="button"
                disabled={isUploadingManualFile || !manualImageFile}
                onClick={uploadManualImageFile}
              >
                {isUploadingManualFile ? "Yükleniyor..." : "Dosyadan Görsel Yükle"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Görsel Adayları</h2>

          {product.imageCandidates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Görsel adayı bulunmuyor.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.imageCandidates.map((candidate) => (
                <div key={candidate.id} className="rounded-lg border border-slate-200 p-4">
                  <img
                    className="h-48 w-full rounded-md object-contain"
                    src={candidate.imageUrl}
                    alt={candidate.sourceName}
                  />
                  <div className="mt-3 text-sm">
                    <p>Kaynak: {candidate.sourceName}</p>
                    <p>Skor: {candidate.score}</p>
                    <p>Seçili: {candidate.isSelected ? "Evet" : "Hayır"}</p>

                    <button
                      className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:bg-slate-400"
                      type="button"
                      disabled={selectedCandidateId === candidate.id}
                      onClick={() => selectImageCandidate(candidate.id)}
                    >
                      {selectedCandidateId === candidate.id ? "Seçiliyor..." : "Seç"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Son Arama Logları</h2>

          {product.searchLogs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Log kaydı bulunmuyor.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {product.searchLogs.map((log) => (
                <div key={log.id} className="rounded-md bg-slate-50 p-3 text-sm">
                  <p>{new Date(log.createdAt).toLocaleString("tr-TR")}</p>
                  <p>Provider: {log.provider}</p>
                  <p>Durum: {log.responseStatus ?? "-"}</p>
                  <p>Mesaj: {log.message ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || "-"}</dd>
    </div>
  );
}