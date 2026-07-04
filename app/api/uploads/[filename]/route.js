import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const mimeTypes = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
};

export async function GET(request, { params }) {
  const { filename } = params;
  const safe = path.basename(filename);
  if (safe !== filename) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

  const filepath = path.join(process.cwd(), 'uploads', safe);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(safe).toLowerCase();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
