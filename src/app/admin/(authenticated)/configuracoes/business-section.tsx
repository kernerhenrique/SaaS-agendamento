"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VERTICAL_PRESETS, getVertical, type VerticalKey } from "@/config/vertical";
import { formatPhoneBR } from "@/lib/phone";

import type { BusinessSettings } from "@/server/modules/business/business.service";

import { SettingsCard, useSaveSettings } from "./settings-card";

const noopSubscribe = () => () => {};

/** Endereço do site atual; vazio no servidor (evita diferença na hidratação). */
function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

export function BusinessSection({ business }: { business: BusinessSettings }) {
  const [name, setName] = useState(business.name);
  const [address, setAddress] = useState(business.address ?? "");
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ? formatPhoneBR(business.whatsapp) : "");
  const [instagram, setInstagram] = useState(business.instagramUrl ?? "");
  const [businessType, setBusinessType] = useState(business.businessType);
  const [copied, setCopied] = useState(false);
  const { save, isSaving, error } = useSaveSettings((saved) => setInstagram(saved.instagramUrl ?? ""));
  const origin = useOrigin();
  const publicPath = `/${business.slug}`;
  const typeChanged = businessType !== business.businessType;
  const nextTerms = getVertical(businessType).terms;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <SettingsCard
      id="negocio"
      title="Negócio"
      description="Nome, contato e tipo de negócio. Aparecem na página pública e nas mensagens."
      isSaving={isSaving}
      error={error}
      onSubmit={() =>
        save("/api/admin/business", "PATCH", {
          secao: "negocio",
          name,
          address,
          whatsapp,
          instagramUrl: instagram,
          businessType,
        })
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="business-name">Nome do negócio</Label>
        <Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="business-address">Endereço (opcional)</Label>
        <Input
          id="business-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Rua, número, bairro, cidade"
          maxLength={200}
        />
        <p className="text-caption text-muted-foreground">Na página pública vira um link para o mapa.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="business-whatsapp">WhatsApp (opcional)</Label>
          <Input
            id="business-whatsapp"
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-0000"
            value={whatsapp}
            onChange={(event) => setWhatsapp(formatPhoneBR(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="business-instagram">Instagram (opcional)</Label>
          <Input
            id="business-instagram"
            placeholder="@seuperfil"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="business-type">Tipo de negócio</Label>
        <Select value={businessType} onValueChange={(value) => value && setBusinessType(value)}>
          <SelectTrigger id="business-type" className="w-full sm:w-72">
            <SelectValue>{(value: string) => getVertical(value).label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VERTICAL_PRESETS) as VerticalKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {VERTICAL_PRESETS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-caption text-muted-foreground" aria-live="polite">
          {typeChanged
            ? `Ao salvar, o painel e a página pública passam a dizer "${nextTerms.professional.plural}", "${nextTerms.service.plural}" e "${nextTerms.client.plural}".`
            : "Define os nomes usados no painel e na página pública (ex.: Barbeiro, Procedimento)."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="business-link">Link da página de reservas</Label>
        <div className="flex flex-wrap gap-2">
          <Input id="business-link" readOnly value={`${origin}${publicPath}`} className="min-w-0 flex-1 text-muted-foreground" />
          <Button type="button" variant="outline" onClick={copyLink}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <a href={publicPath} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            <ExternalLink />
            Abrir
          </a>
        </div>
        <p className="text-caption text-muted-foreground">
          O link não muda aqui, para não quebrar o que já foi compartilhado no WhatsApp e no Instagram.
        </p>
      </div>
    </SettingsCard>
  );
}
