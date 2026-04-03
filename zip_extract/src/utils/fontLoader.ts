export async function loadWebFont(fontFamily: string): Promise<void> {
  const family = fontFamily.replace(/\s+/g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100;300;400;500;600;700;800;900&display=swap`;
  if (!document.querySelector(`link[data-font='${family}']`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-font', family);
    document.head.appendChild(link);
  }
  try {
    await (document as any).fonts.load(`1rem '${fontFamily}'`);
  } catch {
    // ignore
  }
}

