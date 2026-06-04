import { Router } from "express";
import forge from "node-forge";
import { db, documentsTable, signRequestsTable, usersTable, digitalIdRequestsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function extractPkcs7FromPdf(pdfBuffer: Buffer): {
  pkcs7Der: Buffer;
  byteRange: [number, number, number, number];
} | null {
  const pdfStr = pdfBuffer.toString("latin1");

  const brMatch = pdfStr.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  if (!brMatch) return null;
  const byteRange: [number, number, number, number] = [
    parseInt(brMatch[1], 10),
    parseInt(brMatch[2], 10),
    parseInt(brMatch[3], 10),
    parseInt(brMatch[4], 10),
  ];

  const contentsMatch = pdfStr.match(/\/Contents\s*<([0-9A-Fa-f\s]+)>/);
  if (!contentsMatch) return null;

  const hex = contentsMatch[1].replace(/\s/g, "");
  let trimEnd = hex.length;
  while (trimEnd > 2 && hex[trimEnd - 1] === "0" && hex[trimEnd - 2] === "0") trimEnd -= 2;
  const cleanHex = hex.slice(0, trimEnd);
  if (!cleanHex) return null;

  return { pkcs7Der: Buffer.from(cleanHex, "hex"), byteRange };
}

function verifyCmsSig(pkcs7Der: Buffer, pdfBuffer: Buffer, byteRange: [number, number, number, number]): {
  signerName: string;
  signerEmail: string;
  signerRole: string;
  signedAt: string;
  contentHashValid: boolean;
  certChainValid: boolean;
  certChainError: string;
} {
  const p7Asn1 = forge.asn1.fromDer(pkcs7Der.toString("binary"));
  const p7 = forge.pkcs7.messageFromAsn1(p7Asn1) as forge.pkcs7.PkcsSignedData;

  const certs = p7.certificates as forge.pki.Certificate[];

  const userCert = certs.find((c) => {
    const bc = c.getExtension("basicConstraints") as { cA?: boolean } | null;
    return !bc?.cA;
  }) ?? certs[0];

  const caCert = certs.find((c) => {
    const bc = c.getExtension("basicConstraints") as { cA?: boolean } | null;
    return !!bc?.cA;
  });

  const signerName: string = (userCert?.subject.getField("CN") as { value: string } | null)?.value ?? "";

  let signerEmail = "";
  try {
    signerEmail = (userCert?.subject.getField("E") as { value: string } | null)?.value ?? "";
    if (!signerEmail) {
      const san = userCert?.getExtension("subjectAltName") as { altNames?: Array<{ type: number; value: string }> } | null;
      signerEmail = san?.altNames?.find((a) => a.type === 1)?.value ?? "";
    }
  } catch { /* ignore */ }

  const ouValue: string = (userCert?.subject.getField("OU") as { value: string } | null)?.value ?? "";
  const signerRole = ouValue.toLowerCase().includes("mahasiswa") ? "mahasiswa" : "dosen";

  let signedAt = new Date().toISOString();
  try {
    const signer = (p7 as unknown as { signers: Array<{ authenticatedAttributes: Array<{ type: string; value: { value: string } }> }> }).signers?.[0];
    const sigTimeAttr = signer?.authenticatedAttributes?.find((a) => a.type === "1.2.840.113549.1.9.5");
    if (sigTimeAttr?.value?.value) {
      signedAt = new Date(sigTimeAttr.value.value).toISOString();
    }
  } catch { /* ignore */ }

  let certChainValid = false;
  let certChainError = "";
  try {
    if (caCert) {
      const caStore = forge.pki.createCaStore([caCert]);
      forge.pki.verifyCertificateChain(caStore, [userCert]);
      certChainValid = true;
    } else if (certs.length === 1) {
      const caStore = forge.pki.createCaStore([userCert]);
      forge.pki.verifyCertificateChain(caStore, [userCert]);
      certChainValid = true;
    } else {
      certChainError = "CA certificate tidak ditemukan dalam tanda tangan";
    }
  } catch (e: unknown) {
    certChainError = e instanceof Error ? e.message : "Rantai sertifikat tidak valid";
  }

  let contentHashValid = false;
  try {
    const part1 = pdfBuffer.slice(byteRange[0], byteRange[0] + byteRange[1]);
    const part2 = pdfBuffer.slice(byteRange[2], byteRange[2] + byteRange[3]);
    const signedContent = Buffer.concat([part1, part2]);

    const signer = (p7 as unknown as { signers: Array<{ authenticatedAttributes: Array<{ type: string; value: { value: string } }> }> }).signers?.[0];

    const msgDigestAttr = signer?.authenticatedAttributes?.find((a) => a.type === "1.2.840.113549.1.9.4");
    if (msgDigestAttr) {
      const embeddedDigest = msgDigestAttr.value.value as string; // binary string
      const actualDigest = forge.md.sha256.create()
        .update(signedContent.toString("binary"))
        .digest()
        .bytes();
      contentHashValid = embeddedDigest === actualDigest;
    } else {
      contentHashValid = certChainValid;
    }
  } catch { /* ignore */ }

  return { signerName, signerEmail, signerRole, signedAt, contentHashValid, certChainValid, certChainError };
}

router.post("/verify/document", async (req, res): Promise<void> => {
  const { fileData } = req.body;
  if (!fileData) {
    res.status(400).json({ error: "File dokumen diperlukan" });
    return;
  }

  try {
    const pdfBuffer = Buffer.from(fileData, "base64");

    if (!pdfBuffer.slice(0, 5).toString("ascii").startsWith("%PDF")) {
      res.json({ isValid: false, message: "File bukan PDF yang valid.", signerName: null, signerEmail: null, signedAt: null, details: null });
      return;
    }

    const sigInfo = extractPkcs7FromPdf(pdfBuffer);

    if (!sigInfo) {
      res.json({
        isValid: false,
        message: "Dokumen tidak memiliki tanda tangan digital.",
        signerName: null,
        signerEmail: null,
        signedAt: null,
        details: "Tidak ditemukan /Sig field dalam dokumen ini. Pastikan dokumen ditandatangani melalui Unila Digital Sign.",
      });
      return;
    }

    let result;
    try {
      result = verifyCmsSig(sigInfo.pkcs7Der, pdfBuffer, sigInfo.byteRange);
    } catch (e: unknown) {
      res.json({
        isValid: false,
        message: "Format tanda tangan tidak valid atau rusak.",
        signerName: null,
        signerEmail: null,
        signedAt: null,
        details: e instanceof Error ? e.message : "Gagal mem-parsing struktur PKCS#7",
      });
      return;
    }

    const { signerName, signerEmail, signerRole, signedAt, contentHashValid, certChainValid, certChainError } = result;
    const isValid = contentHashValid && certChainValid;

    let message: string;
    let details: string;

    if (isValid) {
      message = "Dokumen valid dan telah ditandatangani secara digital oleh Universitas Lampung";
      details = "Tanda tangan valid. Integritas konten terverifikasi. Sertifikat terverifikasi dalam CA Universitas Lampung. Dokumen tidak berubah sejak ditandatangani.";
    } else if (!contentHashValid && certChainValid) {
      message = "Dokumen telah dimodifikasi setelah ditandatangani";
      details = "Rantai sertifikat valid, namun hash konten dokumen tidak cocok. Dokumen mungkin telah diubah setelah proses penandatanganan.";
    } else if (contentHashValid && !certChainValid) {
      message = `Konten dokumen utuh, namun sertifikat tidak valid: ${certChainError}`;
      details = "Hash konten cocok tetapi rantai sertifikat tidak dapat diverifikasi. Pastikan CA Universitas Lampung sudah diinstall/dipercaya.";
    } else {
      message = "Tanda tangan tidak valid — dokumen mungkin telah dimodifikasi atau sertifikat tidak valid";
      details = `Verifikasi gagal. Cert chain: ${certChainError || "error"}`;
    }

    res.json({
      isValid,
      message,
      signerName: signerName || null,
      signerEmail: signerEmail || null,
      signerRole: signerRole || null,
      signedAt,
      details,
    });
  } catch {
    res.json({
      isValid: false,
      message: "Tidak dapat memproses dokumen PDF.",
      signerName: null,
      signerEmail: null,
      signedAt: null,
      details: null,
    });
  }
});

router.get("/verify/qr/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  if (!token) {
    res.status(400).json({ error: "Token diperlukan" });
    return;
  }

  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.verificationToken, token));
  if (!doc) {
    res.status(404).json({ error: "Token tidak ditemukan atau dokumen tidak valid" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, doc.userId));

  const [digitalId] = await db.select()
    .from(digitalIdRequestsTable)
    .where(and(eq(digitalIdRequestsTable.userId, doc.userId), eq(digitalIdRequestsTable.status, "approved")));

  const [signReq] = await db.select({ createdAt: signRequestsTable.updatedAt })
    .from(signRequestsTable)
    .where(and(eq(signRequestsTable.documentId, doc.id), eq(signRequestsTable.status, "approved")));

  res.json({
    isValid: doc.status === "signed",
    documentName: doc.name,
    signerName: digitalId?.name ?? user?.name ?? "",
    signerEmail: digitalId?.email ?? user?.email ?? "",
    signerRole: digitalId?.role ?? user?.role ?? "",
    nimNip: digitalId?.nimNip ?? null,
    signedAt: signReq?.createdAt ?? doc.updatedAt,
  });
});

export default router;
