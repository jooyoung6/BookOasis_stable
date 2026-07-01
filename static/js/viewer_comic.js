// viewer_comic.js – 만화 ZIP 뷰어 로직
import { state } from './state.js';
import { showViewerLoading, hideViewerLoading, showViewerError } from './view_manager.js';
import { saveProgress } from './viewer_progress.js';

export let comicFitMode = 'height'; // 기본: 높이에 맞추기
export let comicCurrentPage = 0;
export let comicTotalPages = 0;
let comicLoadingTimer = null;
let observer = null;
let isScrollingToTarget = false;
let comicReadingDirection = 'ltr';
let comicPageStep = 1;

function getStoredComicReadingDirection() {
  const saved = localStorage.getItem('comic_reading_direction');
  return saved === 'rtl' ? 'rtl' : 'ltr';
}

function setComicReadingDirection(direction) {
  comicReadingDirection = direction === 'rtl' ? 'rtl' : 'ltr';
  localStorage.setItem('comic_reading_direction', comicReadingDirection);
  syncComicReadingDirectionUI();
  return comicReadingDirection;
}

export function getComicReadingDirection() {
  return comicReadingDirection;
}

export function toggleComicReadingDirection() {
  const nextDirection = comicReadingDirection === 'rtl' ? 'ltr' : 'rtl';
  return setComicReadingDirection(nextDirection);
}

function getStoredComicPageStep() {
  const saved = parseInt(localStorage.getItem('comic_page_step'), 10);
  return saved === 2 ? 2 : 1;
}

export function setComicPageStep(step) {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  const safeStep = step === 2 ? 2 : 1;
  if (scrollMode === 'scroll') {
    comicPageStep = 1;
    localStorage.setItem('comic_page_step', '1');
    syncComicPageStepUI();
    return 1;
  }

  comicPageStep = safeStep;
  localStorage.setItem('comic_page_step', String(comicPageStep));
  syncComicPageStepUI();
  return comicPageStep;
}

export function getComicPageStep() {
  return comicPageStep;
}

export function toggleComicPageStep() {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  if (scrollMode === 'scroll') {
    return setComicPageStep(1);
  }
  return setComicPageStep(comicPageStep === 2 ? 1 : 2);
}

function getComicDisplayPageIndex(basePage) {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  const displayPage = (scrollMode === 'scroll' || comicPageStep !== 2)
    ? basePage
    : (comicReadingDirection === 'rtl'
      ? Math.min(basePage + 1, Math.max(0, comicTotalPages - 1))
      : basePage);
  console.log(`[Viewer-Comic] getComicDisplayPageIndex - basePage=${basePage}, scrollMode=${scrollMode}, comicPageStep=${comicPageStep}, comicReadingDirection=${comicReadingDirection}, displayPage=${displayPage}`);
  return displayPage;
}

function getComicPageIndices() {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  const displayPageIndex = getComicDisplayPageIndex(comicCurrentPage);
  if (scrollMode === 'scroll' || comicPageStep !== 2) {
    console.log(`[Viewer-Comic] getComicPageIndices - single page mode, pageIndex=${displayPageIndex}`);
    return [displayPageIndex];
  }

  if (comicReadingDirection === 'rtl') {
    const prevPage = displayPageIndex - 1;
    const indices = prevPage >= 0 ? [displayPageIndex, prevPage] : [displayPageIndex];
    console.log(`[Viewer-Comic] getComicPageIndices - rtl 2-page mode, indices=${indices.join(',')}`);
    return indices;
  }

  const nextPage = displayPageIndex + 1;
  const indices = nextPage < comicTotalPages ? [displayPageIndex, nextPage] : [displayPageIndex];
  console.log(`[Viewer-Comic] getComicPageIndices - ltr 2-page mode, indices=${indices.join(',')}`);
  return indices;
}

function syncComicReadingDirectionUI() {
  const btn = document.getElementById('btn-comic-reading-direction');
  const label = document.getElementById('comic-reading-direction-label');
  if (btn) {
    btn.classList.toggle('active', comicReadingDirection === 'rtl');
    btn.setAttribute('data-direction', comicReadingDirection);
    btn.title = comicReadingDirection === 'rtl' ? '오른쪽→왼쪽 읽기' : '왼쪽→오른쪽 읽기';
  }
  if (label) {
    label.textContent = comicReadingDirection === 'rtl' ? '오른쪽→왼쪽' : '왼쪽→오른쪽';
  }
}

function syncComicPageStepUI() {
  const btn = document.getElementById('btn-comic-page-step');
  const label = document.getElementById('comic-page-step-label');
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  if (btn) {
    btn.classList.toggle('active', comicPageStep === 2 && scrollMode !== 'scroll');
    btn.setAttribute('data-step', String(comicPageStep));
    btn.title = scrollMode === 'scroll' ? '스크롤 모드에서는 1장씩만 적용됩니다' : (comicPageStep === 2 ? '2장씩 보기' : '1장씩 보기');
  }
  if (label) {
    label.textContent = scrollMode === 'scroll' ? '1장' : `${comicPageStep}장`;
  }
}

export function initComicReadingDirection() {
  setComicReadingDirection(getStoredComicReadingDirection());
}

export function initComicPageStep() {
  setComicPageStep(getStoredComicPageStep());
}

export async function initComicViewer(bookId, pagesRead, totalPages) {
  console.log(`[Viewer-Comic] initComicViewer - 읽은 페이지: ${pagesRead}, 전체 페이지: ${totalPages}`);
  document.getElementById('comic-viewer-container').style.display = 'flex';
  document.getElementById('comic-fit-controls').style.display = 'flex';
  
  comicCurrentPage = pagesRead > 0 ? pagesRead - 1 : 0;
  comicTotalPages = totalPages;
  
  // 만약 뷰어 진입 시 totalPages가 0이면, 백엔드에 1권 단위를 강제 해석하도록 요청
  if (comicTotalPages === 0) {
    try {
      showViewerLoading('로딩 중...');
      const libType = state.currentLibraryType || 'general';
      const res = await fetch(`/api/media/books/${bookId}/info?type=${libType}`);
      const data = await res.json();
      if (data.success && data.total_pages > 0) {
        comicTotalPages = data.total_pages;
        console.log(`[Viewer-Comic] 동적 페이지 계산 완료: ${comicTotalPages} pages`);
      }
      hideViewerLoading();
    } catch (e) {
      console.error('[Viewer-Comic] 동적 페이지 로딩 실패:', e);
      hideViewerLoading();
    }
  }

  initComicReadingDirection();
  initComicPageStep();
  console.log(`[Viewer-Comic] initComicViewer 상태 - direction=${comicReadingDirection}, page_step=${comicPageStep}, scroll_mode=${localStorage.getItem('viewer_scroll_mode') || 'page'}, comicCurrentPage=${comicCurrentPage}, comicTotalPages=${comicTotalPages}`);
  applyComicFitMode();
  loadComicPage();
}

// 만화 이미지 맞추기 모드 전환
export function setComicFitMode(mode) {
  comicFitMode = mode;
  const btnHeight = document.getElementById('btn-fit-height');
  const btnWidth = document.getElementById('btn-fit-width');
  if (btnHeight) btnHeight.classList.toggle('active', mode === 'height');
  if (btnWidth) btnWidth.classList.toggle('active', mode === 'width');

  const btnOverlayHeight = document.getElementById('btn-overlay-fit-height');
  const btnOverlayWidth = document.getElementById('btn-overlay-fit-width');
  if (btnOverlayHeight) btnOverlayHeight.classList.toggle('active', mode === 'height');
  if (btnOverlayWidth) btnOverlayWidth.classList.toggle('active', mode === 'width');

  applyComicFitMode();
}

export function applyComicFitMode() {
  const wrapper = document.querySelector('.comic-image-wrapper');
  if (!wrapper) return;
  
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  
  wrapper.classList.remove('fit-height', 'fit-width', 'scroll-mode');
  wrapper.classList.add(comicFitMode === 'width' ? 'fit-width' : 'fit-height');
  
  if (scrollMode === 'scroll') {
    wrapper.classList.add('scroll-mode');
  }
}

export function loadComicPage() {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  const wrapper = document.querySelector('.comic-image-wrapper');
  if (!wrapper) return;

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (scrollMode === 'scroll') {
    console.log(`[Viewer-Comic] 스크롤 모드 로드 시작 - 현재 페이지: ${comicCurrentPage}`);
    showViewerLoading(i18n.t("viewer.loading_comic_scroll_title"), i18n.t("viewer.loading_comic_scroll_sub"));

    wrapper.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const imgElements = [];

    for (let i = 0; i < comicTotalPages; i++) {
      const img = document.createElement('img');
      img.className = 'comic-scroll-img';
      img.dataset.index = i;
      img.alt = `Page ${i + 1}`;
      img.loading = 'lazy';
      
      img.src = `/api/media/stream?db_type=${state.currentLibraryType}&book_id=${state.activeBookId}&page_idx=${i}`;
      
      fragment.appendChild(img);
      imgElements.push(img);
    }
    
    wrapper.appendChild(fragment);
    hideViewerLoading();

    const observerOptions = {
      root: wrapper,
      rootMargin: '0px',
      threshold: 0.3
    };

    observer = new IntersectionObserver((entries) => {
      if (isScrollingToTarget) return;
      
      let bestEntry = null;
      let maxRatio = 0;

      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          bestEntry = entry;
        }
      });

      if (bestEntry) {
        const pageIdx = parseInt(bestEntry.target.dataset.index, 10);
        if (pageIdx !== comicCurrentPage) {
          comicCurrentPage = pageIdx;
          updatePageInfo();
          saveProgress(state.activeBookId, comicCurrentPage, comicTotalPages);
        }
      }
    }, observerOptions);

    imgElements.forEach(img => observer.observe(img));

    isScrollingToTarget = true;
    setTimeout(() => {
      const targetImg = imgElements[comicCurrentPage];
      if (targetImg) {
        targetImg.scrollIntoView({ block: 'start' });
      }
      setTimeout(() => {
        isScrollingToTarget = false;
      }, 300);
    }, 100);

    updatePageInfo();

  } else {
    const pageIndices = getComicPageIndices();
    console.log(`[Viewer-Comic] 페이지 모드 로드 시작 - logical_page=${comicCurrentPage}, display_pages=${pageIndices.join(',')}, wrapperExists=${!!wrapper}`);

    if (comicLoadingTimer) {
      clearTimeout(comicLoadingTimer);
      comicLoadingTimer = null;
    }

    const delayStr = localStorage.getItem('comic_loading_delay');
    const delay = (delayStr !== null) ? parseInt(delayStr, 10) : 300;

    comicLoadingTimer = setTimeout(() => {
      document.querySelectorAll('.comic-page-img').forEach(img => img.style.opacity = '0');
      showViewerLoading(i18n.t("viewer.loading_comic_title"), i18n.t("viewer.loading_comic_sub"));
    }, delay);

    wrapper.innerHTML = '<div class="comic-page-pair" style="visibility: hidden;"></div>';
    const pairContainer = wrapper.querySelector('.comic-page-pair');
    let loadedCount = 0;
    const expectedLoads = pageIndices.length;
    const imageElements = [];

    pageIndices.forEach((pageIndex, index) => {
      const imgEl = document.createElement('img');
      imgEl.className = `comic-page-img ${expectedLoads === 2 ? (index === 0 ? 'comic-page-img-left' : 'comic-page-img-right') : ''}`.trim();
      imgEl.dataset.index = pageIndex;
      imgEl.alt = `Page ${pageIndex + 1}`;
      imgEl.loading = 'eager';
      imgEl.style.opacity = '0';

      imgEl.onload = () => {
        loadedCount += 1;
        imageElements[index] = imgEl;
        if (loadedCount === expectedLoads) {
          if (comicLoadingTimer) {
            clearTimeout(comicLoadingTimer);
            comicLoadingTimer = null;
          }
          pairContainer.innerHTML = '';
          imageElements.forEach((loadedImg, loadedIndex) => {
            if (loadedImg) {
              loadedImg.style.opacity = '1';
              pairContainer.appendChild(loadedImg);
            }
          });
          pairContainer.style.visibility = 'visible';
          hideViewerLoading();

          if (comicCurrentPage === 0 && pageIndices.length === 1) {
            const aspectRatio = imageElements[0].naturalWidth / imageElements[0].naturalHeight;
            if (aspectRatio < 0.7) {
              setComicFitMode('width');
            } else {
              setComicFitMode('height');
            }
          }

          preloadNextPages();
        }
      };

      imgEl.onerror = () => {
        console.error(`[Viewer-Comic] 만화 이미지 로드 실패: page_idx=${pageIndex}`);
        if (comicLoadingTimer) {
          clearTimeout(comicLoadingTimer);
          comicLoadingTimer = null;
        }
        showViewerError(i18n.t("viewer.error_comic_title"), i18n.t("viewer.error_comic_sub"));
        imgEl.style.opacity = '1';
      };

      imgEl.src = `/api/media/stream?db_type=${state.currentLibraryType}&book_id=${state.activeBookId}&page_idx=${pageIndex}`;
      imageElements[index] = imgEl;
      console.log(`[Viewer-Comic] 이미지 요청 시작 - pageIndex=${pageIndex}, class=${imgEl.className}`);
    });

    console.log(`[Viewer-Comic] 페이지 모드 준비 - expectedLoads=${expectedLoads}`);
    updatePageInfo();
    saveProgress(state.activeBookId, comicCurrentPage, comicTotalPages);
  }
}

function updatePageInfo() {
  const infoEl = document.getElementById('comic-page-info');
  const overlayInfoEl = document.getElementById('comic-overlay-page-info');
  const indices = getComicPageIndices();
  const totalPages = comicTotalPages || '?';
  const startPage = indices[0] + 1;
  const endPage = indices[indices.length - 1] + 1;
  const textInfo = indices.length === 2
    ? `${startPage}-${endPage} / ${totalPages}`
    : `${startPage} / ${totalPages}`;

  if (infoEl) infoEl.textContent = textInfo;
  if (overlayInfoEl) overlayInfoEl.textContent = textInfo;

  const overlayTitleEl = document.getElementById('overlay-title-text');
  if (overlayTitleEl) overlayTitleEl.textContent = document.getElementById('viewer-title-text').textContent;

  // 시크바 thumb 위치 동기화
  syncSeekBar();
}

// ─────────────────────────────────────────────────────────────
// 📌 페이지 시크바 (Seek Bar) 관련 함수
// ─────────────────────────────────────────────────────────────

let _seekbarInited = false; // 이벤트 중복 등록 방지 플래그

// 뷰어 라우터용 슬라이더 드래그 중(input) 이벤트
export function comicSliderInput(slider, val) {
  showSeekbarTooltip(slider, val);
  const badge = document.getElementById('comic-overlay-page-info');
  if (badge) badge.textContent = `${val} / ${comicTotalPages}`;
}

// 뷰어 라우터용 슬라이더 드래그 완료(change) 이벤트
export function comicSliderChange(slider, val) {
  hideSeekbarTooltip();
  comicCurrentPage = val - 1;
  loadComicPage();
}

/**
 * 현재 페이지에 맞게 슬라이더 thumb 위치를 동기화합니다.
 */
function syncSeekBar() {
  const slider = document.getElementById('viewer-page-slider');
  if (!slider) return;
  slider.max = comicTotalPages || 1;
  slider.value = comicCurrentPage + 1;
  const endLabel = document.getElementById('seekbar-end-label');
  if (endLabel) endLabel.textContent = comicTotalPages || '?';
}

/**
 * 슬라이더 thumb 위치 기반으로 툴팁 X좌표를 계산하여 표시합니다.
 * @param {HTMLInputElement} slider
 * @param {number} page - 현재 선택된 페이지 번호 (1-indexed)
 */
function showSeekbarTooltip(slider, page) {
  const tooltip = document.getElementById('seekbar-tooltip');
  if (!tooltip) return;

  const min = parseInt(slider.min, 10) || 1;
  const max = parseInt(slider.max, 10) || 1;
  const ratio = (page - min) / (max - min || 1);
  const trackWidth = slider.offsetWidth;
  const thumbHalf = 9; // thumb 반지름(px)
  const leftPx = thumbHalf + ratio * (trackWidth - thumbHalf * 2);

  tooltip.textContent = page;
  tooltip.style.left = `${leftPx}px`;
  tooltip.classList.add('visible');
}

/**
 * 툴팁을 숨깁니다.
 */
function hideSeekbarTooltip() {
  const tooltip = document.getElementById('seekbar-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

// ─────────────────────────────────────────────────────────────

// Kavita 스타일 오버레이 메뉴 토글
export function toggleComicOverlay() {
  const menu = document.getElementById('comic-overlay-menu');
  if (!menu) return;
  const isOpening = (menu.style.display === 'none');
  menu.style.display = isOpening ? 'flex' : 'none';
  // 메뉴가 열릴 때 시크바를 현재 페이지에 맞게 동기화
  if (isOpening) syncSeekBar();
}

// 처음부터 보기
export function comicJumpToFirstPage() {
  comicCurrentPage = 0;
  loadComicPage();
  toggleComicOverlay();
}

// 마지막 페이지로 이동
export function comicJumpToLastPage() {
  comicCurrentPage = Math.max(0, comicTotalPages - 1);
  loadComicPage();
  toggleComicOverlay();
}

// 읽음 완료 처리 (진척도를 마지막 페이지로 강제 세팅)
export function markAsCompleted() {
  if (comicTotalPages > 0) {
    comicCurrentPage = comicTotalPages - 1;
    loadComicPage();
    
    // 즉시 진척도 동기 전송 (Alert 블로킹으로 인한 누수 차단)
    saveProgress(state.activeBookId, comicCurrentPage, comicTotalPages);
    import('./viewer_progress.js').then(m => {
      m.flushProgress();
    });

    alert(i18n.t('viewer.read_completed'));
    toggleComicOverlay();
  }
}

export function nextComicPage() {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  if (scrollMode === 'scroll') {
    if (comicCurrentPage < comicTotalPages - 1) {
      isScrollingToTarget = true;
      comicCurrentPage++;
      const targetImg = document.querySelector(`.comic-scroll-img[data-index="${comicCurrentPage}"]`);
      if (targetImg) {
        targetImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updatePageInfo();
      saveProgress(state.activeBookId, comicCurrentPage, comicTotalPages);
      setTimeout(() => { isScrollingToTarget = false; }, 500);
    } else {
      import('./viewer_next_episode.js').then(m => {
        m.handleNextEpisode(state.activeBookId);
      });
    }
  } else {
    const step = comicPageStep || 1;
    const nextPage = Math.min(comicCurrentPage + step, comicTotalPages - 1);
    if (nextPage !== comicCurrentPage) {
      comicCurrentPage = nextPage;
      loadComicPage();
    } else {
      import('./viewer_next_episode.js').then(m => {
        m.handleNextEpisode(state.activeBookId);
      });
    }
  }
}

export function prevComicPage() {
  const scrollMode = localStorage.getItem('viewer_scroll_mode') || 'page';
  if (scrollMode === 'scroll') {
    if (comicCurrentPage > 0) {
      isScrollingToTarget = true;
      comicCurrentPage--;
      const targetImg = document.querySelector(`.comic-scroll-img[data-index="${comicCurrentPage}"]`);
      if (targetImg) {
        targetImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      updatePageInfo();
      saveProgress(state.activeBookId, comicCurrentPage, comicTotalPages);
      setTimeout(() => { isScrollingToTarget = false; }, 500);
    }
  } else {
    const step = comicPageStep || 1;
    const prevPage = Math.max(comicCurrentPage - step, 0);
    if (prevPage !== comicCurrentPage) {
      comicCurrentPage = prevPage;
      loadComicPage();
    }
  }
}

// 다음 2개 페이지 이미지 비동기 프리로드 헬퍼
function preloadNextPages() {
  const preloadCount = 2;
  const basePage = getComicDisplayPageIndex(comicCurrentPage);
  for (let i = 1; i <= preloadCount; i++) {
    const nextIdx = basePage + i;
    if (nextIdx < comicTotalPages) {
      const preloadImg = new Image();
      preloadImg.src = `/api/media/stream?db_type=${state.currentLibraryType}&book_id=${state.activeBookId}&page_idx=${nextIdx}`;
    }
  }
}

