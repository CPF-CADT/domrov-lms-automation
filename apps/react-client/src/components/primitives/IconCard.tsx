import { Icon } from "@/components/data-display";
import type { IconCard as IconCardType } from "@/config/landing";

type IconSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

type IconCardSize = "sm" | "md";

interface IconCardProps {
    item: IconCardType;
    size?: IconCardSize;
}

const SIZE_CONFIG: Record<IconCardSize, { gap: string; iconSize: IconSize; titleSize: string; innerGap: string }> = {
    sm: { gap: "gap-3", iconSize: "3xl", titleSize: "text-lg", innerGap: "gap-1" },
    md: { gap: "gap-4", iconSize: "4xl", titleSize: "text-xl", innerGap: "gap-2" },
};

export default function IconCard({ item, size = "sm" }: IconCardProps) {
    const config = SIZE_CONFIG[size];
    return (
        <div className={`flex flex-col ${config.gap} rounded-lg border border-blue-200 bg-white p-6 shadow-lg hover:shadow-2xl transition-all`}>
            <Icon name={item.icon} size={config.iconSize} className="text-primary" />
            <div className={`flex flex-col ${config.innerGap}`}>
                <h3 className={`text-primary ${config.titleSize} font-bold leading-tight`}>
                    {item.title}
                </h3>
                <p className="text-slate-600 text-base leading-normal">{item.desc}</p>
            </div>
        </div>
    );
}
