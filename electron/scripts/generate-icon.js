// Generates icon.ico from icon.png using the PNG-embedded ICO format.
// Supported by Windows Vista+ and all modern electron-builder versions.
// No npm dependencies required.

const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "..", "resources", "icon.png");
const icoPath = path.join(__dirname, "..", "resources", "icon.ico");

if (!fs.existsSync(pngPath)) {
  console.error("ERROR: icon.png not found at", pngPath);
  process.exit(1);
}

const png = fs.readFileSync(pngPath);

// ICO file header (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved, must be 0
header.writeUInt16LE(1, 2); // type: 1 = ICO
header.writeUInt16LE(1, 4); // number of images: 1

// ICONDIRENTRY (16 bytes) — describes the single embedded PNG
const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0);              // width  (0 means 256)
entry.writeUInt8(0, 1);              // height (0 means 256)
entry.writeUInt8(0, 2);              // color count (0 = true color)
entry.writeUInt8(0, 3);              // reserved
entry.writeUInt16LE(1, 4);           // color planes
entry.writeUInt16LE(32, 6);          // bits per pixel
entry.writeUInt32LE(png.length, 8);  // size of image data in bytes
entry.writeUInt32LE(22, 12);         // offset of image data (6 + 16 = 22)

const ico = Buffer.concat([header, entry, png]);
fs.writeFileSync(icoPath, ico);

console.log("icon.ico generated (" + ico.length + " bytes) at", icoPath);
