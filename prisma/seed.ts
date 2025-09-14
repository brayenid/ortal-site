import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD || "admin12345";
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email) {
    console.warn("ADMIN_EMAIL is not set. Skipping admin user creation.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN"
    }
  });

  // Ensure default categories exist
  await prisma.category.upsert({
    where: { slug: "gambar" },
    update: {},
    create: { name: "Gambar", slug: "gambar" }
  });
  await prisma.category.upsert({
    where: { slug: "pengumuman-penting" },
    update: {},
    create: { name: "Pengumuman Penting", slug: "pengumuman-penting" }
  });

  console.log("Seed complete. Admin user and default categories created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
