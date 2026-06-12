import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "public");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#7c3aed"/><text x="256" y="310" text-anchor="middle" font-size="240" font-family="Arial" font-weight="bold" fill="white">A</text></svg>`;
const buf = Buffer.from(svg);

await sharp(buf).resize(192, 192).png().toFile(join(root, "icon-192.png"));
await sharp(buf).resize(512, 512).png().toFile(join(root, "icon-512.png"));
console.log("Icons generated in public/");
