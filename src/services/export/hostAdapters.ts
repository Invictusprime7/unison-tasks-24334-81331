/**
 * Static-host SPA fallback adapters. Included in every source-project export
 * so `dist/` (or the built output) drops cleanly into any major static host.
 */

export function netlifyRedirects(): string {
  return `/*  /index.html  200\n`;
}

export function vercelJson(): string {
  return (
    JSON.stringify(
      {
        rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      },
      null,
      2,
    ) + '\n'
  );
}

export function netlifyToml(): string {
  return `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
}

export function githubPages404Html(): string {
  // Minimal SPA-redirect trick for gh-pages: 404.html rewrites to /index.html
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Redirecting…</title>
<script>
  var l = window.location;
  l.replace(l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + '/' +
    l.pathname.split('/').slice(1).join('/').replace(/\\//g, '?/') + l.search + l.hash);
</script>
</head><body></body></html>
`;
}
