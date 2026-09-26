import type { ReactNode } from "react";

import { SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Corpo padrão de um drawer de detalhe de registro (regra do design system:
 * detalhe abre em drawer, modal só para confirmação/ação curta). Compor com
 * `Sheet`/`SheetTrigger` do jeito já usado no projeto para diálogos, ex.:
 *
 * <Sheet>
 *   <SheetTrigger render={<Button />}>Ver detalhes</SheetTrigger>
 *   <DetailDrawerContent title="Agendamento" footer={<Button>Fechar</Button>}>
 *     ...
 *   </DetailDrawerContent>
 * </Sheet>
 */
export function DetailDrawerContent({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        {description ? <SheetDescription>{description}</SheetDescription> : null}
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4">{children}</div>
      {footer ? <SheetFooter>{footer}</SheetFooter> : null}
    </SheetContent>
  );
}
