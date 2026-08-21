type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarShape = "circle" | "rounded";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  bgColor?: string;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-8 h-8 text-xs",
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl",
};

const SHAPE_CLASSES: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
};

const COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-green-600",
  "bg-orange-600",
  "bg-red-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-pink-600",
];

function getInitials(name: string): string {
  if (!name.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getColor(name: string): string {
  if (!name.trim()) return COLORS[0];
  return COLORS[name.charCodeAt(0) % COLORS.length];
}

export default function Avatar({
  name,
  size = "md",
  shape = "circle",
  bgColor,
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`${SIZE_CLASSES[size]} ${SHAPE_CLASSES[shape]} ${bgColor ?? getColor(name)} flex items-center justify-center text-white font-bold ${className}`.trim()}
    >
      {getInitials(name)}
    </div>
  );
}
