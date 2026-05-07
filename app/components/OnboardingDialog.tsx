"use client";

import ProfileDialog from "./ProfileDialog";
import type { UserProfile } from "@/lib/types";

interface Props {
  onSubmit: (profile: UserProfile) => void;
}

export default function OnboardingDialog({ onSubmit }: Props) {
  // 페이지 본문에서 띄우는 온보딩은 portal 없이 inline 렌더 → 마운트 지연 제거.
  return <ProfileDialog onSubmit={onSubmit} portal={false} />;
}
