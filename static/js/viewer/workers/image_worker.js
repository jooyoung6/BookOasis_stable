// image_worker.js — 웹워커 자리표시자
self.addEventListener('message', async (e) => {
  const { action, url, id } = e.data || {};
  if (action === 'fetch' && url) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const buffer = await res.arrayBuffer();
      // Transfer ArrayBuffer back to main thread
      self.postMessage({ success: true, id, buffer, contentType }, [buffer]);
    } catch (err) {
      self.postMessage({ success: false, id, error: String(err) });
    }
  }
});
