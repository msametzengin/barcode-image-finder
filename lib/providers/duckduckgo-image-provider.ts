type DuckDuckGoImageSearchResult = {
  image?: string;
  thumbnail?: string;
  title?: string;
  url?: string;
};

type DuckDuckGoImageResponse = {
  results?: DuckDuckGoImageSearchResult[];
};

type DuckDuckGoProviderResult = {
  productName?: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  sourceUrl: string;
};

function cleanQueryPart(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function uniqueValues(values: string[]) {
  return values.filter(
    (value, index, array) => value && array.indexOf(value) === index
  );
}

function extractVqd(html: string) {
  const patterns = [
    /vqd=["']?([^"'\s&]+)["']?/,
    /vqd=([^&"'\s]+)/,
    /"vqd":"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function getDuckDuckGoToken(query: string) {
  const searchUrl =
    "https://duckduckgo.com/?" +
    new URLSearchParams({
      q: query,
      iax: "images",
      ia: "images",
    }).toString();

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo token isteği başarısız: ${response.status}`);
  }

  const html = await response.text();
  const token = extractVqd(html);

  if (!token) {
    throw new Error("DuckDuckGo token alınamadı.");
  }

  return token;
}

export async function searchDuckDuckGoImagesByProduct(input: {
  barcode: string;
  productName?: string | null;
  brand?: string | null;
}): Promise<DuckDuckGoProviderResult | null> {
  const productName = cleanQueryPart(input.productName);
  const brand = cleanQueryPart(input.brand);
  const barcode = cleanQueryPart(input.barcode);

    const query = [productName, brand, "packshot", "white background"].filter(Boolean).join(" ");

  if (!query && !barcode) {
    return null;
  }

  const finalQuery = query || `${barcode} product image`;
  const token = await getDuckDuckGoToken(finalQuery);

  const requestUrl =
    "https://duckduckgo.com/i.js?" +
    new URLSearchParams({
      l: "wt-wt",
      o: "json",
      q: finalQuery,
      vqd: token,
      f: ",,,",
      p: "1",
    }).toString();

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
      Referer: "https://duckduckgo.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo görsel isteği başarısız: ${response.status}`);
  }

  const data = (await response.json()) as DuckDuckGoImageResponse;

  const imageUrls = uniqueValues(
    (data.results ?? [])
      .map((result) => result.image || result.thumbnail || "")
      .filter((url) => url.startsWith("http://") || url.startsWith("https://"))
      .slice(0, 8)
  );

  if (imageUrls.length === 0) {
    return null;
  }

  return {
    productName: productName || undefined,
    brand: brand || undefined,
    category: undefined,
    imageUrls,
    sourceUrl: `https://duckduckgo.com/?q=${encodeURIComponent(finalQuery)}&iax=images&ia=images`,
  };
}