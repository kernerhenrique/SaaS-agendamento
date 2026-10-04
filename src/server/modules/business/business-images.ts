import { ValidationError } from "@/server/errors";

/**
 * Logo e capa enviadas pela tela de Configurações (Vercel Blob). A imagem só
 * passa a valer no "Salvar" da Identidade; ao trocar, a antiga é apagada do
 * Blob (só se for nossa — links externos antigos ficam como estão).
 */
export const IMAGE_KINDS = ["logo", "capa"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Sem SVG: é código, e o arquivo fica público. */
const IMAGE_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Confere tipo e tamanho; devolve a extensão para o nome do arquivo. */
export function validateImageUpload(contentType: string, size: number): string {
  const extension = IMAGE_EXTENSIONS[contentType];
  if (!extension) throw new ValidationError("Use uma imagem PNG, JPG ou WebP");
  if (size === 0) throw new ValidationError("O arquivo está vazio");
  if (size > MAX_IMAGE_BYTES) throw new ValidationError("A imagem passa de 4 MB: reduza o tamanho e envie de novo");
  return extension;
}

export function isOwnBlobUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const blobConfigured = () => Boolean(process.env.BLOB_STORE_ID && (process.env.VERCEL_OIDC_TOKEN || process.env.BLOB_READ_WRITE_TOKEN));

/** Pasta do negócio: produção em clientes/<slug>/ (a mesma do novo-cliente); fora dela, local/<slug>/. */
function folderFor(slug: string): string {
  return process.env.VERCEL_ENV === "production" ? `clientes/${slug}` : `local/${slug}`;
}

export async function uploadBusinessImage(slug: string, kind: ImageKind, file: File): Promise<string> {
  const extension = validateImageUpload(file.type, file.size);
  if (!blobConfigured()) throw new ValidationError("O envio de imagens não está configurado neste ambiente. Use um link por enquanto.");
  const { put } = await import("@vercel/blob");
  const blob = await put(`${folderFor(slug)}/${kind}.${extension}`, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  });
  return blob.url;
}

/** Apaga imagens nossas que deixaram de ser usadas. Falha aqui não desfaz o salvar. */
export async function deleteOwnBlobs(urls: (string | null | undefined)[]): Promise<void> {
  const own = urls.filter(isOwnBlobUrl);
  if (own.length === 0 || !blobConfigured()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(own);
  } catch (error) {
    console.error("[branding] não foi possível apagar a imagem antiga do Blob", error);
  }
}
