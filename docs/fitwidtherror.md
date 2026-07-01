# fit-width 오류 분석

## 증상
- `너비맞춤` 버튼을 눌러도 만화 페이지가 화면 너비에 맞춰지지 않고, `높이맞춤` 모드처럼 보인다.
- 특히 단일 페이지(`1장보기`) 뷰에서도 같은 현상이 발생한다.

## 예상 원인
- `fit-width` 모드는 `renderer.js`에서 `applyComicFitMode()`를 통해 `.comic-image-wrapper.fit-width` 클래스를 적용한다.
- 그러나 페이지 모드에서는 이미지가 `.comic-page-pair img` 구조 안에 들어가며, 이 구조에 대한 CSS 규칙이 `fit-height` 스타일과 충돌할 가능성이 있다.
- 즉, `fit-width`가 활성화되어도 `.comic-image-wrapper.fit-width .comic-page-pair img` 규칙이 `width: auto`로 남아 있을 때, 실제 렌더링은 높이 기준 출력에 가까워진다.

## 관련 코드

### `static/js/viewer/renderer.js`
- `setComicFitMode(mode)`
  - `Settings.setFitMode(mode)` 호출
  - `applyComicFitMode()` 호출
- `applyComicFitMode()`
  - `.comic-image-wrapper`에 `fit-width` 또는 `fit-height` 클래스를 토글
  - 스크롤 모드(`scroll`)면 `scroll-mode` 클래스도 추가
- 페이지 모드 렌더링에서 `pageIndices.length === 1` 시 `pairContainer.classList.add('single-page')` 처리

### `static/js/viewer_comic.js`
- `export function setComicFitMode(...args)`
  - `Renderer.setComicFitMode` 또는 `Settings.setFitMode` 호출
- `export function applyComicFitMode(...args)`
  - `Renderer.applyComicFitMode` 호출

### `static/css/tab_media_library_viewer.css`
- `.comic-image-wrapper.fit-width img`
  - `width: 100%; height: auto; max-height: none;`
- `.comic-image-wrapper.fit-height img`
  - `position: absolute; transform: translate(-50%, -50%);` 등 높이 중심 스타일
- `.comic-image-wrapper.fit-height .comic-page-pair img,
  .comic-image-wrapper.fit-width .comic-page-pair img`
  - `width: auto; max-width: 50%;` 등 페이지 모드 공통 스타일
- 추가로 고려할 규칙
  - `.comic-image-wrapper.fit-width .comic-page-pair.single-page img`
  - 이 규칙이 `fit-width` 단일 페이지에서 `width:100%`를 보장하도록 검토 필요

## 정리
- 현재 증상은 `fit-width` 클래스가 적용되더라도 페이지 모드용 CSS가 우선순위 또는 구체성 문제로 `너비맞춤` 동작을 덮어쓰는 것으로 보인다.
- 특히 `1장보기` 상태에서는 `single-page` 클래스가 실제로 적용되고 있는지, 그리고 해당 상황에서 `fit-width`가 `width:100%`를 명시적으로 강제하는지 확인해야 한다.
- 추가로 `renderer.js`의 `loadComicPage()`가 단일 페이지를 렌더링할 때 `pairContainer.classList.add('single-page')`가 정상 실행되는지 검증할 필요가 있다.
