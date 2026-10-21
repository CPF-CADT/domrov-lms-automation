import Icon from "@/components/data-display/Icon";
import SectionHeader from "@/components/data-display/SectionHeader";
import CardBase from "@/components/primitives/CardBase";
import SectionWrapper from "@/components/primitives/SectionWrapper";
import { VISION_CARDS } from "@/config/About";

/**
 * VisionCards - Displays innovation, learning, and future vision cards.
 * Uses CardBase for consistent card styling.
 */
export default function VisionCards() {
  return (
    <SectionWrapper>
      <SectionHeader
        title="The Challenge and The Solution"
        centered
        className="mb-12"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {VISION_CARDS.map((item) => (
          <CardBase key={item.id}>
            <div className="flex flex-col items-center text-center gap-3">
              <Icon name={item.icon} size="4xl" className="text-accent mb-1" />
              <h3 className="font-bold text-xl text-primary">{item.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          </CardBase>
        ))}
      </div>
    </SectionWrapper>
  );
}
