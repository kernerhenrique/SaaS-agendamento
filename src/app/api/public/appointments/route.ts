import { NextRequest, NextResponse } from "next/server";

import { ValidationError } from "@/server/errors";
import { handleApiError } from "@/server/http";
import { createPublicAppointment } from "@/server/modules/appointment/appointment.service";
import { sendAppointmentConfirmationEmail } from "@/server/modules/appointment/confirmation-email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const record = body as Record<string, unknown> | null;

    const businessId = record?.businessId;
    const professionalId = record?.professionalId;
    const serviceId = record?.serviceId;
    const startAtRaw = record?.startAt;
    const client = record?.client as Record<string, unknown> | undefined;

    if (
      typeof businessId !== "string" ||
      typeof professionalId !== "string" ||
      typeof serviceId !== "string"
    ) {
      throw new ValidationError("businessId, professionalId e serviceId são obrigatórios");
    }
    if (typeof startAtRaw !== "string") {
      throw new ValidationError("startAt é obrigatório (ISO 8601)");
    }
    const startAt = new Date(startAtRaw);
    if (Number.isNaN(startAt.getTime())) {
      throw new ValidationError("startAt inválido");
    }
    if (
      typeof client?.name !== "string" ||
      !client.name.trim() ||
      typeof client?.phone !== "string" ||
      !client.phone.trim() ||
      typeof client?.email !== "string" ||
      !client.email.trim()
    ) {
      throw new ValidationError("client.name, client.phone e client.email são obrigatórios");
    }

    const appointment = await createPublicAppointment({
      businessId,
      professionalId,
      serviceId,
      startAt,
      client: { name: client.name, phone: client.phone, email: client.email },
    });

    // O e-mail é uma notificação, não a fonte da verdade: se o envio falhar
    // (ex. credenciais do Gmail não configuradas), o agendamento já foi
    // criado com sucesso e a resposta deve refletir isso mesmo assim.
    try {
      await sendAppointmentConfirmationEmail({
        clientName: appointment.client.name,
        clientEmail: client.email,
        businessName: appointment.business.name,
        serviceName: appointment.service.name,
        professionalName: appointment.professional.name,
        startAt: appointment.startAt,
        timezone: appointment.business.timezone,
        manageToken: appointment.manageToken,
      });
    } catch (emailError) {
      console.error("[appointments] falha ao enviar e-mail de confirmação", emailError);
    }

    return NextResponse.json(
      {
        appointment: {
          id: appointment.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          manageToken: appointment.manageToken,
          service: { name: appointment.service.name },
          professional: { name: appointment.professional.name },
          business: { name: appointment.business.name, timezone: appointment.business.timezone },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
