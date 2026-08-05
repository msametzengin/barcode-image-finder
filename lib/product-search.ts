import { prisma } from "@/lib/prisma";
import { scoreImageCandidate } from "@/lib/image-scoring";
import { searchOpenFoodFactsByBarcode } from "@/lib/providers/open-food-facts-provider";
import { searchWikidataByBarcode } from "@/lib/providers/wikidata-provider";
import { searchDuckDuckGoImagesByProduct } from "@/lib/providers/duckduckgo-image-provider";
import { searchMarketSitesByProduct } from "@/lib/providers/market-search-provider";

export type ProductSearchResult = {
  productId: number;
  barcode: string;
  status: "Found" | "NotFound" | "Error";
  candidateCount: number;
  selectedImageUrl?: string;
  message: string;
};

type ProviderName = "OpenFoodFacts" | "Wikidata" | "MarketSearch" | "DuckDuckGoImages";

type ProviderResult = {
  productName?: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  sourceUrl: string;
};

type ProviderConfig = {
  name: ProviderName;
  confidenceScore: number;
  requestUrl: (barcode: string) => string;
  search: (product: {
    barcode: string;
    productName?: string | null;
    brand?: string | null;
  }) => Promise<ProviderResult | null>;
};

const providers: ProviderConfig[] = [
  {
    name: "OpenFoodFacts",
    confidenceScore: 45,
    requestUrl: (barcode) =>
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
    search: (product) => searchOpenFoodFactsByBarcode(product.barcode),
  },
  {
    name: "Wikidata",
    confidenceScore: 35,
    requestUrl: (barcode) =>
      `https://query.wikidata.org/sparql?query=GTIN:${barcode}`,
    search: (product) => searchWikidataByBarcode(product.barcode),
  },
  {
    name: "MarketSearch",
    confidenceScore: 40,
    requestUrl: (barcode) => `market-search:${barcode}`,
    search: (product) => searchMarketSitesByProduct(product),
  },
  {
    name: "DuckDuckGoImages",
    confidenceScore: 15,
    requestUrl: (barcode) =>
      `https://duckduckgo.com/?q=${encodeURIComponent(barcode)}&iax=images&ia=images`,
    search: (product) => searchDuckDuckGoImagesByProduct(product),
  },
];

// Tek ürün için barkoddan görsel arama işlemini yönetir.
// Bu fonksiyon hem tekli aramada hem de toplu aramada kullanılır.
export async function searchProductById(
  productBarcodeId: number
): Promise<ProductSearchResult> {
  const product = await prisma.productBarcode.findUnique({
    where: {
      id: productBarcodeId,
    },
  });

  if (!product) {
    throw new Error("Ürün bulunamadı.");
  }

  await prisma.productBarcode.update({
    where: {
      id: product.id,
    },
    data: {
      status: "Searching",
      selectedImageUrl: null,
      selectedImagePath: null,
      source: null,
      confidenceScore: 0,
      isApproved: false,
    },
  });

  await prisma.productImageCandidate.deleteMany({
    where: {
      productBarcodeId: product.id,
    },
  });

  const providerErrors: string[] = [];
  const seenImageUrls = new Set<string>();
  const imageCandidates: {
    imageUrl: string;
    sourceUrl: string;
    sourceName: ProviderName;
    score: number;
  }[] = [];

  let firstFoundProvider: ProviderName | null = null;
  let productName = product.productName;
  let brand = product.brand;
  let category = product.category;

  for (const provider of providers) {
    try {
      const result = await provider.search({
        barcode: product.barcode,
        productName,
        brand,
      });

      await prisma.searchLog.create({
        data: {
          productBarcodeId: product.id,
          barcode: product.barcode,
          provider: provider.name,
          requestUrl: provider.requestUrl(product.barcode),
          responseStatus: result ? "Found" : "NotFound",
          message: result
            ? `${provider.name} sonucu bulundu.`
            : `${provider.name} sonucu bulunamadı.`,
        },
      });

      if (!result || result.imageUrls.length === 0) {
        continue;
      }

      firstFoundProvider ??= provider.name;
      productName = result.productName ?? productName;
      brand = result.brand ?? brand;
      category = result.category ?? category;

      for (const [imageIndex, imageUrl] of result.imageUrls.entries()) {
        if (seenImageUrls.has(imageUrl)) {
          continue;
        }

        seenImageUrls.add(imageUrl);

        imageCandidates.push({
          imageUrl,
          sourceUrl: result.sourceUrl,
          sourceName: provider.name,
          score: scoreImageCandidate({
            sourceName: provider.name,
            baseScore: provider.confidenceScore,
            imageUrl,
            productName,
            brand,
            category,
            imageIndex,
          }),
        });
      }

      if (provider.name === "DuckDuckGoImages" && imageCandidates.length >= 4) {
        break;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Bilinmeyen hata";

      providerErrors.push(`${provider.name}: ${errorMessage}`);

      await prisma.searchLog.create({
        data: {
          productBarcodeId: product.id,
          barcode: product.barcode,
          provider: provider.name,
          requestUrl: provider.requestUrl(product.barcode),
          responseStatus: "Error",
          message: errorMessage,
        },
      });
    }
  }

  if (imageCandidates.length > 0) {
    const createdCandidates = await Promise.all(
      imageCandidates.map((candidate) =>
        prisma.productImageCandidate.create({
          data: {
            productBarcodeId: product.id,
            imageUrl: candidate.imageUrl,
            sourceUrl: candidate.sourceUrl,
            sourceName: candidate.sourceName,
            score: candidate.score,
            isSelected: false,
          },
        })
      )
    );

    await prisma.productBarcode.update({
      where: {
        id: product.id,
      },
      data: {
        productName,
        brand,
        category,
        selectedImageUrl: null,
        selectedImagePath: null,
        source: firstFoundProvider,
        confidenceScore: Math.max(...imageCandidates.map((item) => item.score)),
        status: "Found",
        isApproved: false,
      },
    });

    return {
      productId: product.id,
      barcode: product.barcode,
      status: "Found",
      candidateCount: createdCandidates.length,
      message: "Görsel adayları bulundu. Uygun görsel kullanıcı tarafından seçilmelidir.",
    };
  }

  const allProvidersFailed = providerErrors.length === providers.length;

  await prisma.productBarcode.update({
    where: {
      id: product.id,
    },
    data: {
      status: allProvidersFailed ? "Error" : "NotFound",
      source: null,
      confidenceScore: 0,
      selectedImageUrl: null,
      selectedImagePath: null,
      isApproved: false,
    },
  });

  return {
    productId: product.id,
    barcode: product.barcode,
    status: allProvidersFailed ? "Error" : "NotFound",
    candidateCount: 0,
    message: allProvidersFailed
      ? providerErrors.join(" | ")
      : "Ürün bilgisi arandı ancak görsel bulunamadı.",
  };
}