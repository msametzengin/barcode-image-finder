import * as cheerio from "cheerio";

type MarketSearchResult = {
    productName?: string;
    brand?: string;
    category?: string;
    imageUrls: string[];
    sourceUrl: string;
};

type MarketImageCandidate = {
    imageUrl: string;
    sourceUrl: string;
    score: number;
};

type MarketSite = {
    name: string;
    buildSearchUrls: (query: string) => string[];
};

const MARKET_SITES: MarketSite[] = [
    {
        name: "Migros",
        buildSearchUrls: (query) => [
            `https://www.migros.com.tr/arama?q=${encodeURIComponent(query)}`,
            `https://www.migros.com.tr/hemen/arama?q=${encodeURIComponent(query)}`,
        ],
    },
    {
        name: "CarrefourSA",
        buildSearchUrls: (query) => [
            `https://www.carrefoursa.com/search?text=${encodeURIComponent(query)}`,
            `https://www.carrefoursa.com/arama?text=${encodeURIComponent(query)}`,
            `https://www.carrefoursa.com/arama?q=${encodeURIComponent(query)}`,
        ],
    },
    {
        name: "A101",
        buildSearchUrls: (query) => [
            `https://www.a101.com.tr/arama?k=${encodeURIComponent(query)}`,
        ],
    },
    {
        name: "Sok",
        buildSearchUrls: (query) => [
            `https://www.sokmarket.com.tr/arama?q=${encodeURIComponent(query)}`,
            `https://kurumsal.sokmarket.com.tr/arama?search=${encodeURIComponent(query)}`,
        ],
    },
    {
        name: "File",
        buildSearchUrls: (query) => [
            `https://www.file.com.tr/arama?search=${encodeURIComponent(query)}`,
            `https://www.file.com.tr/arama?q=${encodeURIComponent(query)}`,
        ],
    },
];

const REQUEST_TIMEOUT_MS = 8000;
const MAX_PRODUCT_PAGES_PER_SITE = 2;
const MAX_IMAGE_COUNT = 5;

function cleanText(value: string | null | undefined) {
    return value?.trim().replace(/\s+/g, " ") || "";
}

function normalizeText(value: string) {
    return value
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function buildQuery(input: {
    barcode: string;
    productName?: string | null;
    brand?: string | null;
}) {
    const productName = cleanText(input.productName);
    const brand = cleanText(input.brand);
    const barcode = cleanText(input.barcode);

    return [brand, productName].filter(Boolean).join(" ") || barcode;
}

function buildTokens(query: string, barcode: string) {
    const stopWords = new Set([
        "g",
        "gr",
        "kg",
        "ml",
        "lt",
        "l",
        "adet",
        "ve",
        "the",
        "product",
        "image",
    ]);

    return normalizeText(`${query} ${barcode}`)
        .split(/[^a-z0-9çğıöşü]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !stopWords.has(token));
}
function buildRequiredTokens(input: {
    productName?: string | null;
    brand?: string | null;
}) {
    const productTokens = normalizeText(cleanText(input.productName))
        .split(/[^a-z0-9çğıöşü]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4);

    if (productTokens.length > 0) {
        return productTokens;
    }

    return normalizeText(cleanText(input.brand))
        .split(/[^a-z0-9çğıöşü]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4);
}

function hasRequiredProductMatch(
    url: string,
    text: string,
    requiredTokens: string[],
    barcode: string
) {
    const haystack = normalizeText(`${url} ${text}`);
    const barcodeDigits = barcode.replace(/\D/g, "");

    if (barcodeDigits && haystack.includes(barcodeDigits)) {
        return true;
    }

    if (requiredTokens.length === 0) {
        return true;
    }

    return requiredTokens.every((token) => haystack.includes(token));
}


async function fetchHtml(url: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "text/html,application/xhtml+xml",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            },
        });

        if (!response.ok) {
            return null;
        }

        return await response.text();
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

function toAbsoluteUrl(rawUrl: string, baseUrl: string) {
    const value = rawUrl.trim();

    if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
        return null;
    }

    try {
        return new URL(value, baseUrl).toString();
    } catch {
        return null;
    }
}

function splitSrcSet(value: string) {
    return value
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
}

function isBlockedImage(url: string) {
    const lowerUrl = url.toLocaleLowerCase("tr-TR");

    return [
        "logo",
        "icon",
        "sprite",
        "placeholder",
        "banner",
        "no-product",
        "empty",
        "apple",
        "android",
    ].some((word) => lowerUrl.includes(word));
}

function scoreImage(url: string, text: string, tokens: string[]) {
    const normalizedUrl = normalizeText(url);
    const normalizedText = normalizeText(text);

    if (isBlockedImage(url)) {
        return -10;
    }

    let score = 0;

    for (const token of tokens) {
        if (normalizedText.includes(token)) {
            score += 3;
        }

        if (normalizedUrl.includes(token)) {
            score += 2;
        }
    }

    if (
        normalizedUrl.includes("product") ||
        normalizedUrl.includes("urun") ||
        normalizedUrl.includes("images")
    ) {
        score += 2;
    }

    if (url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
        score += 1;
    }

    return score;
}

function collectImagesFromHtml(
    html: string,
    pageUrl: string,
    tokens: string[],
    requiredTokens: string[],
    barcode: string
): MarketImageCandidate[] {
    const $ = cheerio.load(html);
    const candidates: MarketImageCandidate[] = [];

    $("img").each((_, element) => {
        const image = $(element);
        const rawUrls = [
            image.attr("src"),
            image.attr("data-src"),
            image.attr("data-original"),
            image.attr("data-lazy-src"),
            image.attr("data-image"),
            ...splitSrcSet(image.attr("srcset") || ""),
        ].filter(Boolean) as string[];

        const altText = [
            image.attr("alt"),
            image.attr("title"),
            image.closest("a").text(),
        ]
            .filter(Boolean)
            .join(" ");

        for (const rawUrl of rawUrls) {
            const imageUrl = toAbsoluteUrl(rawUrl, pageUrl);

            if (!imageUrl) {
                continue;
            }

            const score = scoreImage(imageUrl, altText, tokens);

            if (
                score >= 4 &&
                hasRequiredProductMatch(imageUrl, altText, requiredTokens, barcode)
            ) {
                candidates.push({
                    imageUrl,
                    sourceUrl: pageUrl,
                    score,
                });
            }
        }
    });

    return candidates;
}

function collectProductLinks(html: string, pageUrl: string, tokens: string[]) {
    const $ = cheerio.load(html);
    const pageHost = new URL(pageUrl).host;
    const links: string[] = [];

    $("a[href]").each((_, element) => {
        const link = $(element);
        const href = link.attr("href");

        if (!href) {
            return;
        }

        const absoluteUrl = toAbsoluteUrl(href, pageUrl);

        if (!absoluteUrl) {
            return;
        }

        const url = new URL(absoluteUrl);

        if (url.host !== pageHost) {
            return;
        }

        const linkText = normalizeText(`${absoluteUrl} ${link.text()}`);
        const looksLikeProductPage =
            linkText.includes("/p-") ||
            linkText.includes("-p-") ||
            linkText.includes("urun") ||
            linkText.includes("product");

        const tokenMatched = tokens.some((token) => linkText.includes(token));

        if (looksLikeProductPage || tokenMatched) {
            links.push(absoluteUrl);
        }
    });

    return [...new Set(links)].slice(0, MAX_PRODUCT_PAGES_PER_SITE);
}

function uniqueCandidates(candidates: MarketImageCandidate[]) {
    const map = new Map<string, MarketImageCandidate>();

    for (const candidate of candidates) {
        const existing = map.get(candidate.imageUrl);

        if (!existing || candidate.score > existing.score) {
            map.set(candidate.imageUrl, candidate);
        }
    }

    return [...map.values()].sort((a, b) => b.score - a.score);
}

export async function searchMarketSitesByProduct(input: {
    barcode: string;
    productName?: string | null;
    brand?: string | null;
}): Promise<MarketSearchResult | null> {
    const query = buildQuery(input);

    if (!query) {
        return null;
    }

    const tokens = buildTokens(query, input.barcode);
    const requiredTokens = buildRequiredTokens(input);
    const allCandidates: MarketImageCandidate[] = [];

    for (const site of MARKET_SITES) {
        for (const searchUrl of site.buildSearchUrls(query)) {
            const html = await fetchHtml(searchUrl);

            if (!html) {
                continue;
            }

            allCandidates.push(...collectImagesFromHtml(html, searchUrl, tokens, requiredTokens, input.barcode));

            const productLinks = collectProductLinks(html, searchUrl, tokens);

            for (const productLink of productLinks) {
                const productHtml = await fetchHtml(productLink);

                if (!productHtml) {
                    continue;
                }

                allCandidates.push(
                    ...collectImagesFromHtml(
                        productHtml,
                        productLink,
                        tokens,
                        requiredTokens,
                        input.barcode
                    )
                );
            }

            if (allCandidates.length >= MAX_IMAGE_COUNT) {
                break;
            }
        }

        if (allCandidates.length >= MAX_IMAGE_COUNT) {
            break;
        }
    }

    const selectedCandidates = uniqueCandidates(allCandidates).slice(
        0,
        MAX_IMAGE_COUNT
    );

    if (selectedCandidates.length === 0) {
        return null;
    }

    return {
        productName: cleanText(input.productName) || undefined,
        brand: cleanText(input.brand) || undefined,
        category: undefined,
        imageUrls: selectedCandidates.map((candidate) => candidate.imageUrl),
        sourceUrl: selectedCandidates[0].sourceUrl,
    };
}