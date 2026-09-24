import bcrypt from "bcryptjs";
import { PrismaClient, Weekday, AppointmentStatus } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.timeBlock.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.service.deleteMany();
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
      users: {
        create: {
          email: "dono@navalhadeouro.com",
          name: "Carlos Dono",
          passwordHash: await bcrypt.hash("senha123", 10),
        },
      },
    },
  });

  const [corte, barba, comboCorteBarba] = await Promise.all([
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Corte de cabelo",
        description: "Corte tradicional na tesoura ou máquina",
        durationMin: 30,
        priceCents: 5000,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Barba",
        description: "Barba feita na navalha com toalha quente",
        durationMin: 20,
        priceCents: 3500,
      },
    }),
    prisma.service.create({
      data: {
        businessId: business.id,
        name: "Combo corte + barba",
        description: "Corte de cabelo e barba com desconto",
        durationMin: 50,
        priceCents: 7500,
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
    },
  });

  const marcos = await prisma.professional.create({
    data: {
      businessId: business.id,
      name: "Marcos Estilista",
      bio: "Focado em barba e acabamento",
      workingHours: {
        create: [Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY].map(
          (weekday) => ({
            weekday,
            startMinute: 10 * 60,
            endMinute: 19 * 60,
            breakStartMinute: 13 * 60,
            breakEndMinute: 14 * 60,
          }),
        ),
      },
      professionalServices: {
        create: [{ serviceId: barba.id }, { serviceId: comboCorteBarba.id }],
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
    },
  });

  await prisma.appointment.create({
    data: {
      businessId: business.id,
      professionalId: marcos.id,
      serviceId: barba.id,
      clientId: clientePedro.id,
      startAt: new Date("2026-09-20T14:00:00-03:00"),
      endAt: new Date("2026-09-20T14:20:00-03:00"),
      status: AppointmentStatus.COMPLETED,
      review: {
        create: {
          rating: 5,
          comment: "Ótimo atendimento, recomendo!",
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
    },
  });

  console.log("Seed concluído:", {
    business: business.slug,
    professionals: [joao.name, marcos.name],
    services: [corte.name, barba.name, comboCorteBarba.name],
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
