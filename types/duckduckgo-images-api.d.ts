declare module "duckduckgo-images-api" {
  export type DuckDuckGoImageResult = {
    image?: string;
    thumbnail?: string;
    url?: string;
    title?: string;
    width?: number;
    height?: number;
  };

  export function image_search(config: {
    query: string;
    moderate?: boolean;
    iterations?: number;
    retries?: number;
  }): Promise<DuckDuckGoImageResult[]>;
}