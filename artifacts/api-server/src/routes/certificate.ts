import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getCA } from "../lib/ca";

const router = Router();

router.get("/certificate/ca", requireAuth, async (_req, res): Promise<void> => {
  const ca = await getCA();
  const buffer = Buffer.from(ca.certPem, "utf-8");
  res.setHeader("Content-Type", "application/x-x509-ca-cert");
  res.setHeader("Content-Disposition", 'attachment; filename="UniversitasLampung-CA.crt"');
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

router.get("/certificate/ca/info", async (_req, res): Promise<void> => {
  const ca = await getCA();
  const notBefore = ca.cert.validity.notBefore;
  const notAfter = ca.cert.validity.notAfter;
  res.json({
    name: "Universitas Lampung Root CA",
    issuer: "Universitas Lampung — Pusat Teknologi Informasi",
    validFrom: notBefore.toISOString().split("T")[0],
    validTo: notAfter.toISOString().split("T")[0],
    downloadUrl: "/api/certificate/ca",
    algorithm: "RSA 2048-bit, SHA-256",
    instructions:
      "Import sertifikat ini ke Adobe Acrobat Reader atau Foxit Reader sebagai Trusted Certificate untuk dapat memverifikasi tanda tangan digital dari Universitas Lampung.",
  });
});

export default router;
