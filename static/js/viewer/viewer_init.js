// viewer_init.js — 엔트리 포인트 (type=module)
import * as Settings from './reader_settings.js';
import * as Renderer from './renderer.js';
import * as Navigation from './navigation.js';

export async function initViewer(bookId, pagesRead, totalPages) {
  // 초기 설정
  Settings.initReadingDirection();
  Settings.initPageStep();

  // 렌더러 초기화—현재 로딩 및 상태 설정을 renderer가 담당
  await Renderer.initRenderer(bookId, pagesRead, totalPages);
}

// 하위 호환: 기존 initComicViewer 호출을 기대하는 코드 지원
export const initComicViewer = initViewer;
