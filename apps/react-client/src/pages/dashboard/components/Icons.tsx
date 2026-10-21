import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function HomeIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function BookIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h9A2.5 2.5 0 0 1 19 4.5v15a.5.5 0 0 1-.79.41L12 15.5l-6.21 4.41A.5.5 0 0 1 5 19.5z" />
    </svg>
  );
}

export function ReportIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 2a1 1 0 0 1 .9.56l1.38 2.76 3.05.44a1 1 0 0 1 .55 1.7l-2.2 2.15.52 3.03a1 1 0 0 1-1.45 1.05L12 12.97 9.25 14.7a1 1 0 0 1-1.45-1.05l.52-3.03-2.2-2.15a1 1 0 0 1 .55-1.7l3.05-.44L11.1 2.56A1 1 0 0 1 12 2Z" />
    </svg>
  );
}

export function BellIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 6 14h12a1 1 0 0 0 .707-1.707L18 11.586V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.995-2.824L15 19h-6a3 3 0 0 0 2.824 2.995L12 22Z" />
    </svg>
  );
}

export function CogIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M11.447 2.105a1 1 0 0 1 1.106 0l1.778 1.185 2.093-.35a1 1 0 0 1 1.133.81l.35 2.093 1.185 1.778a1 1 0 0 1 0 1.106l-1.185 1.778-.35 2.093a1 1 0 0 1-1.133.81l-2.093-.35-1.778 1.185a1 1 0 0 1-1.106 0l-1.778-1.185-2.093.35a1 1 0 0 1-1.133-.81l-.35-2.093-1.185-1.778a1 1 0 0 1 0-1.106l1.185-1.778.35-2.093a1 1 0 0 1 1.133-.81l2.093.35Z" />
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

export function LockIcon({ className = "h-5 w-5", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M7 9V7a5 5 0 1 1 10 0v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Zm2 0h6V7a3 3 0 1 0-6 0z" />
    </svg>
  );
}

export function UserIcon({ className = "h-6 w-6", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 12c4.418 0 8 2.462 8 5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5C4 16.462 7.582 14 12 14Z" />
    </svg>
  );
}
