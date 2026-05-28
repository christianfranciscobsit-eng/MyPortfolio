"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="section container">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">About <span className="text-gradient">Me</span></h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "4rem", alignItems: "center" }}>
          <div className="glass-panel" style={{ padding: "2.5rem" }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "var(--text-primary)" }}>My Journey</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              I’m a passionate Graphic and Digital Designer focused on creating modern, visually engaging, and meaningful designs. My journey in design started with a curiosity for creativity and digital art, which eventually grew into a strong passion for branding, UI visuals, social media content, and digital experiences.
            </p>
            <p style={{ color: "var(--text-secondary)" }}>
              Over the past 2 years, I’ve worked on various creative projects that helped me improve my skills in layout design, visual storytelling, and user-focused design. I enjoy turning ideas into clean and impactful visuals while continuously exploring new trends, tools, and creative techniques to grow as a designer.
            </p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { label: "Experience", value: "2+ Years" },
              { label: "Projects Completed", value: "10+" },
              { label: "Creative Designs", value: "30+" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                className="glass-panel"
                style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid var(--accent-primary)" }}
                whileHover={{ x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>{stat.label}</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
