import { nameInitial } from "@/lib/types";
import type { UserColor } from "@/lib/types";
import { AvatarIcon } from "@/lib/avatarIcons";
import { isIconKey } from "@/lib/nicknames";

interface AvatarProps {
  name: string;
  color: UserColor;
  iconKey?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, { box: string; icon: number }> = {
  sm: { box: "w-7 h-7 text-sm", icon: 18 },
  md: { box: "w-10 h-10 text-base", icon: 26 },
  lg: { box: "w-14 h-14 text-2xl", icon: 36 },
};

export default function Avatar({ name, color, iconKey, size = "md" }: AvatarProps) {
  const { box, icon } = SIZE_MAP[size];
  const showIcon = iconKey && isIconKey(iconKey);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white select-none ${box}`}
      style={{ background: color }}
      aria-label={name}
    >
      {showIcon ? <AvatarIcon iconKey={iconKey} size={icon} /> : <span>{nameInitial(name)}</span>}
    </span>
  );
}
