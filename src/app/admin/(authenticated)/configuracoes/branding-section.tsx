"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, ImageOff, Trash2, Upload } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AA_CONTRAST, accentContrast, getAccentCssVars, resolveAccentColor } from "@/lib/accent-color";
import { getInitials } from "@/lib/text";
import { cn } from "cn";

import type { BusinessSettings } from "@/server/modules/business/business.service";

import { SettingsCard, useSaveSettings } from "./settings-card";

const HEX_6 = /^#[0-9a-f]{6}$/i;
const formatRatio = (ratio: number) => `${ratio.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}:1`;

/** Imagem por link com prévia; guarda qual link falhou para mostrar o aviso só para ele. */
function useImagePreview(url: string) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmed = url.trim();
  return {
    src: trimmed.startsWith("https://") ? trimmed : null,
    failed: failedUrl === trimmed,
    onError: () => setFailedUrl(trimmed),
  };
}

export function BrandingSection({ business }: { business: BusinessSettings }) {
  const [logoUrl, setLogoUrl] = useState(business.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(business.coverUrl ?? "");
  const [color, setColor] = useState(resolveAccentColor(business.accentColor).toUpperCase());
  const { save, isSaving, error } = useSaveSettings();
  const logo = useImagePreview(logoUrl);
  const cover = useImagePreview(coverUrl);
  const validColor = HEX_6.test(color);
  const contrast = accentContrast(validColor ? color : resolveAccentColor(business.accentColor));
  const buttonOk = contrast.onButton >= AA_CONTRAST;
  const textOk = contrast.onLightBackground >= AA_CONTRAST;

  return (
    <SettingsCard
      id="identidade"
      title="Identidade"
      description="Logo, capa e cor de marca da sua página de reservas e do painel."
      isSaving={isSaving}
      error={error}
      onSubmit={() => save("/api/admin/business", "PATCH", { secao: "identidade", logoUrl, coverUrl, accentColor: color })}
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="branding-logo-label">
          Logo (opcional)
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar className="size-14 shrink-0">
            {logo.src && !logo.failed ? <AvatarImage src={logo.src} alt="Prévia do logo" onError={logo.onError} /> : null}
            <AvatarFallback>{getInitials(business.name)}</AvatarFallback>
          </Avatar>
          <ImageUploadButtons kind="logo" label="logo" value={logoUrl} initial={business.logoUrl ?? ""} onChange={setLogoUrl} />
        </div>
        <p id="branding-logo-help" className={cn("text-caption", logo.failed ? "text-destructive" : "text-muted-foreground")}>
          {logo.failed
            ? "Não foi possível abrir essa imagem."
            : "Quadrada, de preferência (PNG, JPG ou WebP até 4 MB). Aparece no topo da página e na prévia do link no WhatsApp."}
        </p>
        <ImageLinkField id="branding-logo" label="Logo (link)" value={logoUrl} onChange={setLogoUrl} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="branding-cover-label">
          Capa (opcional)
        </span>
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:h-36">
          {cover.src && !cover.failed ? (
            // eslint-disable-next-line @next/next/no-img-element -- prévia de URL externa arbitrária
            <img src={cover.src} alt="Prévia da capa" className="size-full object-cover" onError={cover.onError} />
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageOff className="size-4" />
              {cover.failed ? "Não foi possível abrir essa imagem" : "Sem capa"}
            </span>
          )}
        </div>
        <ImageUploadButtons kind="capa" label="capa" value={coverUrl} initial={business.coverUrl ?? ""} onChange={setCoverUrl} />
        <p id="branding-cover-help" className="text-caption text-muted-foreground">
          Foto larga (ex.: 1600 × 600) do ambiente ou de um trabalho, PNG, JPG ou WebP até 4 MB. Aparece acima do nome na
          página pública.
        </p>
        <ImageLinkField id="branding-cover" label="Capa (link)" value={coverUrl} onChange={setCoverUrl} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Cor de marca</legend>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Escolher cor"
            value={validColor ? color.toLowerCase() : "#000000"}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
            className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1"
          />
          <Input
            aria-label="Código da cor"
            value={color}
            onChange={(event) => setColor(event.target.value.trim().toUpperCase())}
            maxLength={7}
            className="w-28 font-mono uppercase"
            aria-invalid={!validColor}
          />
          {/* Prévia com as mesmas variáveis que a cor aplica no site todo. */}
          <div style={getAccentCssVars(validColor ? color : business.accentColor)} className="flex items-center gap-3">
            <Button type="button" tabIndex={-1} aria-hidden>
              Agendar
            </Button>
            <span className="text-sm font-medium text-primary" aria-hidden>
              Link de exemplo
            </span>
          </div>
        </div>
        {!validColor ? <p className="text-sm text-destructive">Use o formato #RRGGBB, por exemplo #0F766E.</p> : null}
        <ul className="flex flex-col gap-1 text-caption">
          <li className={cn("flex items-center gap-1.5", buttonOk ? "text-muted-foreground" : "text-destructive")}>
            {buttonOk ? <CircleCheck className="size-3.5 text-success" /> : <CircleAlert className="size-3.5" />}
            Texto nos botões: contraste {formatRatio(contrast.onButton)} {buttonOk ? "(boa leitura)" : "(difícil de ler)"}
          </li>
          <li className={cn("flex items-center gap-1.5", textOk ? "text-muted-foreground" : "text-foreground")}>
            {textOk ? <CircleCheck className="size-3.5 text-success" /> : <CircleAlert className="size-3.5 text-warning" />}
            Como texto no fundo branco: {formatRatio(contrast.onLightBackground)}
            {textOk ? " (boa leitura)" : " — cor clara; links e destaques podem ficar difíceis de ler"}
          </li>
        </ul>
      </fieldset>
    </SettingsCard>
  );
}

/**
 * "Enviar imagem" (arquivo vai para o Blob e aparece na prévia) e "Remover".
 * Como o resto do cartão, só passa a valer no "Salvar".
 */
function ImageUploadButtons({
  kind,
  label,
  value,
  initial,
  onChange,
}: {
  kind: "logo" | "capa";
  label: string;
  value: string;
  /** O que está salvo hoje: diferente disso, avisa que falta salvar. */
  initial: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  /** Erro de um envio: só aparece enquanto o valor é o daquela tentativa. */
  const [failure, setFailure] = useState<{ message: string; value: string } | null>(null);
  const error = failure && failure.value === value ? failure.message : null;
  const inputId = `branding-${kind}-file`;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.set("tipo", kind);
      form.set("arquivo", file);
      const response = await fetch("/api/admin/business/images", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setFailure({ message: data?.error ?? "Não foi possível enviar a imagem", value });
        return;
      }
      onChange(data.url as string);
    } catch {
      setFailure({ message: "Sem conexão. Tente de novo.", value });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* label + input escondido: o botão abre o seletor de arquivos e continua acessível pelo teclado. */}
        <label
          htmlFor={inputId}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <Upload />
          {isUploading ? "Enviando…" : value ? `Trocar ${label}` : `Enviar ${label}`}
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 />
            Remover {label}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-caption text-destructive">{error}</p> : null}
      {value !== initial && !error ? (
        <p className="text-caption text-warning">Ainda não aplicado: clique em “Salvar” no fim do cartão.</p>
      ) : null}
    </div>
  );
}

/** Link de imagem já publicada (opção avançada, para quem já tem a imagem em outro lugar). */
function ImageLinkField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (url: string) => void }) {
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-caption text-muted-foreground hover:text-foreground">Usar um link em vez de arquivo</summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} type="url" inputMode="url" placeholder="https://..." value={value} onChange={(event) => onChange(event.target.value)} />
        <p className="text-caption text-muted-foreground">O link precisa começar com https:// e a imagem precisa ser pública.</p>
      </div>
    </details>
  );
}