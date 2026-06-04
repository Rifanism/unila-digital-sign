import { Router } from "express";
import speakeasy from "speakeasy";
import { PDFDocument as PdfLib } from "pdf-lib";
import { db, usersTable, documentsTable, signRequestsTable, signatureImagesTable, digitalIdRequestsTable, activityLogTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/sign-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: signRequestsTable.id,
      documentId: signRequestsTable.documentId,
      status: signRequestsTable.status,
      rejectionReason: signRequestsTable.rejectionReason,
      createdAt: signRequestsTable.createdAt,
      updatedAt: signRequestsTable.updatedAt,
      documentName: documentsTable.name,
    })
    .from(signRequestsTable)
    .leftJoin(documentsTable, eq(signRequestsTable.documentId, documentsTable.id))
    .where(eq(signRequestsTable.userId, req.userId!))
    .orderBy(signRequestsTable.createdAt);

  res.json(rows);
});

router.get("/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: documentsTable.id,
      userId: documentsTable.userId,
      name: documentsTable.name,
      fileType: documentsTable.fileType,
      status: documentsTable.status,
      pageCount: documentsTable.pageCount,
      createdAt: documentsTable.createdAt,
      updatedAt: documentsTable.updatedAt,
      rejectionReason: signRequestsTable.rejectionReason,
    })
    .from(documentsTable)
    .leftJoin(
      signRequestsTable,
      and(eq(signRequestsTable.documentId, documentsTable.id), eq(signRequestsTable.status, "rejected"))
    )
    .where(eq(documentsTable.userId, req.userId!))
    .orderBy(documentsTable.createdAt);

  res.json(rows);
});

router.post("/documents", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, fileData, fileType, pageCount: clientPageCount } = req.body;
  if (!name || !fileData || !fileType) {
    res.status(400).json({ error: "Nama, file, dan tipe file diperlukan" });
    return;
  }

  let pageCount = clientPageCount ?? 1;
  if (fileType === "application/pdf") {
    try {
      const pdfBytes = Buffer.from(fileData, "base64");
      const pdfDoc = await PdfLib.load(pdfBytes, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      pageCount = clientPageCount ?? 1;
    }
  }

  const [doc] = await db.insert(documentsTable).values({
    userId: req.userId!,
    name,
    fileData,
    fileType,
    pageCount,
    status: "uploaded",
  }).returning();

  res.status(201).json(doc);
});

router.get("/documents/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.userId!)));

  if (!doc) {
    res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return;
  }

  res.json(doc);
});

router.delete("/documents/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.userId!)));

  if (!doc) {
    res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return;
  }

  await db.delete(signRequestsTable).where(eq(signRequestsTable.documentId, id));
  await db.delete(documentsTable).where(eq(documentsTable.id, id));

  res.json({ message: "Dokumen dihapus" });
});

router.post("/documents/:id/sign", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const { otpCode, passphrase, signaturePage, signatureX, signatureY, signatureWidth, signatureHeight } = req.body;

  if (!otpCode) {
    res.status(400).json({ error: "Kode OTP diperlukan" });
    return;
  }

  if (!passphrase) {
    res.status(400).json({ error: "Passphrase Digital ID diperlukan" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || !user.otpEnabled || !user.otpSecret) {
    res.status(400).json({ error: "OTP belum disetup" });
    return;
  }

  const verified = speakeasy.totp.verify({
    secret: user.otpSecret,
    encoding: "base32",
    token: String(otpCode),
    window: 2,
  });

  if (!verified) {
    res.status(400).json({ error: "Kode OTP tidak valid" });
    return;
  }

  const [digitalId] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(and(eq(digitalIdRequestsTable.userId, req.userId!), eq(digitalIdRequestsTable.status, "approved")));

  if (!digitalId) {
    res.status(400).json({ error: "Digital ID belum disetujui" });
    return;
  }

  if (digitalId.passphrase !== passphrase) {
    res.status(400).json({ error: "Passphrase Digital ID tidak cocok" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.userId!)));

  if (!doc) {
    res.status(404).json({ error: "Dokumen tidak ditemukan" });
    return;
  }

  const [signRequest] = await db.insert(signRequestsTable).values({
    documentId: id,
    userId: req.userId!,
    status: "pending",
    signaturePage: signaturePage ?? 1,
    signatureX: String(signatureX ?? 10),
    signatureY: String(signatureY ?? 10),
    signatureWidth: String(signatureWidth ?? 20),
    signatureHeight: String(signatureHeight ?? 10),
  }).returning();

  await db.update(documentsTable)
    .set({ status: "pending_sign" })
    .where(eq(documentsTable.id, id));

  await db.insert(activityLogTable).values({
    type: "sign_request",
    description: `${user.name} mengajukan permintaan penandatanganan dokumen "${doc.name}"`,
    userId: req.userId!,
  });

  res.status(201).json({
    ...signRequest,
    userName: user.name,
    documentName: doc.name,
    signatureX: parseFloat(signRequest.signatureX),
    signatureY: parseFloat(signRequest.signatureY),
    signatureWidth: parseFloat(signRequest.signatureWidth),
    signatureHeight: parseFloat(signRequest.signatureHeight),
  });
});

router.get("/documents/:id/sign-status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [signRequest] = await db
    .select()
    .from(signRequestsTable)
    .where(and(eq(signRequestsTable.documentId, id), eq(signRequestsTable.userId, req.userId!)))
    .orderBy(signRequestsTable.createdAt);

  if (!signRequest) {
    res.status(404).json({ error: "Tidak ada permintaan tanda tangan" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!));
  const [doc] = await db.select({ name: documentsTable.name }).from(documentsTable).where(eq(documentsTable.id, id));

  res.json({
    ...signRequest,
    userName: user?.name ?? "",
    documentName: doc?.name ?? "",
    signatureX: parseFloat(signRequest.signatureX),
    signatureY: parseFloat(signRequest.signatureY),
    signatureWidth: parseFloat(signRequest.signatureWidth),
    signatureHeight: parseFloat(signRequest.signatureHeight),
  });
});

router.get("/documents/:id/download", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, req.userId!)));

  if (!doc || doc.status !== "signed") {
    res.status(403).json({ error: "Dokumen belum ditandatangani" });
    return;
  }

  const fileData = doc.signedFileData ?? doc.fileData;
  const buffer = Buffer.from(fileData, "base64");
  res.setHeader("Content-Type", doc.fileType);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.name}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

export default router;
