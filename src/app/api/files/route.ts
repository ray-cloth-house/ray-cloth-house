import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/auth';

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

interface ParsedUrl {
  resourceType: string; // 'image' | 'video' | 'raw'
  deliveryType: string; // 'upload' | 'private' | 'authenticated'
  publicId:     string;
  format:       string;
}

function parseCloudinaryUrl(url: string): ParsedUrl | null {
  // Handles URLs with or without existing signature (s--xxx--) and version (v123/)
  const match = url.match(
    /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/(upload|private|authenticated)\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+?)(?:\?.*)?$/
  );
  if (!match) return null;

  const pathWithExt = match[3];
  const lastDot     = pathWithExt.lastIndexOf('.');
  const publicId    = lastDot !== -1 ? pathWithExt.substring(0, lastDot) : pathWithExt;
  const format      = lastDot !== -1 ? pathWithExt.substring(lastDot + 1) : '';

  return {
    resourceType: match[1],
    deliveryType: match[2],
    publicId,
    format,
  };
}

function mimeType(format: string): string {
  const map: Record<string, string> = {
    pdf:  'application/pdf',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    gif:  'image/gif',
    webp: 'image/webp',
    bmp:  'image/bmp',
    tiff: 'image/tiff',
    tif:  'image/tiff',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[format.toLowerCase()] || 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return new NextResponse('Unauthorized — please log in to view this file.', { status: 401 });
    }

    const rawUrl = req.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    if (!rawUrl.includes('res.cloudinary.com')) {
      return new NextResponse('Invalid file URL', { status: 400 });
    }

    const parsed = parseCloudinaryUrl(rawUrl);
    if (!parsed) {
      return new NextResponse('Cannot parse Cloudinary URL', { status: 400 });
    }

    // Generate a temporary signed download URL that our server can use to fetch
    // the file directly from Cloudinary — this works even when direct browser
    // access is blocked by the account's CDN security settings.
    const downloadUrl = (cloudinary.utils as any).private_download_url(
      parsed.publicId,
      parsed.format,
      {
        resource_type: parsed.resourceType,
        type:          parsed.deliveryType, // critical: must match how the file was uploaded
        expires_at:    Math.floor(Date.now() / 1000) + 3600,
        attachment:    false,
      }
    );

    // Fetch the file on the server — bypasses all CDN access restrictions
    const upstream = await fetch(downloadUrl);
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      console.error('[/api/files] upstream error:', upstream.status, errText);
      return new NextResponse(
        `Could not retrieve file (${upstream.status}). It may have been deleted from storage.`,
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || mimeType(parsed.format);
    const fileName    = `${parsed.publicId.split('/').pop()}.${parsed.format}`;
    const body        = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control':       'private, max-age=3600',
        'Content-Length':      String(body.byteLength),
      },
    });
  } catch (err: any) {
    console.error('[/api/files] error:', err);
    return new NextResponse(err.message || 'Server error', { status: 500 });
  }
}
