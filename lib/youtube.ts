/**
 * YouTube URL/ID 입력에서 11자 video ID를 추출.
 * 대응 포맷:
 *  - VIDEO_ID 그대로 (정규식 매칭)
 *  - https://www.youtube.com/watch?v=VIDEO_ID&...
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 *  - https://www.youtube.com/live/VIDEO_ID
 * 매칭 실패 시 null.
 */
export function extractYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // bare ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns: RegExp[] = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}
