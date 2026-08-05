type ImageScoreInput = {
  sourceName: string;
  baseScore?: number;
  imageUrl: string;
  productName?: string | null;
  brand?: string | null;
  category?: string | null;
  width?: number | null;
  height?: number | null;
  imageIndex?: number;
};

const fallbackSourceScores: Record<string, number> = {
  OpenFoodFacts: 45,
  Wikidata: 35,
  MarketSearch: 40,
  DuckDuckGoImages: 15,
  Manual: 30,
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUsefulTokens(value?: string | null) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4);
}

// Görsel adaylarını tek bir yerde puanlamak için kullanılır.
// Amaç: daha güvenilir kaynak, ön yüz görseli ve ürün/marka ile alakalı URL'leri öne çıkarmak.
export function scoreImageCandidate(input: ImageScoreInput) {
  const normalizedUrl = normalizeText(input.imageUrl);
  let score =
    input.baseScore ?? fallbackSourceScores[input.sourceName] ?? 10;

  if (input.imageIndex === 0) {
    score += 5;
  } else if (input.imageIndex === 1) {
    score += 3;
  }

  if (
    normalizedUrl.includes("front") ||
    normalizedUrl.includes("product") ||
    normalizedUrl.includes("pack")
  ) {
    score += 8;
  }

  if (
    normalizedUrl.endsWith(".jpg") ||
    normalizedUrl.endsWith(".jpeg") ||
    normalizedUrl.endsWith(".png") ||
    normalizedUrl.endsWith(".webp")
  ) {
    score += 3;
  }

  const brandTokens = getUsefulTokens(input.brand);
  const productTokens = getUsefulTokens(input.productName);

  if (brandTokens.some((token) => normalizedUrl.includes(token))) {
    score += 5;
  }

  const matchedProductTokens = productTokens.filter((token) =>
    normalizedUrl.includes(token)
  ).length;

  score += Math.min(matchedProductTokens * 2, 8);

  if (input.width && input.height) {
    if (input.width >= 300 && input.height >= 300) {
      score += 5;
    }

    if (input.width < 120 || input.height < 120) {
      score -= 10;
    }
  }

  if (
    normalizedUrl.includes("logo") ||
    normalizedUrl.includes("icon") ||
    normalizedUrl.includes("avatar") ||
    normalizedUrl.includes("placeholder") ||
    normalizedUrl.includes("sprite")
  ) {
    score -= 15;
  }

  return Math.max(0, Math.min(score, 100));
}