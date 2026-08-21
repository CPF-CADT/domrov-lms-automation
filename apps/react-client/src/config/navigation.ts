export interface NavLinkItem {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Features" },
  { href: "/about", label: "About Us" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "User Guide" },
];

export const CTA_LINK = { href: "/login", label: "Get Started" };
