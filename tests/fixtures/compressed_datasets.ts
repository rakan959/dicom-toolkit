// Minimal naturalized dataset fixtures to exercise pixel decoders without full Part-10 files.
// Each dataset mimics the required tags and PixelData encapsulation for first-frame decoding.

export function makeRLEMono16(rows = 2, cols = 2) {
  // Build a fake RLE stream with header offsets and two segments (LSB, MSB) for 4 pixels
  // Uncompressed values: [0, 1000, 2000, 4095]
  const L = new Uint8Array([0, 232, 208, 255]);
  const H = new Uint8Array([0, 3, 7, 15]);
  const header = new Uint8Array(64); // 16 uint32 zeros
  const off0 = 64;
  const off1 = off0 + L.length;
  new DataView(header.buffer).setUint32(0, off0, true);
  new DataView(header.buffer).setUint32(4, off1, true);
  const stream = new Uint8Array(header.length + L.length + H.length);
  stream.set(header, 0);
  stream.set(L, header.length);
  stream.set(H, header.length + L.length);
  return {
    Rows: rows,
    Columns: cols,
    SamplesPerPixel: 1,
    BitsAllocated: 16,
    BitsStored: 12,
    PhotometricInterpretation: "MONOCHROME2",
    TransferSyntaxUID: "1.2.840.10008.1.2.5",
    PixelData: [stream],
  };
}

export function makeJPEGLSMono8(rows = 2, cols = 2) {
  // Provide a tiny bytestream placeholder; decoder mock will ignore actual contents
  const bot = new Uint8Array(0);
  const frame = new Uint8Array([1, 2, 3, 4]);
  return {
    Rows: rows,
    Columns: cols,
    SamplesPerPixel: 1,
    BitsAllocated: 8,
    BitsStored: 8,
    PhotometricInterpretation: "MONOCHROME2",
    TransferSyntaxUID: "1.2.840.10008.1.2.4.80",
    PixelData: [bot, frame],
  };
}

export function makeJ2KRGB8(rows = 2, cols = 2) {
  // RGB interleaved will be provided by decoder mock
  const bot = new Uint8Array(0);
  const frame = new Uint8Array([9, 9, 9, 9]);
  return {
    Rows: rows,
    Columns: cols,
    SamplesPerPixel: 3,
    BitsAllocated: 8,
    BitsStored: 8,
    PhotometricInterpretation: "RGB",
    PlanarConfiguration: 0,
    TransferSyntaxUID: "1.2.840.10008.1.2.4.90",
    PixelData: [bot, frame],
  };
}
