import { useState } from "react";

type Props = {
  version: string;
  apkUrl: string;
};

export default function UpdateModal({
  version,
  apkUrl
}: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: "460px",
          padding: "40px 30px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          boxShadow: "0 0 40px rgba(34, 211, 238, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.02)"
        }}
      >
        {/* Pulsing Update Icon Container */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "rgba(34, 211, 238, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--color-cyan)",
            boxShadow: "0 0 25px var(--color-cyan-glow)",
            animation: "pulse-glow 2s infinite"
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-cyan)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <h2
            className="modal-title"
            style={{
              color: "var(--color-cyan)",
              fontSize: "2rem",
              fontWeight: 800,
              textShadow: "0 0 15px var(--color-cyan-glow)",
              marginBottom: "10px"
            }}
          >
            Update Available
          </h2>
          <p
            style={{
              color: "var(--color-text)",
              fontSize: "0.95rem",
              lineHeight: "1.6",
              margin: "0 0 12px 0"
            }}
          >
            A new version of FiveCards is available! Update now to access the latest features, improvements, and gameplay enhancements.
          </p>
          <p
            style={{
              color: "var(--color-gold)",
              fontSize: "1.1rem",
              fontWeight: 700,
              textShadow: "0 0 8px var(--color-gold-glow)",
              margin: 0
            }}
          >
            Version: v{version}
          </p>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            className="btn-primary pulse-button"
            style={{
              width: "100%",
              padding: "14px 28px",
              justifyContent: "center"
            }}
            onClick={() => window.open(apkUrl, "_blank")}
          >
            Download Update 📥
          </button>
          
          <button
            className="btn-secondary"
            style={{
              width: "100%",
              padding: "12px 28px",
              justifyContent: "center"
            }}
            onClick={() => setDismissed(true)}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}