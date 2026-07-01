// ui.js — 단순 UI 바인딩 헬퍼
export function bindViewerUI() {
  const overlayBtn = document.getElementById('btn-toggle-overlay');
  if (overlayBtn) {
    overlayBtn.addEventListener('click', () => {
      import('./navigation.js').then(m => m.toggleComicOverlay());
    });
  }
}
