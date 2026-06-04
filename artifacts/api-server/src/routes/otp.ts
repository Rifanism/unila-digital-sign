import { Router } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/otp/setup", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const secret = speakeasy.generateSecret({
    name: `Unila Digital Sign (${user.email})`,
    issuer: "Unila Digital Sign",
    length: 20,
  });

  await db.update(usersTable)
    .set({ otpSecret: secret.base32 })
    .where(eq(usersTable.id, user.id));

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  res.json({
    qrCodeUrl,
    secret: secret.base32,
  });
});

router.post("/otp/verify", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: "Kode OTP diperlukan" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || !user.otpSecret) {
    res.status(400).json({ error: "OTP belum di-setup" });
    return;
  }

  const verified = speakeasy.totp.verify({
    secret: user.otpSecret,
    encoding: "base32",
    token: String(code),
    window: 2,
  });

  if (!verified) {
    res.status(400).json({ error: "Kode OTP tidak valid" });
    return;
  }

  await db.update(usersTable)
    .set({ otpEnabled: true })
    .where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "OTP berhasil diverifikasi" });
});

router.post("/otp/disable", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  await db
    .update(usersTable)
    .set({ otpEnabled: false, otpSecret: null, otpResetToken: null, otpResetTokenExpiry: null })
    .where(eq(usersTable.id, req.userId!));

  res.json({ message: "OTP berhasil direset. Silakan setup OTP baru." });
});

export default router;
