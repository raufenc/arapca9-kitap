// İndirme listesini şifreyle kilitler (AES-256-GCM, anahtar PBKDF2-SHA256).
// cevrimdisi-liste.py çağırır: girdi stdin'den JSON {password, data}, çıktı stdout'a kilit nesnesi.
// Tarayıcı aynı yolla (Web Crypto) açar: reader.js → unlockList().
import {pbkdf2Sync, randomBytes, createCipheriv} from 'node:crypto';

const ITER = 600000;
let raw = '';
for await (const c of process.stdin) raw += c;
const {password, data} = JSON.parse(raw);
if (!password || password.length < 8) { console.error('Şifre en az 8 karakter olmalı'); process.exit(1); }
const salt = randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(password.normalize('NFC'), salt, ITER, 32, 'sha256');
const c = createCipheriv('aes-256-gcm', key, iv);
const body = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final(), c.getAuthTag()]);
process.stdout.write(JSON.stringify({alg: 'PBKDF2-SHA256/AES-256-GCM', iter: ITER,
 salt: salt.toString('base64'), iv: iv.toString('base64'), data: body.toString('base64')}));
