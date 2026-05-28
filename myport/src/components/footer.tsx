"use client";

import { Github, Linkedin, Twitter, Mail } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  
  return (
    <footer style={{ borderTop: "1px solid var(--border-color)", padding: "4rem 0 2rem", marginTop: "auto", background: "var(--bg-surface)" }}>
      <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <a href="#" style={{ color: "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            <Github size={24} />
          </a>
          <a href="#" style={{ color: "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            <Linkedin size={24} />
          </a>
          <a href="#" style={{ color: "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            <Twitter size={24} />
          </a>
          <a href="#" style={{ color: "var(--text-secondary)", transition: "color 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
            <Mail size={24} />
          </a>
        </div>
        
        <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          <p>© {year} Portfolio. All rights reserved.</p>
          <p style={{ marginTop: "0.5rem" }}>Designed & Built with Next.js & Framer Motion</p>
        </div>
      </div>
    </footer>
  );
}
