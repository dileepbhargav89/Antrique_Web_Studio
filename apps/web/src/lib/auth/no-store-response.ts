import { NextResponse } from 'next/server';

/**
 * `NextResponse.json()` with an explicit `Cache-Control: no-store` header — defense in
 * depth for the auth BFF routes specifically, which return a real access token in the
 * response body. Calling `cookies()` already makes these routes dynamic (opted out of
 * Next's own build-time render cache), but that's a different concern from the actual HTTP
 * response header a downstream proxy/CDN would honor; this closes that gap explicitly
 * rather than relying on it being true by coincidence of another mechanism.
 */
export function noStoreJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...init?.headers, 'Cache-Control': 'no-store' },
  });
}
