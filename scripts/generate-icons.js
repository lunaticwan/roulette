import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, '../build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const sourcePng = path.join(__dirname, '../assets/android-icon-192x192.png');
const targetPng = path.join(buildDir, 'icon.png');
const targetIco = path.join(buildDir, 'icon.ico');

const pngBuffer = fs.readFileSync(sourcePng);
fs.writeFileSync(targetPng, pngBuffer);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(192, 0);
entry.writeUInt8(192, 1);
entry.writeUInt8(0, 2);
entry.writeUInt8(0, 3);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(pngBuffer.length, 8);
entry.writeUInt32LE(22, 12);

const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
fs.writeFileSync(targetIco, icoBuffer);

console.log('Successfully generated build/icon.png and build/icon.ico');
