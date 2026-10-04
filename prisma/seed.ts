import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Weekday, AppointmentStatus, PaymentMethod } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  await prisma.staffInvite.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.professionalPhoto.deleteMany();
  await prisma.timeBlock.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const business = await prisma.business.create({
    data: {
      name: "Barbearia Navalha de Ouro",
      slug: "navalha-de-ouro",
      timezone: "America/Sao_Paulo",
      address: "Rua das Tesouras, 123 - São Paulo/SP",
      accentColor: "#4F46E5",
      businessType: "barbershop",
      whatsapp: "11988880000",
      instagramUrl: "https://instagram.com/navalhadeouro",
      policyText: "Cancelamentos com menos de 2 horas de antecedência podem ser cobrados. Chegue com 10 minutos de antecedência.",
      cancellationDeadlineHours: 2,
      // Informativo (página pública); a disponibilidade vem do expediente de cada barbeiro.
      workingHours: {
        create: [
          ...[Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY].map((weekday) => ({
            weekday,
            startMinute: 9 * 60,
            endMinute: 19 * 60,
          })),
          { weekday: Weekday.SATURDAY, startMinute: 9 * 60, endMinute: 17 * 60 },
        ],
      },
      users: {
        create: {
          email: "dono@navalhadeouro.com",
          name: "Carlos Dono",
          passwordHash: await bcrypt.hash("senha123", 10),
        },
      },
    },
  });

  const [categoriaCabelo, categoriaBarba] = await Promise.all([
    prisma.serviceCategory.create({ data: { businessId: business.id, name: "Cabelo", position: 0 } }),
    prisma.serviceCategory.create({ data: { businessId: business.id, name: "Barba", position: 1 } }),
  ]);

  const [corte, barba, comboCorteBarba, coloracao] = await Promise.all([
    prisma.service.create({
      data: {
        businessId: business.id,
        categoryId: categoriaCabelo.id,
        name: "Corte de cabelo",
        description: "Corte tradicional na tesoura ou máquina",
        durationMin: 30,
        priceCents: 5000,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        categoryId: categoriaBarba.id,
        name: "Barba",
        description: "Barba feita na navalha com toalha quente",
        durationMin: 20,
        priceCents: 3500,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        categoryId: categoriaCabelo.id,
        name: "Combo corte + barba",
        description: "Corte de cabelo e barba com desconto",
        durationMin: 50,
        priceCents: 7500,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        categoryId: categoriaCabelo.id,
        name: "Coloração",
        description: "Coloração completa, valor varia conforme o comprimento",
        durationMin: 90,
        priceCents: 8000,
        priceType: "FROM",
      },
    }),
  ]);

  const weekdayWorkingHours = [
    Weekday.MONDAY,
    Weekday.TUESDAY,
    Weekday.WEDNESDAY,
    Weekday.THURSDAY,
    Weekday.FRIDAY,
  ];

  const joao = await prisma.professional.create({
    data: {
      businessId: business.id,
      name: "João Barbeiro",
      specialty: "Cortes clássicos e degradê",
      color: "blue",
      commissionPercent: 40,
      bio: "Especialista em cortes clássicos",
      workingHours: {
        create: weekdayWorkingHours.map((weekday) => ({
          weekday,
          startMinute: 9 * 60,
          endMinute: 18 * 60,
          breakStartMinute: 12 * 60,
          breakEndMinute: 13 * 60,
        })),
      },
      professionalServices: {
        create: [
          { serviceId: corte.id },
          { serviceId: barba.id },
          { serviceId: comboCorteBarba.id },
        ],
      },
      photos: {
        create: [
          { url: "https://picsum.photos/seed/joao-corte-1/400/400", position: 0 },
          { url: "https://picsum.photos/seed/joao-corte-2/400/400", position: 1 },
        ],
      },
    },
  });

  // Acesso do João ao painel como profissional (só a agenda e os clientes dele).
  await prisma.user.create({
    data: {
      businessId: business.id,
      email: "joao@navalhadeouro.com",
      name: "João Barbeiro",
      passwordHash: await bcrypt.hash("senha123", 10),
      role: "PROFESSIONAL",
      professionalId: joao.id,
    },
  });

  const marcos = await prisma.professional.create({
    data: {
      businessId: business.id,
      name: "Marcos Estilista",
      specialty: "Barba e acabamento",
      color: "orange",
      commissionPercent: 50,
      bio: "Focado em barba e acabamento",
      workingHours: {
        create: [Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY].map(
          (weekday) => ({
            weekday,
            startMinute: 10 * 60,
            // Sábado o negócio fecha às 17:00: o expediente cabe no horário de funcionamento.
            endMinute: weekday === Weekday.SATURDAY ? 17 * 60 : 19 * 60,
            breakStartMinute: 13 * 60,
            breakEndMinute: 14 * 60,
          }),
        ),
      },
      professionalServices: {
        create: [{ serviceId: barba.id }, { serviceId: comboCorteBarba.id }],
      },
      photos: {
        create: [
          { url: "https://picsum.photos/seed/marcos-barba-1/400/400", position: 0 },
          { url: "https://picsum.photos/seed/marcos-barba-2/400/400", position: 1 },
        ],
      },
    },
  });

  await prisma.timeBlock.create({
    data: {
      professionalId: joao.id,
      startAt: new Date("2026-10-12T00:00:00-03:00"),
      endAt: new Date("2026-10-13T00:00:00-03:00"),
      reason: "Feriado - folga",
    },
  });

  const clienteMaria = await prisma.client.create({
    data: {
      businessId: business.id,
      name: "Maria Cliente",
      phone: "11988887777",
      email: "maria@example.com",
    },
  });

  const clientePedro = await prisma.client.create({
    data: {
      businessId: business.id,
      name: "Pedro Cliente",
      phone: "11977776666",
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: joao.id,
      serviceId: corte.id,
      clientId: clienteMaria.id,
      startAt: new Date("2026-09-25T10:00:00-03:00"),
      endAt: new Date("2026-09-25T10:30:00-03:00"),
      status: AppointmentStatus.CONFIRMED,
      priceCents: corte.priceCents,
    },
  });

  // Concluído e pago no PIX (comissão do Marcos congelada em 50%).
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: marcos.id,
      serviceId: barba.id,
      clientId: clientePedro.id,
      startAt: new Date("2026-09-20T14:00:00-03:00"),
      endAt: new Date("2026-09-20T14:20:00-03:00"),
      status: AppointmentStatus.COMPLETED,
      priceCents: barba.priceCents,
      review: {
        create: {
          rating: 5,
          comment: "Ótimo atendimento, recomendo!",
        },
      },
      payments: {
        create: {
          businessId: business.id,
          amountCents: 3500,
          method: PaymentMethod.PIX,
          receivedAt: new Date("2026-09-20T14:25:00-03:00"),
          commissionPercent: 50,
        },
      },
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: joao.id,
      serviceId: comboCorteBarba.id,
      clientId: clientePedro.id,
      startAt: new Date("2026-09-18T09:00:00-03:00"),
      endAt: new Date("2026-09-18T09:50:00-03:00"),
      status: AppointmentStatus.NO_SHOW,
      priceCents: comboCorteBarba.priceCents,
    },
  });

  // Concluído, pago em dinheiro com R$ 5,00 de desconto.
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: joao.id,
      serviceId: corte.id,
      clientId: clienteMaria.id,
      startAt: new Date("2026-09-15T11:00:00-03:00"),
      endAt: new Date("2026-09-15T11:30:00-03:00"),
      status: AppointmentStatus.COMPLETED,
      priceCents: corte.priceCents,
      payments: {
        create: {
          businessId: business.id,
          amountCents: 4500,
          discountCents: 500,
          method: PaymentMethod.CASH,
          receivedAt: new Date("2026-09-15T11:35:00-03:00"),
          commissionPercent: 40,
        },
      },
    },
  });

  // Concluído com sinal no PIX e saldo ainda em aberto (parcial → "a receber").
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: joao.id,
      serviceId: comboCorteBarba.id,
      clientId: clienteMaria.id,
      startAt: new Date("2026-09-22T15:00:00-03:00"),
      endAt: new Date("2026-09-22T15:50:00-03:00"),
      status: AppointmentStatus.COMPLETED,
      priceCents: comboCorteBarba.priceCents,
      payments: {
        create: {
          businessId: business.id,
          amountCents: 3000,
          method: PaymentMethod.PIX,
          receivedAt: new Date("2026-09-21T19:00:00-03:00"),
          note: "Sinal",
          commissionPercent: 40,
        },
      },
    },
  });

  // Concluído sem nenhum pagamento registrado (alerta "concluídos sem pagamento").
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: marcos.id,
      serviceId: comboCorteBarba.id,
      clientId: clienteMaria.id,
      startAt: new Date("2026-09-23T16:00:00-03:00"),
      endAt: new Date("2026-09-23T16:50:00-03:00"),
      status: AppointmentStatus.COMPLETED,
      priceCents: comboCorteBarba.priceCents,
    },
  });

  console.log("Seed concluído:", {
    business: business.slug,
    professionals: [joao.name, marcos.name],
    services: [corte.name, barba.name, comboCorteBarba.name, coloracao.name],
    categories: [categoriaCabelo.name, categoriaBarba.name],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
