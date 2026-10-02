import { NextRequest, NextResponse } from "next/server";

import { getAvailableSlots } from "@/server/modules/appointment/availability";
import { getOccupiedSlotTimes } from "@/server/modules/appointment/occupied-slots";
import { NotFoundError, ValidationError } from "@/server/errors";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const businessId = searchParams.get("businessId");
  const serviceId = searchParams.get("serviceId");
  const professionalId = searchParams.get("professionalId") ?? undefined;
  const date = searchParams.get("date");

  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: businessId, serviceId, date" },
      { status: 400 },
    );
  }
  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { error: "Parâmetro 'date' inválido, use o formato YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const params = { businessId, serviceId, professionalId, dateISO: date };
    const slots = await getAvailableSlots(params);
    // `?ocupados=1`: também os horários ocupados (só para exibir desabilitados;
    // nunca entram na reserva, que revalida pelos livres).
    const occupied = searchParams.get("ocupados") === "1" ? await getOccupiedSlotTimes(params, slots) : undefined;
    return NextResponse.json({
      slots: slots.map((slot) => ({
        professionalId: slot.professionalId,
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
      })),
      ...(occupied ? { occupied } : {}),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
