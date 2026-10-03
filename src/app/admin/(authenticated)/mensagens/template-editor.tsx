"use client";

import { useRef, useState } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVertical } from "@/config/vertical-context";
import type { MessageTemplateDto } from "@/server/modules/notification/whatsapp/message.service";
import {
  DEFAULT_TEMPLATES,
  MAX_TEMPLATE_LENGTH,
  MESSAGE_KIND_DESCRIPTIONS,
  MESSAGE_KIND_LABELS,
  TEMPLATE_VARIABLES,
  renderTemplate,
  unknownVariables,
  type TemplateValues,
  type TemplateVariable,
} from "@/server/modules/notification/whatsapp/templates";

/**
 * Editor de um modelo de mensagem: variáveis como chips (inserem no cursor),
 * aviso de variável que não existe e prévia com dados do próprio negócio.
 */
export function TemplateEditor({
  template,
  sample,
  demo = false,
}: {
  template: MessageTemplateDto;
  sample: TemplateValues;
  /** Style guide: não grava nada, só avisa. */
  demo?: boolean;
}) {
  const { terms } = useVertical();
  const [saved, setSaved] = useState(template);
  const [body, setBody] = useState(template.body);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = `template-${template.kind.toLowerCase()}`;
  const unknown = unknownVariables(body);
  const dirty = body !== saved.body;

  const labels: Record<TemplateVariable, string> = {
    cliente: "Nome completo",
    primeiro_nome: "Primeiro nome",
    servico: terms.service.singular,
    profissional: terms.professional.singular,
    data: "Data",
    hora: "Hora",
    negocio: "Nome do negócio",
    endereco: "Endereço",
    link: "Link do agendamento",
    link_reserva: "Link para reservar",
  };

  function insertVariable(variable: TemplateVariable) {
    const textarea = textareaRef.current;
    const token = `{${variable}}`;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function request(method: "PUT" | "DELETE") {
    if (demo) {
      toast.info("Demonstração: nada foi salvo.");
      setIsConfirmingReset(false);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(
        method === "PUT" ? "/api/admin/messages/templates" : `/api/admin/messages/templates?kind=${template.kind}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "PUT" ? JSON.stringify({ kind: template.kind, body }) : undefined,
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível salvar");
        return;
      }
      const next = data.template as MessageTemplateDto;
      setSaved(next);
      setBody(next.body);
      toast.success(method === "PUT" ? "Modelo salvo" : "Modelo padrão restaurado");
    } catch {
      toast.error("Sem conexão. Tente de novo.");
    } finally {
      setIsSaving(false);
      setIsConfirmingReset(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-section-title">
          {MESSAGE_KIND_LABELS[template.kind]}
          {saved.isCustom ? <Badge variant="secondary">Personalizado</Badge> : <Badge variant="outline">Padrão</Badge>}
        </CardTitle>
        <CardDescription>{MESSAGE_KIND_DESCRIPTIONS[template.kind]}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>Texto</Label>
          <Textarea
            ref={textareaRef}
            id={id}
            rows={8}
            maxLength={MAX_TEMPLATE_LENGTH}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-describedby={`${id}-help`}
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Inserir informação">
            {TEMPLATE_VARIABLES.map((variable) => (
              <Button key={variable} type="button" variant="outline" size="xs" onClick={() => insertVariable(variable)}>
                + {labels[variable]}
              </Button>
            ))}
          </div>
          <p id={`${id}-help`} className="text-caption text-muted-foreground">
            Toque numa informação para colocar no texto. Linha com informação vazia (ex.: endereço não cadastrado) some da
            mensagem.
          </p>
          {unknown.length > 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {unknown.map((name) => `{${name}}`).join(", ")} não existe e vai aparecer assim na mensagem.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Prévia</p>
          <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{renderTemplate(body, sample) || "—"}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t">
        {error ? (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved.isCustom || body !== DEFAULT_TEMPLATES[template.kind] ? (
          <Button type="button" variant="ghost" disabled={isSaving} onClick={() => (saved.isCustom ? setIsConfirmingReset(true) : setBody(saved.body))}>
            <RotateCcw />
            {saved.isCustom ? "Restaurar padrão" : "Desfazer"}
          </Button>
        ) : null}
        <Button type="button" disabled={!dirty || isSaving} onClick={() => void request("PUT")}>
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </CardFooter>

      <Dialog open={isConfirmingReset} onOpenChange={setIsConfirmingReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar o texto padrão?</DialogTitle>
            <DialogDescription>
              O texto personalizado de &quot;{MESSAGE_KIND_LABELS[template.kind]}&quot; será substituído pelo padrão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingReset(false)}>
              Voltar
            </Button>
            <Button disabled={isSaving} onClick={() => void request("DELETE")}>
              Restaurar padrão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
