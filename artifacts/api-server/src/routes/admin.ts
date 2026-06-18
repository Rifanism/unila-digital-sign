import { Router } from "express";
import forge from "node-forge";
import crypto from "crypto";
import os from "os";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { P12Signer } from "@signpdf/signer-p12";
import { SignPdf } from "@signpdf/signpdf";
import { db, usersTable, digitalIdRequestsTable, signRequestsTable, documentsTable, signatureImagesTable, activityLogTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";
import { generateUserP12 } from "../lib/ca";
import { logger } from "../lib/logger";

function getAppBaseUrl(): string {
  if (process.env["APP_BASE_URL"]) {
    return process.env["APP_BASE_URL"].replace(/\/$/, "");
  }
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return `http://${net.address}:21426`;
      }
    }
  }
  return "http://localhost:21426";
}

const router = Router();

router.get("/admin/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  const [totalUsersResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "mahasiswa"));
  const [totalDosenResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "dosen"));
  const [pendingDigitalIdResult] = await db.select({ count: count() }).from(digitalIdRequestsTable).where(eq(digitalIdRequestsTable.status, "pending"));
  const [pendingSignResult] = await db.select({ count: count() }).from(signRequestsTable).where(eq(signRequestsTable.status, "pending"));
  const [totalDocsResult] = await db.select({ count: count() }).from(documentsTable);
  const [approvedDigitalIdResult] = await db.select({ count: count() }).from(digitalIdRequestsTable).where(eq(digitalIdRequestsTable.status, "approved"));
  const [signedDocsResult] = await db.select({ count: count() }).from(documentsTable).where(eq(documentsTable.status, "signed"));

  const recentActivity = await db
    .select()
    .from(activityLogTable)
    .orderBy(activityLogTable.createdAt)
    .limit(10);

  res.json({
    totalUsers: Number(totalUsersResult.count) + Number(totalDosenResult.count),
    pendingDigitalIdRequests: Number(pendingDigitalIdResult.count),
    pendingSignRequests: Number(pendingSignResult.count),
    totalDocuments: Number(totalDocsResult.count),
    approvedDigitalIds: Number(approvedDigitalIdResult.count),
    totalSignedDocuments: Number(signedDocsResult.count),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt,
    })),
  });
});

router.get("/admin/digital-id-requests", requireAdmin, async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      id: digitalIdRequestsTable.id,
      userId: digitalIdRequestsTable.userId,
      name: digitalIdRequestsTable.name,
      role: digitalIdRequestsTable.role,
      email: digitalIdRequestsTable.email,
      status: digitalIdRequestsTable.status,
      isApproved: digitalIdRequestsTable.isApproved,
      isReady: digitalIdRequestsTable.isReady,
      isSent: digitalIdRequestsTable.isSent,
      rejectionReason: digitalIdRequestsTable.rejectionReason,
      createdAt: digitalIdRequestsTable.createdAt,
      updatedAt: digitalIdRequestsTable.updatedAt,
      userName: usersTable.name,
    })
    .from(digitalIdRequestsTable)
    .leftJoin(usersTable, eq(digitalIdRequestsTable.userId, usersTable.id))
    .orderBy(digitalIdRequestsTable.createdAt);

  res.json(requests);
});

router.post("/admin/digital-id-requests/:id/approve", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [existing] = await db.select().from(digitalIdRequestsTable).where(eq(digitalIdRequestsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  let p12Data = existing.p12Data;
  if (!p12Data) {
    try {
      const p12Buffer = await generateUserP12(existing.name, existing.email, existing.role, existing.passphrase);
      p12Data = p12Buffer.toString("base64");
    } catch (err) {
      logger.error({ err }, "Failed to generate p12 during Digital ID approval");
    }
  }

  const [request] = await db
    .update(digitalIdRequestsTable)
    .set({ status: "approved", isApproved: true, isReady: true, isSent: true, p12Data })
    .where(eq(digitalIdRequestsTable.id, id))
    .returning();

  if (!request) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, request.userId));

  await db.insert(activityLogTable).values({
    type: "digital_id_approved",
    description: `Digital ID untuk ${user?.name ?? "User"} disetujui`,
    userId: req.userId!,
  });

  res.json({ ...request, p12Data: undefined, userName: user?.name ?? "" });
});

router.post("/admin/digital-id-requests/:id/reject", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ error: "Alasan penolakan diperlukan" });
    return;
  }

  const [request] = await db
    .update(digitalIdRequestsTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(digitalIdRequestsTable.id, id))
    .returning();

  if (!request) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, request.userId));

  await db.insert(activityLogTable).values({
    type: "digital_id_rejected",
    description: `Digital ID untuk ${user?.name ?? "User"} ditolak: ${reason}`,
    userId: req.userId!,
  });

  res.json({ ...request, p12Data: undefined, userName: user?.name ?? "" });
});

router.post("/admin/digital-id-requests/:id/revoke", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [request] = await db
    .update(digitalIdRequestsTable)
    .set({ status: "revoked", isApproved: false })
    .where(eq(digitalIdRequestsTable.id, id))
    .returning();

  if (!request) { res.status(404).json({ error: "Permintaan tidak ditemukan" }); return; }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, request.userId));
  await db.insert(activityLogTable).values({
    type: "digital_id_revoked",
    description: `Digital ID untuk ${user?.name ?? "User"} dicabut`,
    userId: req.userId!,
  });

  res.json({ ...request, p12Data: undefined, userName: user?.name ?? "" });
});

router.post("/admin/digital-id-requests/:id/reactivate", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [request] = await db
    .update(digitalIdRequestsTable)
    .set({ status: "approved", isApproved: true, isReady: true, isSent: true, rejectionReason: null })
    .where(eq(digitalIdRequestsTable.id, id))
    .returning();

  if (!request) { res.status(404).json({ error: "Permintaan tidak ditemukan" }); return; }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, request.userId));
  await db.insert(activityLogTable).values({
    type: "digital_id_approved",
    description: `Digital ID untuk ${user?.name ?? "User"} diaktifkan kembali`,
    userId: req.userId!,
  });

  res.json({ ...request, p12Data: undefined, userName: user?.name ?? "" });
});

router.get("/admin/sign-requests/:id/document", requireAdmin, async (_req, res): Promise<void> => {
  const raw = Array.isArray(_req.params.id) ? _req.params.id[0] : _req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [signReq] = await db.select().from(signRequestsTable).where(eq(signRequestsTable.id, id));
  if (!signReq) { res.status(404).json({ error: "Permintaan tidak ditemukan" }); return; }

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, signReq.documentId));
  if (!doc || !doc.fileData) { res.status(404).json({ error: "Dokumen tidak ditemukan" }); return; }

  const buffer = Buffer.from(doc.fileData, "base64");
  res.setHeader("Content-Type", doc.fileType ?? "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.name}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

router.get("/admin/sign-requests", requireAdmin, async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      id: signRequestsTable.id,
      documentId: signRequestsTable.documentId,
      userId: signRequestsTable.userId,
      status: signRequestsTable.status,
      signaturePage: signRequestsTable.signaturePage,
      signatureX: signRequestsTable.signatureX,
      signatureY: signRequestsTable.signatureY,
      signatureWidth: signRequestsTable.signatureWidth,
      signatureHeight: signRequestsTable.signatureHeight,
      rejectionReason: signRequestsTable.rejectionReason,
      createdAt: signRequestsTable.createdAt,
      updatedAt: signRequestsTable.updatedAt,
      userName: usersTable.name,
      documentName: documentsTable.name,
    })
    .from(signRequestsTable)
    .leftJoin(usersTable, eq(signRequestsTable.userId, usersTable.id))
    .leftJoin(documentsTable, eq(signRequestsTable.documentId, documentsTable.id))
    .orderBy(signRequestsTable.createdAt);

  res.json(requests.map((r) => ({
    ...r,
    signatureX: parseFloat(r.signatureX),
    signatureY: parseFloat(r.signatureY),
    signatureWidth: parseFloat(r.signatureWidth),
    signatureHeight: parseFloat(r.signatureHeight),
  })));
});

router.post("/admin/sign-requests/:id/approve", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const [signRequest] = await db
    .update(signRequestsTable)
    .set({ status: "approved" })
    .where(eq(signRequestsTable.id, id))
    .returning();

  if (!signRequest) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, signRequest.userId));
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, signRequest.documentId));
  const [digitalId] = await db
    .select()
    .from(digitalIdRequestsTable)
    .where(and(eq(digitalIdRequestsTable.userId, signRequest.userId), eq(digitalIdRequestsTable.status, "approved")));
  const [sigImg] = await db.select().from(signatureImagesTable).where(eq(signatureImagesTable.userId, signRequest.userId));

  let signedFileData: string | null = null;

  if (doc && digitalId) {
    try {
      let p12Buffer: Buffer;
      if (digitalId.p12Data) {
        p12Buffer = Buffer.from(digitalId.p12Data, "base64");
      } else {
        p12Buffer = await generateUserP12(digitalId.name, digitalId.email, digitalId.role, digitalId.passphrase);
        await db.update(digitalIdRequestsTable)
          .set({ p12Data: p12Buffer.toString("base64") })
          .where(eq(digitalIdRequestsTable.id, digitalId.id));
      }

      const originalPdfBytes = Buffer.from(doc.fileData, "base64");
      const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });

      const verificationToken = crypto.randomUUID();
      const verifyUrl = `${getAppBaseUrl()}/#/verify-qr/${verificationToken}`;
      logger.info({ verifyUrl }, "QR code verification URL generated");

      let qrPngBuffer: Buffer | null = null;
      try {
        qrPngBuffer = await QRCode.toBuffer(verifyUrl, { type: "png", width: 200, margin: 2, color: { dark: "#1a4fa0", light: "#ffffff" } });
      } catch (e) {
        logger.warn({ e }, "QR code generation failed");
      }

      await db.update(documentsTable)
        .set({ verificationToken })
        .where(eq(documentsTable.id, signRequest.documentId));

      {
        const pages = pdfDoc.getPages();
        const pageIndex = Math.max(0, Math.min(signRequest.signaturePage - 1, pages.length - 1));
        const page = pages[pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const xPct = parseFloat(signRequest.signatureX) / 100;
        const yPct = parseFloat(signRequest.signatureY) / 100;
        const wPct = parseFloat(signRequest.signatureWidth) / 100;
        const hPct = parseFloat(signRequest.signatureHeight) / 100;

        const stampW = wPct * pageWidth;
        const stampH = hPct * pageHeight;
        const stampX = xPct * pageWidth;
        const stampY = pageHeight - (yPct * pageHeight) - stampH;

        const pad = 8;
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const gray = rgb(0.4, 0.4, 0.4);
        const blue = rgb(0.1, 0.31, 0.63);
        const borderColor = rgb(0.1, 0.31, 0.63);

        page.drawRectangle({ x: stampX, y: stampY, width: stampW, height: stampH, borderColor, borderWidth: 1.2 });

        const qrGap = 6;
        const qrSize = stampH;
        const qrX = stampX + stampW + qrGap;
        const qrY = stampY;

        if (qrPngBuffer) {
          try {
            const qrImage = await pdfDoc.embedPng(qrPngBuffer);
            page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
          } catch { /* skip */ }
        }

        const innerX = stampX + pad;
        const innerW = stampW - pad * 2;

        const imgAreaH = stampH * 0.52;
        const imgAreaY = stampY + stampH - pad - imgAreaH;
        const imgMaxW = innerW;
        const imgMaxH = imgAreaH;

        if (sigImg) {
          const imgBytes = Buffer.from(sigImg.imageData, "base64");
          let embeddedImg;
          try { embeddedImg = await pdfDoc.embedPng(imgBytes); } catch {
            try { embeddedImg = await pdfDoc.embedJpg(imgBytes); } catch { embeddedImg = null; }
          }
          if (embeddedImg) {
            const dims = embeddedImg.scale(1);
            const ratio = dims.width / dims.height;
            let drawW = imgMaxW;
            let drawH = drawW / ratio;
            if (drawH > imgMaxH) { drawH = imgMaxH; drawW = drawH * ratio; }
            const drawX = stampX + (stampW - drawW) / 2;
            const drawY = imgAreaY + (imgAreaH - drawH) / 2;
            page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawW, height: drawH });
          }
        }

        const textAreaH = stampH * 0.45;
        const textAreaTop = stampY + textAreaH - pad * 0.5;
        const textAreaBottom = stampY + pad;
        const textH = textAreaTop - textAreaBottom;
        const numLines = 4;
        const lineH = textH / numLines;
        const fontSize = Math.min(Math.max(innerW / 18, 8), 12);

        const signingTime = new Date();
        const dd = String(signingTime.getDate()).padStart(2, "0");
        const mm = String(signingTime.getMonth() + 1).padStart(2, "0");
        const yyyy = signingTime.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;
        const idLabel = digitalId.role === "dosen" ? "NIP" : "NPM";
        const idVal = digitalId.nimNip ?? digitalId.email.split("@")[0] ?? "-";

        const lines = [
          { text: "Digitally signed by", font, color: gray },
          { text: digitalId.name, font: boldFont, color: blue },
          { text: `${idLabel}: ${idVal}`, font, color: gray },
          { text: `Date: ${dateStr}`, font, color: gray },
        ];

        let currentY = textAreaTop - lineH * 0.5;
        for (const line of lines) {
          const txtW = line.font.widthOfTextAtSize(line.text, fontSize);
          const size = txtW > innerW ? fontSize * (innerW / txtW) : fontSize;
          const centeredX = innerX + Math.max(0, (innerW - line.font.widthOfTextAtSize(line.text, size)) / 2);
          page.drawText(line.text, { x: centeredX, y: currentY, size, font: line.font, color: line.color });
          currentY -= lineH;
        }
      }

      const signingTime = new Date();
      pdfDoc.setCreator("Unila Digital Sign");
      pdfDoc.setProducer(`Universitas Lampung — ${digitalId.name}`);
      pdfDoc.setCreationDate(signingTime);
      pdfDoc.setKeywords(["Unila", "Digital Signature", digitalId.role]);
      pdfDoc.setAuthor(digitalId.name);

      pdflibAddPlaceholder({
        pdfDoc,
        reason: `Ditandatangani secara digital oleh ${digitalId.name}`,
        contactInfo: digitalId.email,
        name: digitalId.name,
        location: "Bandar Lampung, Lampung",
        signingTime,
        signatureLength: 16384,
      });

      const pdfWithPlaceholder = await pdfDoc.save({ useObjectStreams: false });
      const signer = new P12Signer(p12Buffer, { passphrase: digitalId.passphrase });
      const signPdfInstance = new SignPdf();
      const signedPdfBytes = await signPdfInstance.sign(Buffer.from(pdfWithPlaceholder), signer, signingTime);

      signedFileData = Buffer.from(signedPdfBytes).toString("base64");
    } catch (err) {
      logger.error({ err }, "PDF signing failed, storing unsigned");
    }
  }

  await db.update(documentsTable)
    .set({ status: "signed", ...(signedFileData ? { signedFileData } : {}) })
    .where(eq(documentsTable.id, signRequest.documentId));

  await db.insert(activityLogTable).values({
    type: "sign_approved",
    description: `Dokumen "${doc?.name ?? "Dokumen"}" milik ${user?.name ?? "User"} berhasil ditandatangani`,
    userId: req.userId!,
  });

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

router.post("/admin/sign-requests/:id/reject", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ error: "Alasan penolakan diperlukan" });
    return;
  }

  const [signRequest] = await db
    .update(signRequestsTable)
    .set({ status: "rejected", rejectionReason: reason })
    .where(eq(signRequestsTable.id, id))
    .returning();

  if (!signRequest) {
    res.status(404).json({ error: "Permintaan tidak ditemukan" });
    return;
  }

  await db.update(documentsTable)
    .set({ status: "rejected" })
    .where(eq(documentsTable.id, signRequest.documentId));

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, signRequest.userId));
  const [doc] = await db.select({ name: documentsTable.name }).from(documentsTable).where(eq(documentsTable.id, signRequest.documentId));

  await db.insert(activityLogTable).values({
    type: "sign_rejected",
    description: `Dokumen "${doc?.name ?? "Dokumen"}" milik ${user?.name ?? "User"} ditolak: ${reason}`,
    userId: req.userId!,
  });

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

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      otpEnabled: usersTable.otpEnabled,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  const result = await Promise.all(users.map(async (u) => {
    const [digitalId] = await db
      .select({ status: digitalIdRequestsTable.status })
      .from(digitalIdRequestsTable)
      .where(eq(digitalIdRequestsTable.userId, u.id))
      .orderBy(digitalIdRequestsTable.createdAt)
      .limit(1);

    const [sig] = await db
      .select({ id: signatureImagesTable.id })
      .from(signatureImagesTable)
      .where(eq(signatureImagesTable.userId, u.id));

    return {
      ...u,
      digitalIdStatus: digitalId?.status ?? null,
      hasSignature: !!sig,
    };
  }));

  res.json(result);
});

export default router;
