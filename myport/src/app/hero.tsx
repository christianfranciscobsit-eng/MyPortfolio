"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import RippleGrid from "@/components/RippleGrid";

export default function Hero() {
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        background: "#060818",
        marginLeft: "calc(-50vw + 50%)",
      }}
    >
      {/* RippleGrid background */}
      <RippleGrid
        enableRainbow={false}
        gridColor="#4f8ef7"
        rippleIntensity={0.08}
        gridSize={8}
        gridThickness={12}
        fadeDistance={1.8}
        vignetteStrength={1.8}
        glowIntensity={0.15}
        opacity={0.85}
        mouseInteraction={true}
        mouseInteractionRadius={1.2}
      />

      {/* Dark overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(6, 8, 24, 0.45)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <motion.div
        style={{
          position: "relative",
          zIndex: 2,
          paddingTop: "8rem",
          paddingBottom: "6rem",
          paddingLeft: "2rem",
          paddingRight: "2rem",
          maxWidth: "900px",
          width: "100%",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2
          style={{
            fontSize: "1.1rem",
            color: "var(--accent-primary)",
            fontWeight: 600,
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "1.2rem",
          }}
        >
          Hi, I am a Christian Francisco
        </h2>
        <h1
          style={{
            fontSize: "clamp(3rem, 9vw, 6rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: "1.5rem",
            letterSpacing: "-1.5px",
          }}
        >
          Turning Ideas Into <br />
          <span className="text-gradient">Creative Visuals.</span>
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--text-secondary)",
            maxWidth: "620px",
            margin: "0 auto 3rem",
            lineHeight: 1.7,
          }}
        >
          I’m a passionate Graphic and Digital Designer dedicated to crafting clean, modern, and visually compelling designs. I create digital experiences that combine creativity, branding, and functionality to help ideas stand out and leave a lasting impression.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#projects" className="btn btn-primary" style={{ padding: "1rem 2.2rem", fontSize: "1.05rem" }}>
            View Work <ArrowRight size={20} />
          </a>
          <a href="/images/resume.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: "1rem 2.2rem", fontSize: "1.05rem" }}>
            Resume <Download size={19} />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
