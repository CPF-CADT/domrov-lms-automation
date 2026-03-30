import { EmptyState } from "@/components/data-display";
import ClassCard from "@/features/dashboard/components/ClassCard";
import type { ClassCard as ClassCardType } from "@/types/classCard";

interface ClassGridProps {
  items: ClassCardType[];
  onOpen?: (id: string, role?: string) => void;
  activeClassId?: string | number | null;
  onEdit?: (id: string) => void;
  onViewMembers?: (id: string) => void;
  onLeaveClass?: (id: string) => void;
  onDeleteClass?: (id: string) => void;
  onShareClass?: (id: string) => void;
}

/**
 * ClassGrid - Displays a grid of class cards or empty state.
 * Handles the case when no classes are available for the selected term.
 */
export default function ClassGrid({
  items,
  onOpen,
  activeClassId,
  onEdit,
  onViewMembers,
  onLeaveClass,
  onDeleteClass,
  onShareClass,
}: ClassGridProps) {
  if (items.length === 0) {
    return (
      <div className="col-span-full">
        <EmptyState message="No classes for this term yet." icon="school" />
      </div>
    );
  }

  return (
    <>
      {items.map((classItem) => (
        <ClassCard
          key={classItem.id}
          classItem={classItem}
          onOpen={onOpen}
          isActive={classItem.id?.toString() === activeClassId?.toString()}
          onEdit={onEdit}
          onViewMembers={onViewMembers}
          onLeaveClass={onLeaveClass}
          onDeleteClass={onDeleteClass}
          onShareClass={onShareClass}
        />
      ))}
    </>
  );
}
