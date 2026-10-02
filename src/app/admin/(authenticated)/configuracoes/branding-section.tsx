"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, ImageOff } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        Cole o link de uma imagem já publicada (ex.: foto do perfil do Instagram ou do Google Drive público). O link
        precisa começar com https://.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="branding-logo">Logo (opcional)</Label>
        <div className="flex items-center gap-3">
          <Avatar className="size-14 shrink-0">
            {logo.src && !logo.failed ? <AvatarImage src={logo.src} alt="" onError={logo.onError} /> : null}
            <AvatarFallback>{getInitials(business.name)}</AvatarFallback>
          </Avatar>
          <Input
            id="branding-logo"
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
            aria-describedby="branding-logo-help"
          />
        </div>
        <p id="branding-logo-help" className={cn("text-caption", logo.failed ? "text-destructive" : "text-muted-foreground")}>
          {logo.failed
            ? "Não foi possível abrir essa imagem. Confira se o link é público."
            : "Quadrada, de preferência. Aparece no topo da página e na prévia do link no WhatsApp."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="branding-cover">Capa (opcional)</Label>
        <Input
          id="branding-cover"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          aria-describedby="branding-cover-help"
        />
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
        <p id="branding-cover-help" className="text-caption text-muted-foreground">
          Foto larga (ex.: 1600 × 600) do ambiente ou de um trabalho. Aparece acima do nome na página pública.
        </p>
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
