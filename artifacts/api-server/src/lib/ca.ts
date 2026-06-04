import forge from "node-forge";
import { readFileSync, writeFileSync } from "fs";
import { generateKeyPair } from "crypto";
import { promisify } from "util";

const generateKeyPairAsync = promisify(generateKeyPair);

interface CABundle {
  cert: forge.pki.Certificate;
  key: forge.pki.rsa.PrivateKey;
  certPem: string;
}

const CA_FILE = "/tmp/unila-ca.json";

let caBundle: CABundle | null = null;
let caInitPromise: Promise<CABundle>;

async function generateRsaKeyPair(): Promise<{ privateKey: forge.pki.rsa.PrivateKey; publicKey: forge.pki.rsa.PublicKey }> {
  const { privateKey: privPem, publicKey: pubPem } = await generateKeyPairAsync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  } as Parameters<typeof generateKeyPairAsync>[1]);
  return {
    privateKey: forge.pki.privateKeyFromPem(privPem as string) as forge.pki.rsa.PrivateKey,
    publicKey: forge.pki.publicKeyFromPem(pubPem as string) as forge.pki.rsa.PublicKey,
  };
}

async function initCA(): Promise<CABundle> {
  try {
    const stored = JSON.parse(readFileSync(CA_FILE, "utf-8"));
    const cert = forge.pki.certificateFromPem(stored.certPem);
    const key = forge.pki.privateKeyFromPem(stored.keyPem) as forge.pki.rsa.PrivateKey;
    const bundle: CABundle = { cert, key, certPem: stored.certPem };
    caBundle = bundle;
    return bundle;
  } catch {
    // Generate new CA
  }

  const { privateKey, publicKey } = await generateRsaKeyPair();

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date("2025-01-01T00:00:00Z");
  cert.validity.notAfter = new Date("2035-01-01T00:00:00Z");

  const attrs = [
    { name: "commonName", value: "Universitas Lampung Root CA" },
    { name: "organizationName", value: "Universitas Lampung" },
    { name: "organizationalUnitName", value: "Pusat Teknologi Informasi" },
    { name: "countryName", value: "ID" },
    { name: "stateOrProvinceName", value: "Lampung" },
    { name: "localityName", value: "Bandar Lampung" },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: "basicConstraints", cA: true, critical: true },
    { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true },
    { name: "subjectKeyIdentifier" },
  ]);

  cert.sign(privateKey, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(privateKey);

  const bundle: CABundle = { cert, key: privateKey, certPem };
  caBundle = bundle;

  try {
    writeFileSync(CA_FILE, JSON.stringify({ certPem, keyPem }));
  } catch {}

  return bundle;
}

caInitPromise = initCA();

export async function getCA(): Promise<CABundle> {
  return caBundle ?? caInitPromise;
}

export async function generateUserP12(
  name: string,
  email: string,
  role: string,
  passphrase: string,
): Promise<Buffer> {
  const ca = await getCA();

  const { privateKey, publicKey } = await generateRsaKeyPair();

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = Date.now().toString(16).toUpperCase();

  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

  const subject = [
    { name: "commonName", value: name },
    { name: "emailAddress", value: email },
    { name: "organizationName", value: "Universitas Lampung" },
    { name: "organizationalUnitName", value: role === "dosen" ? "Tenaga Pengajar" : "Mahasiswa" },
    { name: "countryName", value: "ID" },
    { name: "stateOrProvinceName", value: "Lampung" },
  ];

  cert.setSubject(subject);
  cert.setIssuer(ca.cert.subject.attributes);

  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    { name: "keyUsage", digitalSignature: true, nonRepudiation: true, critical: true },
    { name: "extKeyUsage", emailProtection: true, clientAuth: true },
    { name: "subjectAltName", altNames: [{ type: 1, value: email }] },
  ]);

  cert.sign(ca.key, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey,
    [cert, ca.cert],
    passphrase,
    { algorithm: "3des", friendlyName: name },
  );

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, "binary");
}
