type UpcItemDbResult = {
  productName?: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  sourceUrl: string;
};

type UpcItemDbResponse = {
  code?: string;
  total?: number;
  items?: Array<{
    title?: string;
    brand?: string;
    category?: string;
    images?: string[];
    offers?: Array<{
      link?: string;
    }>;
  }>;
};

export async function searchUpcItemDbByBarcode(
  barcode: string
): Promise<UpcItemDbResult | null> {
  const requestUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`UPCitemdb isteği başarısız: ${response.status}`);
  }

  const data = (await response.json()) as UpcItemDbResponse;
  const item = data.items?.[0];

  if (!item) {
    return null;
  }

  const imageUrls = (item.images ?? []).filter(Boolean);

  if (imageUrls.length === 0) {
    return null;
  }

  return {
    productName: item.title || undefined,
    brand: item.brand || undefined,
    category: item.category || undefined,
    imageUrls: [...new Set(imageUrls)],
    sourceUrl: item.offers?.[0]?.link || requestUrl,
  };
}