import { fetchWithRetry } from "@/lib/http";

type OpenFoodFactsResult = {
  productName?: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  sourceUrl: string;
};

export async function searchOpenFoodFactsByBarcode(
  barcode: string
): Promise<OpenFoodFactsResult | null> {
  const requestUrl = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

  const response = await fetchWithRetry(requestUrl, {
  headers: {
    Accept: "application/json",
    "User-Agent": "barcode-image-finder-student-project/1.0",
  },
  retries: 2,
  retryDelayMs: 1000,
});

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Open Food Facts isteği başarısız: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 1 || !data.product) {
    return null;
  }

  const product = data.product;

  const imageUrls = [
    product.selected_images?.front?.display?.tr,
    product.selected_images?.front?.display?.en,
    product.selected_images?.front?.display?.fr,
    product.selected_images?.front?.small?.tr,
    product.selected_images?.front?.small?.en,
    product.selected_images?.front?.small?.fr,
    product.image_front_url,
    product.image_url,
  ].filter(Boolean);

  const uniqueImageUrls = [...new Set(imageUrls)];

  if (uniqueImageUrls.length === 0) {
    return null;
  }

  return {
    productName: product.product_name || undefined,
    brand: product.brands || undefined,
    category: product.categories || undefined,
    imageUrls: uniqueImageUrls,
    sourceUrl: requestUrl,
  };
}