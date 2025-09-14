import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const { email, name, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name, passwordHash, role: "EDITOR" } });
  return NextResponse.json({ ok: true });
}
