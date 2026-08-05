import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/http";

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
};

type OpenFoodFactsSearchResponse = {
  products?: OpenFoodFactsProduct[];
};

function normalizeBarcode(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    return `0${digits}`;
  }

  return digits;
}

function cleanText(value: string | undefined) {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  return text.length > 255 ? text.slice(0, 255) : text;
}
async function fetchOpenFoodFactsSearch(requestUrl: string) {
  const response = await fetchWithRetry(requestUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "barcode-image-finder-student-project/1.0",
    },
    retries: 2,
    retryDelayMs: 1000,
  });

  if (!response.ok) {
    throw new Error(`OpenFoodFacts import isteği başarısız: ${response.status}`);
  }

  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedLimit = Number(body.limit ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 20)
      : 20;

    const searchTerm = String(body.searchTerm ?? "market").trim();
    const brandTag = String(body.brandTag ?? "").trim();
    const requestedPage = Number(body.page ?? 1);
    const page = Number.isFinite(requestedPage)
      ? Math.max(Math.floor(requestedPage), 1)
      : 1;

    const requestUrl = brandTag
      ? "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        tagtype_0: "brands",
        tag_contains_0: "contains",
        tag_0: brandTag,
        action: "process",
        json: "1",
        page: String(page),
        page_size: String(limit),
        fields: "code,product_name,brands,categories,image_url",
      }).toString()
      : "https://world.openfoodfacts.org/cgi/search.pl?" +
      new URLSearchParams({
        search_terms: searchTerm,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: String(limit),
        fields: "code,product_name,brands,categories,image_url",
      }).toString();

    const response = await fetchOpenFoodFactsSearch(requestUrl);

    const data = (await response.json()) as OpenFoodFactsSearchResponse;
    const products = data.products ?? [];

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let candidateCount = 0;

    for (const item of products) {
      try {
        const barcode = normalizeBarcode(item.code ?? "");
        const productName = cleanText(item.product_name);
        const brand = cleanText(item.brands);
        const category = cleanText(item.categories);
        const imageUrl = item.image_url?.trim();

        if (!barcode || !productName) {
          skippedCount += 1;
          continue;
        }

        const existingProduct = await prisma.productBarcode.findUnique({
          where: {
            barcode,
          },
        });
        if (!existingProduct) {
          const duplicateProduct = await prisma.productBarcode.findFirst({
            where: {
              barcode: {
                not: barcode,
              },
              productName,
              brand: brand ?? null,
            },
          });

          if (duplicateProduct) {
            skippedCount += 1;
            continue;
          }
        }

        const savedProduct = await prisma.productBarcode.upsert({
          where: {
            barcode,
          },
          create: {
            barcode,
            productName,
            brand,
            category,
            selectedImageUrl: null,
            selectedImagePath: null,
            source: "OpenFoodFacts",
            confidenceScore: imageUrl ? 45 : 0,
            status: imageUrl ? "Found" : "Pending",
          },
          update: existingProduct?.isApproved
            ? {
              productName,
              brand,
              category,
            }
            : {
              productName,
              brand,
              category,
              selectedImageUrl: existingProduct?.selectedImageUrl ?? null,
              selectedImagePath: existingProduct?.selectedImagePath ?? null,
              source: imageUrl ? "OpenFoodFacts" : existingProduct?.source,
              confidenceScore: imageUrl ? 45 : existingProduct?.confidenceScore,
              status: imageUrl ? "Found" : existingProduct?.status,
            },
        });

        if (imageUrl) {
          const existingCandidate = await prisma.productImageCandidate.findFirst({
            where: {
              productBarcodeId: savedProduct.id,
              imageUrl,
            },
          });

          if (!existingCandidate) {
            await prisma.productImageCandidate.create({
              data: {
                productBarcodeId: savedProduct.id,
                imageUrl,
                sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
                sourceName: "OpenFoodFacts",
                score: 45,
                isSelected: false,
              },
            });

            candidateCount += 1;
          }
        }

        await prisma.searchLog.create({
          data: {
            productBarcodeId: savedProduct.id,
            barcode,
            provider: "OpenFoodFacts",
            requestUrl,
            responseStatus: imageUrl ? "Found" : "Imported",
            message: imageUrl
              ? "OpenFoodFacts toplu import ile görsel adayı eklendi."
              : "OpenFoodFacts toplu import ile ürün eklendi.",
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
      message: "OpenFoodFacts üzerinden toplu ürün importu tamamlandı.",
      data: {
        mode: brandTag ? "brand" : "search",
        searchTerm: brandTag ? null : searchTerm,
        brandTag: brandTag || null,
        requestedLimit: limit,
        page,
        sourceCount: products.length,
        addedCount,
        updatedCount,
        skippedCount,
        failedCount,
        candidateCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "OpenFoodFacts toplu import işlemi başarısız.",
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}