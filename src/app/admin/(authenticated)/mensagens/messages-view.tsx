"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, HeartHandshake } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MessageTemplateDto } from "@/server/modules/notification/whatsapp/message.service";
import type { TemplateValues } from "@/server/modules/notification/whatsapp/templates";

import { MessageQueueList } from "./message-queue";
import { TemplateEditor } from "./template-editor";

export type MessagesTab = "lembretes" | "pos-atendimento" | "modelos";

/**
 * Mensagens pelo WhatsApp: listas para enviar um a um (lembretes de um dia e
 * pós-atendimento) e os modelos de texto. A aba fica na URL (?aba=).
 */
export function MessagesView({
  timezone,
  templates,
  sample,
  initialTab,
}: {
  timezone: string;
  /** null = sem permissão para editar modelos (profissional): a aba some. */
  templates: MessageTemplateDto[] | null;
  sample: TemplateValues;
  initialTab: MessagesTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<MessagesTab>(initialTab);

  function changeTab(next: MessagesTab) {
    setTab(next);
    router.replace(`${pathname}?aba=${next}`, { scroll: false });
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-page-title font-bold">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Textos prontos para o WhatsApp. Toque em enviar, confira no WhatsApp e envie de lá.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => changeTab(value as MessagesTab)}>
        <TabsList>
          <TabsTrigger value="lembretes">Lembretes</TabsTrigger>
          <TabsTrigger value="pos-atendimento">Pós-atendimento</TabsTrigger>
          {templates ? <TabsTrigger value="modelos">Modelos</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="lembretes" className="mt-4">
          <MessageQueueList
            queue="lembretes"
            timezone={timezone}
            sendLabel="Enviar lembrete"
            emptyIcon={BellRing}
            emptyTitle="Nenhum agendamento neste dia"
            emptyDescription="Use as setas para ver outro dia. A lista abre sozinha no próximo dia com horário marcado."
          />
        </TabsContent>

        <TabsContent value="pos-atendimento" className="mt-4">
          <MessageQueueList
            queue="pos-atendimento"
            timezone={timezone}
            sendLabel="Agradecer"
            emptyIcon={HeartHandshake}
            emptyTitle="Nenhum atendimento concluído ontem ou hoje"
            emptyDescription="Ao concluir um atendimento na agenda, ele aparece aqui para você agradecer e convidar para voltar."
          />
        </TabsContent>

        {templates ? (
          <TabsContent value="modelos" className="mt-4 flex flex-col gap-5">
            {templates.map((template) => (
              <TemplateEditor key={template.kind} template={template} sample={sample} />
            ))}
          </TabsContent>
        ) : null}
      </Tabs>
    </main>
  );
}
