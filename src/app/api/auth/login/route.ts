import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = encodeURIComponent('https://build-co-llm-controller.netlify.app/api/auth/callback/github');
  const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;

  return NextResponse.redirect(githubOAuthUrl);
}
