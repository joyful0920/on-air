"use client";

import ProfileDialog from "./ProfileDialog";
import type { UserProfile } from "@/lib/types";

interface Props {
  onSubmit: (profile: UserProfile) => void;
}

export default function OnboardingDialog({ onSubmit }: Props) {
  return <ProfileDialog onSubmit={onSubmit} />;
}
