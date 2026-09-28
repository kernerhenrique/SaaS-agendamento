"use client";

import { useState } from "react";
import {
  Ban,
  CalendarClock,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Scissors,
  Trash2,
  Trophy,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { BookingTimeNotice } from "@/components/admin/booking-time-notice";
import { PaymentIndicator } from "@/components/admin/payment-indicator";
import { MoneyInput } from "@/components/money-input";
import { ProfessionalAvatar } from "@/components/admin/professional-avatar";
import { PROFESSIONAL_COLORS } from "@/lib/professional-colors";
import { NewAppointmentButton } from "@/components/admin/new-appointment-button";
import { useAdminShell } from "@/components/admin/admin-shell-context";
import { DetailDrawerContent } from "@/components/detail-drawer";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { ProfessionalCard } from "@/components/professional-card";
import { ServiceCard } from "@/components/service-card";
import { CardSkeleton, TableRowsSkeleton } from "@/components/skeletons";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Stepper } from "@/components/stepper";
import { TableToolbar } from "@/components/table-toolbar";
import { TimeSlotGrid } from "@/components/time-slot-grid";
import { STATUS_BLOCK_CLASSES, STATUS_LABELS } from "@/lib/appointment-status";

const APPOINTMENT_TONES: { tone: StatusTone; label: string }[] = [
  { tone: "scheduled", label: "Agendado" },
  { tone: "confirmed", label: "Confirmado" },
  { tone: "completed", label: "Concluído" },
  { tone: "no-show", label: "Faltou" },
  { tone: "cancelled", label: "Cancelado" },
];

const PAYMENT_TONES: { tone: StatusTone; label: string }[] = [
  { tone: "pending", label: "Pendente" },
  { tone: "partial", label: "Parcial" },
  { tone: "paid", label: "Pago" },
];

const RADIUS_SWATCHES: { className: string; label: string }[] = [
  { className: "rounded-sm", label: "radius-sm" },
  { className: "rounded-md", label: "radius-md" },
  { className: "rounded-lg", label: "radius-lg" },
  { className: "rounded-xl", label: "radius-xl" },
  { className: "rounded-2xl", label: "radius-2xl" },
  { className: "rounded-3xl", label: "radius-3xl" },
  { className: "rounded-4xl", label: "radius-4xl" },
];

const COLOR_SWATCHES: { className: string; label: string; token: string }[] = [
  { className: "bg-primary", label: "Primary", token: "--primary (cor de marca do negócio)" },
  { className: "bg-secondary", label: "Secondary", token: "--secondary" },
  { className: "bg-muted", label: "Muted", token: "--muted" },
  { className: "bg-accent", label: "Accent", token: "--accent" },
  { className: "bg-destructive", label: "Destructive", token: "--destructive" },
  { className: "bg-success", label: "Success", token: "--success" },
  { className: "bg-warning", label: "Warning", token: "--warning" },
  { className: "bg-info", label: "Info", token: "--info" },
];

export default function DesignSystemPage() {
  const [demoCents, setDemoCents] = useState(4500);
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-page-title font-bold">Design system</h1>
        <p className="text-sm text-muted-foreground">
          Style guide vivo dos tokens e componentes de domínio do projeto base. Detalhes e regras de uso em{" "}
          <code className="text-caption">docs/design-system.md</code>.
        </p>
      </div>

      <Tabs defaultValue="cores">
        <TabsList>
          <TabsTrigger value="cores">Cores</TabsTrigger>
          <TabsTrigger value="tipografia">Tipografia &amp; sombra</TabsTrigger>
          <TabsTrigger value="componentes">Componentes</TabsTrigger>
        </TabsList>

        <TabsContent value="cores" className="flex flex-col gap-8 pt-4">
          <Section title="Cores base e semânticas">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {COLOR_SWATCHES.map((swatch) => (
                <div key={swatch.label} className="flex flex-col gap-1.5">
                  <div className={`h-16 rounded-lg ${swatch.className}`} />
                  <p className="text-sm font-medium">{swatch.label}</p>
                  <p className="text-caption text-muted-foreground">{swatch.token}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Status de agendamento" description="Badge suave (bg/10 + texto), tokens --status-*.">
            <div className="flex flex-wrap gap-2">
              {APPOINTMENT_TONES.map(({ tone, label }) => (
                <StatusBadge key={tone} tone={tone}>
                  {label}
                </StatusBadge>
              ))}
            </div>
          </Section>

          <Section
            title="Blocos da agenda"
            description="Fundo suave opaco + faixa na cor do status (STATUS_BLOCK_CLASSES). Bloqueio hachurado não aceita arrastar."
          >
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(STATUS_BLOCK_CLASSES) as (keyof typeof STATUS_BLOCK_CLASSES)[]).map((status) => (
                <div
                  key={status}
                  className={`flex flex-col rounded-md px-2 py-1 text-caption leading-tight shadow-sm ${STATUS_BLOCK_CLASSES[status]}`}
                >
                  <span className="font-semibold">09:00–09:30</span>
                  <span>Cliente exemplo · {STATUS_LABELS[status]}</span>
                </div>
              ))}
              <div
                className="flex items-center gap-1 rounded-md px-2 py-1 text-caption text-muted-foreground ring-1 ring-border"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--color-muted), var(--color-muted) 6px, transparent 6px, transparent 12px)",
                }}
              >
                <Ban className="size-3" /> Almoço (bloqueio)
              </div>
            </div>
          </Section>

          <Section
            title="Valor em reais e pagamento (MoneyInput, PaymentIndicator)"
            description="MoneyInput guarda centavos e digita como maquininha. PaymentIndicator marca concluídos na agenda: pago ou falta receber."
          >
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex w-48 flex-col gap-1.5">
                <span className="text-sm font-medium">Valor recebido</span>
                <MoneyInput aria-label="Exemplo de valor" valueCents={demoCents} onValueChange={setDemoCents} />
              </div>
              <span className="flex items-center gap-2 text-sm">
                <PaymentIndicator status="PAID" /> Pago
              </span>
              <span className="flex items-center gap-2 text-sm">
                <PaymentIndicator status="PARTIAL" /> Falta receber
              </span>
            </div>
          </Section>

          <Section
            title="Cor do profissional (ProfessionalAvatar)"
            description="Paleta fixa --pro-* (Professional.color guarda só a chave). Anel no avatar: cards, perfil e cabeçalho da agenda."
          >
            <div className="flex flex-wrap items-center gap-4">
              {PROFESSIONAL_COLORS.map((color) => (
                <div key={color.key} className="flex flex-col items-center gap-1">
                  <ProfessionalAvatar name={color.label} photoUrl={null} color={color.key} />
                  <span className="text-caption text-muted-foreground">{color.label}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <ProfessionalAvatar name="Sem cor" photoUrl={null} color={null} />
                <span className="text-caption text-muted-foreground">Sem cor</span>
              </div>
            </div>
          </Section>

          <Section
            title="Aviso de horário (BookingTimeNotice)"
            description="Formulários do painel: passado bloqueia o envio; fora do expediente só avisa e o botão vira 'mesmo assim'."
          >
            <div className="flex max-w-md flex-col gap-3">
              <BookingTimeNotice professionalName="Ana" isPast={false} isOutsideHours workingHours={null} />
              <BookingTimeNotice
                professionalName="Ana"
                isPast={false}
                isOutsideHours
                workingHours={{ startMinute: 540, endMinute: 1080, breakStartMinute: 720, breakEndMinute: 780 }}
              />
              <BookingTimeNotice professionalName="Ana" isPast isOutsideHours={false} workingHours={null} />
            </div>
          </Section>

          <Section title="Status de pagamento" description="Módulo Financeiro (Fase 4) — tokens --payment-*.">
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TONES.map(({ tone, label }) => (
                <StatusBadge key={tone} tone={tone}>
                  {label}
                </StatusBadge>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="tipografia" className="flex flex-col gap-8 pt-4">
          <Section title="Escala de tipografia">
            <div className="flex flex-col gap-3">
              <p className="text-display font-bold">Display — text-display</p>
              <p className="text-page-title font-bold">Título de página — text-page-title</p>
              <p className="text-section-title font-semibold">Título de seção — text-section-title</p>
              <p className="text-base">Corpo de texto padrão — text-base</p>
              <p className="text-sm text-muted-foreground">Corpo secundário — text-sm</p>
              <p className="text-caption text-muted-foreground uppercase">Legenda / meta — text-caption</p>
            </div>
          </Section>

          <Section title="Raio (radius)">
            <div className="flex flex-wrap items-end gap-4">
              {RADIUS_SWATCHES.map(({ className, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className={`size-14 bg-primary/15 ring-1 ring-primary/30 ${className}`} />
                  <p className="text-caption text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Sombra"
            description="Elevação padrão vem da escala do Tailwind (shadow-sm…shadow-2xl). --shadow-fixed-bar é a única sombra nomeada extra, para elementos fixos flutuantes (ex.: resumo fixo no rodapé mobile)."
          >
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <div className="size-16 rounded-lg bg-card shadow-sm" />
                <p className="text-caption text-muted-foreground">shadow-sm</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="size-16 rounded-lg bg-card shadow-lg" />
                <p className="text-caption text-muted-foreground">shadow-lg</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="size-16 rounded-lg bg-card shadow-fixed-bar" />
                <p className="text-caption text-muted-foreground">shadow-fixed-bar</p>
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="componentes" className="flex flex-col gap-8 pt-4">
          <ShellSection />

          <Section title="Botões">
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </Section>

          <Section title="Toasts (Sonner)" description="Provider já registrado em src/app/layout.tsx.">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success("Agendamento salvo com sucesso.")}>
                Success
              </Button>
              <Button variant="outline" onClick={() => toast.warning("Horário perto do fim do expediente.")}>
                Warning
              </Button>
              <Button variant="outline" onClick={() => toast.info("Um novo agendamento chegou.")}>
                Info
              </Button>
              <Button variant="outline" onClick={() => toast.error("Não foi possível salvar. Tente de novo.")}>
                Error
              </Button>
            </div>
          </Section>

          <Section title="Card de KPI">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard icon={CalendarClock} label="Agendamentos" value="128" />
              <KpiCard icon={XCircle} label="Taxa de cancelamento" value="4,2%" />
              <KpiCard icon={UserX} label="Taxa de no-show" value="1,8%" />
              <KpiCard icon={Trophy} label="Mais requisitado" value="João Barbeiro (52)" />
            </div>
          </Section>

          <Section title="Stepper">
            <Stepper steps={["Serviço", "Profissional", "Horário", "Contato"]} currentStep={2} />
          </Section>

          <Section title="Card de serviço e de profissional" description="Extraídos do fluxo público de reserva.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ServiceCard
                name="Corte de cabelo"
                description="Corte tradicional na tesoura ou máquina"
                durationMin={30}
                priceCents={5000}
                onSelect={() => {}}
              />
              <ProfessionalCard
                name="João Barbeiro"
                specialty="Cortes clássicos e degradê"
                onSelect={() => {}}
              />
            </div>
          </Section>

          <Section title="Grade de horários (manhã/tarde/noite)">
            <TimeSlotGrid
              slots={[
                { key: "9h", label: "09:00", minutesFromMidnight: 9 * 60 },
                { key: "10h", label: "10:00", minutesFromMidnight: 10 * 60 },
                { key: "14h", label: "14:00", minutesFromMidnight: 14 * 60 },
                { key: "19h", label: "19:00", minutesFromMidnight: 19 * 60 },
              ]}
              onSelect={() => {}}
            />
          </Section>

          <Section title="Empty state">
            <EmptyState
              icon={Inbox}
              title="Nenhum cliente cadastrado ainda"
              description="Clientes aparecem aqui automaticamente após a primeira reserva."
              action={
                <Button size="sm">
                  <Plus /> Novo cliente
                </Button>
              }
            />
          </Section>

          <Section title="Skeletons de carregamento">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <TableRowsSkeleton rows={3} columns={4} />
            </div>
          </Section>

          <Section title="Tabela com filtro" description="Table (shadcn) + TableToolbar.">
            <TableDemo />
          </Section>

          <Section title="Drawer de detalhes" description="Detalhe de registro abre em drawer, não em modal.">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>Ver detalhes do agendamento</SheetTrigger>
              <DetailDrawerContent
                title="Corte de cabelo — Maria Cliente"
                description="Sexta-feira, 25 de setembro às 10:00"
                footer={<Button className="w-full">Fechar</Button>}
              >
                <div className="flex flex-col gap-3 py-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Profissional:</span> João Barbeiro
                  </p>
                  <p>
                    <span className="text-muted-foreground">Duração:</span> 30min
                  </p>
                  <StatusBadge tone="confirmed">Confirmado</StatusBadge>
                </div>
              </DetailDrawerContent>
            </Sheet>
          </Section>

          <Section title="Tooltip, popover e menu de ações">
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                  <Scissors />
                </TooltipTrigger>
                <TooltipContent>Editar serviço</TooltipContent>
              </Tooltip>

              <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>Filtrar período</PopoverTrigger>
                <PopoverContent className="flex flex-col gap-2 text-sm">
                  <p className="font-medium">Período do relatório</p>
                  <p className="text-muted-foreground">Conteúdo de exemplo — data range viria aqui.</p>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">
                    <Trash2 /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ShellSection() {
  const { openSearch } = useAdminShell();
  return (
    <Section
      title="Shell do painel"
      description="Menu lateral recolhível (preferência em cookie), navegação inferior no celular, busca global Ctrl+K e novo agendamento acessível de qualquer tela (src/components/admin/)."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={openSearch}>
          Abrir busca (Ctrl+K)
        </Button>
        <NewAppointmentButton variant="outline" />
      </div>
    </Section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-section-title font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

const MOCK_CLIENTS = [
  { name: "Maria Cliente", phone: "(11) 99999-0001", visits: 12 },
  { name: "Carlos Souza", phone: "(11) 99999-0002", visits: 3 },
  { name: "Ana Paula", phone: "(11) 99999-0003", visits: 7 },
];

function TableDemo() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CLIENTS.filter((client) => client.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <TableToolbar searchPlaceholder="Buscar cliente..." searchValue={search} onSearchChange={setSearch} />
      <Card size="sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Visitas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
              <TableRow key={client.phone}>
                <TableCell className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {client.name}
                </TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.visits}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
