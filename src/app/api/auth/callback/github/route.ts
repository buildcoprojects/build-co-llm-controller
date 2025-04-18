import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });

  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  // Normally you'd store this token securely (DB, session, encrypted cookie, etc.)
  return NextResponse.json({ access_token: data.access_token });
}
