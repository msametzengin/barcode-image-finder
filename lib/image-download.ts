import fs from "fs/promises";
import path from "path";

type DownloadProductImageResult = {
  publicPath: string;
  filePath: string;
};

const imageRequestHeaders = {
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  Referer: "https://duckduckgo.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Secilen urun gorselini public/product-images klasorune barkod adiyla kaydeder.
export async function downloadProductImage(
  imageUrl: string,
  barcode: string
): Promise<DownloadProductImageResult> {
  let lastErrorMessage = "Bilinmeyen indirme hatasi";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(imageUrl, {
        headers: imageRequestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastErrorMessage = `Gorsel indirilemedi: ${response.status}`;
        await wait(750 * attempt);
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType && !contentType.includes("image")) {
        throw new Error(`Gorsel dosyasi bekleniyordu, gelen tip: ${contentType}`);
      }

      const extension = getImageExtension(contentType, imageUrl);
      const fileName = `${barcode}.${extension}`;
      const publicDirectory = path.join(process.cwd(), "public", "product-images");
      const filePath = path.join(publicDirectory, fileName);

      await fs.mkdir(publicDirectory, {
        recursive: true,
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new Error("Indirilen gorsel bos geldi.");
      }

      await fs.writeFile(filePath, buffer);

      return {
        publicPath: `/product-images/${fileName}`,
        filePath,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      lastErrorMessage =
        error instanceof Error ? error.message : "Gorsel indirilemedi.";

      await wait(750 * attempt);
    }
  }

  throw new Error(`Gorsel indirilemedi. Son hata: ${lastErrorMessage}`);
}

function getImageExtension(contentType: string, imageUrl: string) {
  if (contentType.includes("png")) {
    return "png";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }

  const urlWithoutQuery = imageUrl.split("?")[0];
  const extension = path.extname(urlWithoutQuery).replace(".", "").toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return "jpg";
}