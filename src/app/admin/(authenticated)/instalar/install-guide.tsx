"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, EllipsisVertical, Monitor, Share, Smartphone, SquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Evento do Chrome/Edge (Android e computador) que permite oferecer "Instalar" com um toque. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  const userAgent = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

const subscribeNoop = () => () => {};

/**
 * Guia de instalação: destaca o aparelho de quem está vendo e, quando o
 * navegador permite (Chrome/Edge), mostra "Instalar agora". Já aberto como
 * app, só confirma que está instalado.
 */
export function InstallGuide() {
  // Só no navegador (evita divergência com o HTML do servidor).
  const platform = useSyncExternalStore(subscribeNoop, detectPlatform, () => null);
  const isStandalone = useSyncExternalStore(
    subscribeNoop,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  if (isStandalone || installed) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
        Pronto: o painel está instalado. Procure o ícone da Aprazzo na tela inicial.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {installEvent ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">Este navegador instala com um toque.</p>
          <Button onClick={() => void install()} className="w-full sm:w-auto">
            <Download />
            Instalar agora
          </Button>
        </div>
      ) : null}

      {/* O cartão do aparelho de quem está vendo vem primeiro (no celular, sem precisar rolar). */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Guide
          order={platform === "android" ? 0 : 1}
          icon={Smartphone}
          title="Android"
          description="No Chrome"
          highlighted={platform === "android"}
          steps={[
            <>Abra o painel no <strong>Chrome</strong>.</>,
            <>
              Toque nos três pontinhos <EllipsisVertical className="inline size-4 align-text-bottom" aria-label="menu" /> no canto
              de cima.
            </>,
            <>
              Toque em <strong>Instalar app</strong> (ou <strong>Adicionar à tela inicial</strong>) e confirme.
            </>,
          ]}
        />
        <Guide
          order={platform === "ios" ? 0 : 2}
          icon={Smartphone}
          title="iPhone"
          description="No Safari (no Chrome do iPhone o caminho é o mesmo, pelo botão compartilhar)"
          highlighted={platform === "ios"}
          steps={[
            <>Abra o painel no <strong>Safari</strong>.</>,
            <>
              Toque no botão compartilhar <Share className="inline size-4 align-text-bottom" aria-label="compartilhar" /> (o
              quadrado com a seta para cima).
            </>,
            <>
              Role e toque em <strong>Adicionar à Tela de Início</strong>{" "}
              <SquarePlus className="inline size-4 align-text-bottom" aria-hidden />, depois em <strong>Adicionar</strong>.
            </>,
          ]}
        />
        <Guide
          order={platform === "desktop" ? 0 : 3}
          icon={Monitor}
          title="Computador"
          description="No Chrome ou no Edge"
          highlighted={platform === "desktop"}
          steps={[
            <>Abra o painel no Chrome ou no Edge.</>,
            <>
              Clique no ícone de instalar <Download className="inline size-4 align-text-bottom" aria-label="instalar" /> no fim da
              barra de endereço.
            </>,
            <>Confirme em <strong>Instalar</strong>: o painel abre numa janela própria.</>,
          ]}
        />
      </div>

      <p className="text-caption text-muted-foreground">
        Depois de instalado, entre uma vez com o seu e-mail e senha: a sessão continua aberta por 7 dias de uso.
      </p>
    </div>
  );
}

const ORDER_CLASSES = ["order-first", "order-1", "order-2", "order-3"] as const;

function Guide({
  order,
  icon: Icon,
  title,
  description,
  steps,
  highlighted,
}: {
  order: number;
  icon: typeof Smartphone;
  title: string;
  description: string;
  steps: React.ReactNode[];
  highlighted: boolean;
}) {
  return (
    <Card className={cn(ORDER_CLASSES[order], highlighted && "ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-section-title">
          <Icon className="size-5 text-primary" aria-hidden />
          {title}
          {highlighted ? <span className="text-caption font-normal text-primary">· seu aparelho</span> : null}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3 text-sm">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
