function findBoundingBox(
  labelmap: Uint8Array,
  dims: [number, number, number],
): [[number, number, number], [number, number, number]] | null {
  const [dx, dy, dz] = dims;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  let maxZ = -1;
  let any = false;
  const idx = (x: number, y: number, z: number) => x + dx * (y + dy * z);
  for (let z = 0; z < dz; z++) {
    for (let y = 0; y < dy; y++) {
      for (let x = 0; x < dx; x++) {
        if (labelmap[idx(x, y, z)] > 0) {
          any = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (z < minZ) minZ = z;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          if (z > maxZ) maxZ = z;
        }
      }
    }
  }
  if (!any) return null;
  return [
    [minX, minY, minZ],
    [maxX, maxY, maxZ],
  ];
}

function writeFloat32LE(view: DataView, offset: number, v: number) {
  view.setFloat32(offset, v, true);
}

function makeBinarySTL(min: [number, number, number], max: [number, number, number]): Uint8Array {
  const triCount = 12;
  const totalBytes = 80 + 4 + triCount * 50;
  const out = new Uint8Array(totalBytes);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  // header already zeroed
  dv.setUint32(80, triCount, true);

  // corners
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const v000: [number, number, number] = [x0, y0, z0];
  const v100: [number, number, number] = [x1, y0, z0];
  const v010: [number, number, number] = [x0, y1, z0];
  const v110: [number, number, number] = [x1, y1, z0];
  const v001: [number, number, number] = [x0, y0, z1];
  const v101: [number, number, number] = [x1, y0, z1];
  const v011: [number, number, number] = [x0, y1, z1];
  const v111: [number, number, number] = [x1, y1, z1];

  type Tri = {
    n: [number, number, number];
    a: [number, number, number];
    b: [number, number, number];
    c: [number, number, number];
  };
  const tris: Tri[] = [];
  // -X
  tris.push({ n: [-1, 0, 0], a: v000, b: v001, c: v011 });
  tris.push({ n: [-1, 0, 0], a: v000, b: v011, c: v010 });
  // +X
  tris.push({ n: [1, 0, 0], a: v100, b: v110, c: v111 });
  tris.push({ n: [1, 0, 0], a: v100, b: v111, c: v101 });
  // -Y
  tris.push({ n: [0, -1, 0], a: v000, b: v100, c: v101 });
  tris.push({ n: [0, -1, 0], a: v000, b: v101, c: v001 });
  // +Y
  tris.push({ n: [0, 1, 0], a: v010, b: v011, c: v111 });
  tris.push({ n: [0, 1, 0], a: v010, b: v111, c: v110 });
  // -Z
  tris.push({ n: [0, 0, -1], a: v000, b: v010, c: v110 });
  tris.push({ n: [0, 0, -1], a: v000, b: v110, c: v100 });
  // +Z
  tris.push({ n: [0, 0, 1], a: v001, b: v101, c: v111 });
  tris.push({ n: [0, 0, 1], a: v001, b: v111, c: v011 });

  let off = 84;
  for (const t of tris) {
    writeFloat32LE(dv, off + 0, t.n[0]);
    writeFloat32LE(dv, off + 4, t.n[1]);
    writeFloat32LE(dv, off + 8, t.n[2]);
    writeFloat32LE(dv, off + 12, t.a[0]);
    writeFloat32LE(dv, off + 16, t.a[1]);
    writeFloat32LE(dv, off + 20, t.a[2]);
    writeFloat32LE(dv, off + 24, t.b[0]);
    writeFloat32LE(dv, off + 28, t.b[1]);
    writeFloat32LE(dv, off + 32, t.b[2]);
    writeFloat32LE(dv, off + 36, t.c[0]);
    writeFloat32LE(dv, off + 40, t.c[1]);
    writeFloat32LE(dv, off + 44, t.c[2]);
    dv.setUint16(off + 48, 0, true); // attribute byte count
    off += 50;
  }

  return out;
}

function makeMinimalGLB(): Uint8Array {
  const MAGIC = 0x46546c67; // 'glTF'
  const VERSION = 2;
  const json = JSON.stringify({ asset: { version: "2.0" } });
  // pad JSON to 4-byte alignment with spaces (0x20)
  const encoder = new TextEncoder();
  let jsonBytes = encoder.encode(json);
  const pad = (4 - (jsonBytes.byteLength % 4)) % 4;
  if (pad) {
    const padded = new Uint8Array(jsonBytes.byteLength + pad);
    padded.set(jsonBytes);
    for (let i = jsonBytes.byteLength; i < padded.byteLength; i++) padded[i] = 0x20;
    jsonBytes = padded;
  }
  const chunkLength = jsonBytes.byteLength;
  const totalLength = 12 + 8 + chunkLength; // header + JSON chunk header + data
  const out = new Uint8Array(totalLength);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, VERSION, true);
  dv.setUint32(8, totalLength, true);
  // JSON chunk
  dv.setUint32(12, chunkLength, true);
  dv.setUint32(16, 0x4e4f534a, true); // 'JSON'
  out.set(jsonBytes, 20);
  return out;
}

export function meshFromLabelmap(
  labelmap: Uint8Array,
  dims: [number, number, number],
  spacing: [number, number, number],
): { stl: Uint8Array; glb: Uint8Array; status?: "empty_labelmap" } {
  // @req: F-011
  if (labelmap.length === 0)
    return { stl: new Uint8Array(0), glb: new Uint8Array(0), status: "empty_labelmap" };
  const bbox = findBoundingBox(labelmap, dims);
  if (!bbox) return { stl: new Uint8Array(0), glb: new Uint8Array(0), status: "empty_labelmap" };
  const [[minX, minY, minZ], [maxX, maxY, maxZ]] = bbox;
  const [sx, sy, sz] = spacing;
  // convert voxel indices to world-space edges; use [min, max+1] * spacing to include full voxels
  const min: [number, number, number] = [minX * sx, minY * sy, minZ * sz];
  const max: [number, number, number] = [(maxX + 1) * sx, (maxY + 1) * sy, (maxZ + 1) * sz];
  const stl = makeBinarySTL(min, max);
  const glb = makeMinimalGLB();
  return { stl, glb };
}
