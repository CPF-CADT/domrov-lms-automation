import CardStatusBadge from "./CardStatusBadge";

interface CardFooterActionsProps {
  accent: string;
  onOpen?: () => void;
}

/**
 * CardFooterActions - Card footer with status badge and action button.
 * Used in ClassCard for displaying status and open action.
 */
export default function CardFooterActions({
  accent,
  onOpen,
}: CardFooterActionsProps) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <CardStatusBadge accent={accent} />
      <button
        className="text-primary text-sm font-semibold hover:underline"
        onClick={onOpen}
      >
        Open
      </button>
    </div>
  );
}
