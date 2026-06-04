import { Router } from "express";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { db, usersTable, digitalIdRequestsTable, signatureImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email dan password diperlukan" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  // Get digital ID status
  const [digitalIdReq] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(eq(digitalIdRequestsTable.userId, user.id))
    .orderBy(digitalIdRequestsTable.createdAt)
    .limit(1);

  const [sigImg] = await db
    .select({ id: signatureImagesTable.id })
    .from(signatureImagesTable)
    .where(eq(signatureImagesTable.userId, user.id));

  const token = signToken(user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      otpEnabled: user.otpEnabled,
      digitalIdStatus: digitalIdReq?.status ?? null,
      hasSignature: !!sigImg,
      createdAt: user.createdAt,
    },
    token,
    otpRequired: user.otpEnabled,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [digitalIdReq] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(eq(digitalIdRequestsTable.userId, user.id))
    .orderBy(digitalIdRequestsTable.createdAt)
    .limit(1);

  const [sigImg] = await db
    .select({ id: signatureImagesTable.id })
    .from(signatureImagesTable)
    .where(eq(signatureImagesTable.userId, user.id));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    otpEnabled: user.otpEnabled,
    digitalIdStatus: digitalIdReq?.status ?? null,
    hasSignature: !!sigImg,
    createdAt: user.createdAt,
  });
});

router.post("/auth/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { oldPassword, newPassword, otpCode } = req.body;

  if (!oldPassword || !newPassword || !otpCode) {
    res.status(400).json({ error: "Semua field diperlukan" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const validPassword = await bcrypt.compare(oldPassword, user.password);
  if (!validPassword) {
    res.status(400).json({ error: "Password lama tidak sesuai" });
    return;
  }

  if (!user.otpEnabled || !user.otpSecret) {
    res.status(400).json({ error: "OTP belum diaktifkan. Aktifkan OTP terlebih dahulu untuk mengubah password." });
    return;
  }

  const otpValid = speakeasy.totp.verify({
    secret: user.otpSecret,
    encoding: "base32",
    token: String(otpCode),
    window: 2,
  });

  if (!otpValid) {
    res.status(400).json({ error: "Kode OTP tidak valid" });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));

  res.json({ message: "Password berhasil diubah" });
});

export default router;
