import { Router } from "express";
import { db, usersTable, digitalIdRequestsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { generateUserP12 } from "../lib/ca";
import { logger } from "../lib/logger";

const router = Router();

router.post("/digital-id/request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, role, email, passphrase, nimNip } = req.body;
  if (!name || !role || !email || !passphrase) {
    res.status(400).json({ error: "Semua field diperlukan" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [existing] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(eq(digitalIdRequestsTable.userId, req.userId!));

  if (existing && (existing.status === "pending" || existing.status === "approved")) {
    res.status(400).json({ error: "Anda sudah memiliki permintaan Digital ID" });
    return;
  }

  const [request] = await db
    .insert(digitalIdRequestsTable)
    .values({
      userId: req.userId!,
      name,
      role,
      email: email.toLowerCase(),
      passphrase,
      nimNip: nimNip ?? null,
      status: "pending",
      isApproved: false,
      isReady: false,
      isSent: false,
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "digital_id_request",
    description: `${user.name} mengajukan permintaan Digital ID`,
    userId: req.userId!,
  });

  res.status(201).json({ ...request, p12Data: undefined, userName: user.name });
});

router.get("/digital-id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [request] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(eq(digitalIdRequestsTable.userId, req.userId!))
    .orderBy(digitalIdRequestsTable.createdAt);

  if (!request) {
    res.status(404).json({ error: "Tidak ada permintaan Digital ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  res.json({ ...request, p12Data: undefined, userName: user?.name ?? "" });
});

router.get("/digital-id/download", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [request] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(eq(digitalIdRequestsTable.userId, req.userId!));

  if (!request || request.status !== "approved") {
    res.status(403).json({ error: "Digital ID belum disetujui" });
    return;
  }

  let p12Buffer: Buffer;

  if (request.p12Data) {
    p12Buffer = Buffer.from(request.p12Data, "base64");
  } else {
    try {
      p12Buffer = await generateUserP12(request.name, request.email, request.role, request.passphrase);
      await db.update(digitalIdRequestsTable)
        .set({ p12Data: p12Buffer.toString("base64") })
        .where(eq(digitalIdRequestsTable.id, request.id));
    } catch (err) {
      logger.error({ err }, "Failed to generate p12 for download");
      res.status(500).json({ error: "Gagal menghasilkan Digital ID" });
      return;
    }
  }

  const safeName = request.name.replace(/\s+/g, "_").toLowerCase();
  const filename = `${safeName}_${request.role}.p12`;

  res.setHeader("Content-Type", "application/x-pkcs12");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", p12Buffer.length);
  res.send(p12Buffer);
});

export default router;
