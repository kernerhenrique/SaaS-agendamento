"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getVertical } from "@/config/vertical";
import { formatPhoneBR } from "@/lib/phone";

import type { BusinessSettings } from "@/server/modules/business/business.service";
import type { SoloProfessional } from "@/server/modules/business/solo.service";

import { SettingsCard, useSaveSettings } from "./settings-card";

const noopSubscribe = () => () => {};

/** Endereço do site atual; vazio no servidor (evita diferença na hidratação). */
function useOrigin(): string {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

export function BusinessSection({
  business,
  soloProfessional,
}: {
  business: BusinessSettings;
  soloProfessional: SoloProfessional | null;
}) {
  const [name, setName] = useState(business.name);
  const [professionalName, setProfessionalName] = useState(soloProfessional?.name ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ? formatPhoneBR(business.whatsapp) : "");
  const [instagram, setInstagram] = useState(business.instagramUrl ?? "");
  const [copied, setCopied] = useState(false);
  const { save, isSaving, error } = useSaveSettings((saved) => setInstagram(saved.instagramUrl ?? ""));
  const origin = useOrigin();
  const publicPath = `/${business.slug}`;
  const vertical = getVertical(business.businessType);

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
      description="Nome e contato. Aparecem na página pública e nas mensagens."
      isSaving={isSaving}
      error={error}
      onSubmit={() =>
        save("/api/admin/business", "PATCH", {
          secao: "negocio",
          name,
          address,
          whatsapp,
          instagramUrl: instagram,
          ...(soloProfessional ? { professionalName } : {}),
        })
      }
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="business-name">Nome do negócio</Label>
        <Input id="business-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
      </div>

      {soloProfessional ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="professional-name">Seu nome</Label>
          <Input
            id="professional-name"
            value={professionalName}
            onChange={(event) => setProfessionalName(event.target.value)}
            maxLength={80}
            required
            aria-describedby="professional-name-help"
          />
          <p id="professional-name-help" className="text-caption text-muted-foreground">
            Aparece para o cliente na reserva, no e-mail de confirmação e nas mensagens de WhatsApp: &quot;com{" "}
            {professionalName.trim() || "você"}&quot;.
          </p>
        </div>
      ) : null}

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
        <Input id="business-type" readOnly value={vertical.label} className="text-muted-foreground sm:w-72" aria-describedby="business-type-help" />
        <p id="business-type-help" className="text-caption text-muted-foreground">
          {soloProfessional ? (
            <>Definido na contratação: é o que faz o sistema falar &quot;{vertical.terms.service.plural}&quot;.</>
          ) : (
            <>
              Definido na contratação: é o que faz o sistema falar &quot;{vertical.terms.professional.plural}&quot; e &quot;
              {vertical.terms.service.plural}&quot;.
            </>
          )}{" "}
          Para mudar, fale com o suporte.
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
