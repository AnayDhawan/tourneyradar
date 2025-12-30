export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--background)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div className="loading-spinner" style={{
          width: "50px",
          height: "50px",
          border: "4px solid var(--border)",
          borderTopColor: "var(--primary)",
          borderRadius: "50%",
          margin: "0 auto 1rem",
        }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Loading...</p>
      </div>
    </div>
  );
}
