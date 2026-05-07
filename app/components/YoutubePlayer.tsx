"use client";

interface Props {
  videoId: string;
}

export default function YoutubePlayer({ videoId }: Props) {
  // autoplay=1로 자동 재생 시도. 브라우저가 사운드 자동재생을 차단하면
  // YouTube가 큰 재생 버튼을 보여주므로 사용자 1회 클릭으로 재생됨.
  // playsinline=1로 모바일 인라인 재생, modestbranding=1로 로고 최소화.
  // BGM 용도이므로 mute=1은 쓰지 않는다.
  // 브라우저가 사운드 자동재생을 차단하면 YouTube가 큰 재생 버튼을 노출 →
  // 사용자 1회 클릭으로 사운드까지 함께 재생되는 편이 음소거 자동시작보다 자연스러움.
  const src = `https://www.youtube.com/embed/${encodeURIComponent(
    videoId,
  )}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-onair-line">
      <iframe
        key={videoId}
        src={src}
        title="YouTube"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
