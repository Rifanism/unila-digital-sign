import { Router } from "express";
import { db, signatureImagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/signature", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [sig] = await db
    .select()
    .from(signatureImagesTable)
    .where(eq(signatureImagesTable.userId, req.userId!));

  if (!sig) {
    res.status(404).json({ error: "Tanda tangan belum diatur" });
    return;
  }

  res.json(sig);
});

router.post("/signature", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { imageData } = req.body;
  if (!imageData) {
    res.status(400).json({ error: "Data gambar diperlukan" });
    return;
  }

  const [existing] = await db
    .select()
    .from(signatureImagesTable)
    .where(eq(signatureImagesTable.userId, req.userId!));

  let result;
  if (existing) {
    [result] = await db
      .update(signatureImagesTable)
      .set({ imageData })
      .where(eq(signatureImagesTable.userId, req.userId!))
      .returning();
  } else {
    [result] = await db
      .insert(signatureImagesTable)
      .values({ userId: req.userId!, imageData })
      .returning();
  }

  res.json(result);
});

export default router;
