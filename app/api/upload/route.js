import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { requireShopId } from '../../../lib/auth';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

function getUploadsDir() {
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function POST(request) {
  let shopId;
  try { shopId = await requireShopId(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const magicBytes = buffer.slice(0, 4).toString('hex');
  const validMagic = magicBytes.startsWith('ffd8ff') || magicBytes.startsWith('89504e47') ||
    magicBytes.startsWith('47494638') || magicBytes.startsWith('52494646');
  if (!validMagic) {
    return NextResponse.json({ error: 'File content invalid' }, { status: 400 });
  }

  const uploadDir = getUploadsDir();
  const filename = `${shopId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, buffer);

  return NextResponse.json({ url: `/api/uploads/${filename}` });
}
