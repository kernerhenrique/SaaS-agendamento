import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { requirePermission } from "@/server/modules/auth/session";
import { IMAGE_KINDS, uploadBusinessImage, type ImageKind } from "@/server/modules/business/business-images";
import { assertNotDemo } from "@/server/modules/demo/demo.service";

/**
 * Envia logo ou capa (multipart: `tipo` = logo|capa, `arquivo`). Devolve o link;
 * a imagem só vale depois do "Salvar" da Identidade (PATCH /api/admin/business).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("settings.manage");
    await assertNotDemo(session.businessId);
    const form = await request.formData().catch(() => null);
    const kind = form?.get("tipo");
    const file = form?.get("arquivo");
    if (typeof kind !== "string" || !IMAGE_KINDS.includes(kind as ImageKind)) throw new ValidationError("Tipo de imagem inválido");
    if (!(file instanceof File)) throw new ValidationError("Escolha um arquivo de imagem");
    const business = await prisma.business.findUniqueOrThrow({ where: { id: session.businessId }, select: { slug: true } });
    const url = await uploadBusinessImage(business.slug, kind as ImageKind, file);
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
