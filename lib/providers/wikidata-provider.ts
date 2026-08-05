import { fetchWithRetry } from "@/lib/http";

type WikidataResult = {
  productName?: string;
  brand?: string;
  category?: string;
  imageUrls: string[];
  sourceUrl: string;
};

type WikidataBindingValue = {
  value: string;
};

type WikidataBinding = {
  item?: WikidataBindingValue;
  itemLabel?: WikidataBindingValue;
  image?: WikidataBindingValue;
  gtin?: WikidataBindingValue;
};

type WikidataSparqlResponse = {
  results?: {
    bindings?: WikidataBinding[];
  };
};

function getBarcodeVariants(barcode: string) {
  const digits = barcode.replace(/\D/g, "");

  return [
    digits,
    digits.length < 12 ? digits.padStart(12, "0") : digits,
    digits.length < 13 ? digits.padStart(13, "0") : digits,
    digits.length < 14 ? digits.padStart(14, "0") : digits,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
}

function escapeSparqlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildWikidataQuery(barcodes: string[]) {
  const values = barcodes
    .map((barcode) => `"${escapeSparqlString(barcode)}"`)
    .join(" ");

  return `
    SELECT ?item ?itemLabel ?image ?gtin WHERE {
      VALUES ?gtin { ${values} }
      ?item wdt:P3962 ?gtin.
      OPTIONAL { ?item wdt:P18 ?image. }
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "tr,en".
      }
    }
    LIMIT 1
  `;
}

export async function searchWikidataByBarcode(
  barcode: string
): Promise<WikidataResult | null> {
  const barcodeVariants = getBarcodeVariants(barcode);
  const query = buildWikidataQuery(barcodeVariants);

  const requestUrl =
    "https://query.wikidata.org/sparql?" +
    new URLSearchParams({
      query,
      format: "json",
    }).toString();

  const response = await fetchWithRetry(requestUrl, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "barcode-image-finder-student-project/1.0",
    },
    retries: 2,
    retryDelayMs: 1000,
  });

  if (!response.ok) {
    throw new Error(`Wikidata isteği başarısız: ${response.status}`);
  }

  const data = (await response.json()) as WikidataSparqlResponse;
  const binding = data.results?.bindings?.[0];

  if (!binding) {
    return null;
  }

  const imageUrl = binding.image?.value;
  const itemUrl = binding.item?.value;

  if (!imageUrl) {
    return null;
  }

  return {
    productName: binding.itemLabel?.value || undefined,
    brand: undefined,
    category: undefined,
    imageUrls: [imageUrl],
    sourceUrl: itemUrl || requestUrl,
  };
}