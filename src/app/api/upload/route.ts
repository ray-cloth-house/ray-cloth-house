import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/auth';

cloudinary.config({
  cloud_name:   process.env.CLOUDINARY_CLOUD_NAME,
  api_key:      process.env.CLOUDINARY_API_KEY,
  api_secret:   process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE_BYTES = 30 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large — maximum allowed size is 30 MB` },
        { status: 413 }
      );
    }

    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      return NextResponse.json({ error: 'Video and audio files are not allowed' }, { status: 415 });
    }
    if (!ALLOWED_TYPES.includes(mimeType) && !mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images, PDFs, and Word documents are allowed' }, { status: 415 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'ray-cloth-house/invoices',
          resource_type: 'auto',
          type: 'upload',
          access_mode: 'public',
        },
        (err, res) => { if (err) reject(err); else resolve(res); }
      ).end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
