"use client";

import { motion } from "framer-motion";
import { Award as AwardIcon, Star, Trophy } from "lucide-react";

const awards = [
  {
    title: "1st Runner Up for Best in Logo",
    organization: "April 2024 Competition",
    icon: <Trophy size={32} color="var(--accent-primary)" />,
    description: "Achieved 1st Runner Up in a logo design competition for creativity, originality, and visual presentation."
  },
  {
    title: "Best Programming and Coding Practices",
    organization: "July 2023 Recognition",
    icon: <Star size={32} color="var(--accent-primary)" />,
    description: "Recognized for demonstrating excellent programming skills, clean coding standards, and efficient development practices."
  },
  {
    title: "Best In Capstone 2026",
    organization: "ABR Diagnostic System",
    icon: <AwardIcon size={32} color="var(--accent-primary)" />,
    description: "Awarded for developing and presenting the ABR Diagnostic System as one of the outstanding capstone projects in 2026."
  }
];

export default function Awards() {
  return (
    <section id="awards" className="section container">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">Honors & <span className="text-gradient">Awards</span></h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          {awards.map((award, index) => (
            <motion.div
              key={index}
              className="glass-panel"
              style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}
              whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
            >
              <div style={{ background: "rgba(59,130,246,0.1)", padding: "1.5rem", borderRadius: "50%", marginBottom: "1rem" }}>
                {award.icon}
              </div>
              <h3 style={{ fontSize: "1.3rem", color: "var(--text-primary)" }}>{award.title}</h3>
              <p style={{ color: "var(--accent-primary)", fontWeight: 500, fontSize: "0.95rem" }}>{award.organization}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{award.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
