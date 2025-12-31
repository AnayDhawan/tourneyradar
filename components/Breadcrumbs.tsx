"use client";

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "0.875rem",
      color: "var(--text-secondary)",
      marginBottom: "1.5rem",
      flexWrap: "wrap"
    }}>
      <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
        Home
      </Link>
      {items.map((item, index) => (
        <span key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>/</span>
          {item.href ? (
            <Link href={item.href} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
