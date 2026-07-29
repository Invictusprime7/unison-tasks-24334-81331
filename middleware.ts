import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: '/',
};

export default function middleware(request: Request) {
  if (request.headers.get('referer')?.includes('/web-builder')) {
    return rewrite(new URL('/sandpack/index.html', request.url));
  }

  return next();
}
