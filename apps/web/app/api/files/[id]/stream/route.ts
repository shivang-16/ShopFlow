import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from backend API with auth token
    const response = await fetch(`${API_URL}/api/files/${id}/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { message: error || 'Failed to fetch file' },
        { status: response.status }
      );
    }

    // Stream the response
    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const contentDisposition = response.headers.get('content-disposition');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { message: 'Failed to stream file' },
      { status: 500 }
    );
  }
}
