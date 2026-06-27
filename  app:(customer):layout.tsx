// app/(customer)/layout.tsx
// Minimal wrapper — no persistent chrome on customer pages.
// Each page manages its own header (branded per-restaurant).
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
