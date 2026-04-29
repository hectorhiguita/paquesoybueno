#!/usr/bin/env node
/**
 * Genera el hash PBKDF2 para la contraseña del administrador.
 *
 * Uso:
 *   node scripts/gen-admin-hash.mjs <contraseña>
 *
 * Luego copia el resultado a ADMIN_PASSWORD_HASH en tu archivo .env o Secrets Manager.
 */

const password = process.argv[2];

if (!password) {
  console.error("Uso: node scripts/gen-admin-hash.mjs <contraseña>");
  process.exit(1);
}

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;

const encoder = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));

const keyMaterial = await crypto.subtle.importKey(
  "raw",
  encoder.encode(password),
  "PBKDF2",
  false,
  ["deriveBits"]
);

const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
  keyMaterial,
  KEY_LENGTH
);

const toHex = (b) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

const hash = `pbkdf2:${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
console.log(hash);
