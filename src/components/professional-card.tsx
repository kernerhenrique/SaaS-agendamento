import { Award } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SelectableCard } from "@/components/selectable-card";
import { getInitials } from "@/lib/text";

/**
 * Cartão do profissional no fluxo público de reserva. A especialidade vem com
 * rótulo ("Especialidade: …"): solta embaixo do nome parecia a lista do que
 * ele atende, e quem atende o quê já é decidido pelo serviço escolhido.
 */
export function ProfessionalCard({
  name,
  photoUrl,
  specialty,
  portfolioUrls,
  onSelect,
}: {
  name: string;
  photoUrl?: string | null;
  specialty?: string | null;
  portfolioUrls?: string[];
  onSelect: () => void;
}) {
  const thumbnails = (portfolioUrls ?? []).slice(0, 3);

  return (
    <SelectableCard onSelect={onSelect}>
      <div className="flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={photoUrl ?? undefined} alt="" />
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <p className="font-medium">{name}</p>
          {specialty ? (
            <p className="flex items-center gap-1 text-caption text-muted-foreground">
              <Award className="size-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-1">
                <span className="font-medium">Especialidade:</span> {specialty}
              </span>
            </p>
          ) : null}
        </div>
      </div>
      {thumbnails.length > 0 ? (
        <div className="flex gap-1.5">
          {thumbnails.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element -- portfólio vem de URL externa arbitrária, sem domínio fixo para configurar no next/image
            <img key={url} src={url} alt="" className="size-12 rounded-md object-cover" />
          ))}
        </div>
      ) : null}
    </SelectableCard>
  );
}
