"use client";

export default function TournamentCardSkeleton() {
  return (
    <div className="card" style={{ 
      display: "flex", 
      flexDirection: "column",
      animation: "pulse 2s infinite"
    }}>
      <div style={{ 
        height: "24px", 
        width: "100px", 
        background: "var(--surface-elevated)", 
        borderRadius: "12px",
        marginBottom: "1rem"
      }} />
      <div style={{ 
        height: "32px", 
        width: "80%", 
        background: "var(--surface-elevated)", 
        borderRadius: "8px",
        marginBottom: "1rem"
      }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ height: "20px", width: "60%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
        <div style={{ height: "20px", width: "70%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
        <div style={{ height: "20px", width: "50%", background: "var(--surface-elevated)", borderRadius: "6px" }} />
      </div>
      <div style={{ 
        height: "44px", 
        width: "100%", 
        background: "var(--surface-elevated)", 
        borderRadius: "8px"
      }} />
    </div>
  );
}
