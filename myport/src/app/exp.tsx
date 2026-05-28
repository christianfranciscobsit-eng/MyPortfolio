"use client";

import { motion } from "framer-motion";

const experiences = [
  {
    role: "WEB DEVELOPER (INTERN.)",
    company: "ABBE TECHNOLOGY SOLUTION INC.",
    period: "JANUARY 2026 - MAY2026",
    description: "Assisted in developing and designing responsive websites, maintained and updated website content and features, and collaborated with team members on web development tasks using React, Tailwind CSS, and JavaScript."
  },
  {
    role: "COMPUTER ASSISTANT",
    company: "DAC. COMPUTER SHOP",
    period: "JANUARY 2015 - DECEMBER 2020",
    description: "Provided technical support and troubleshooting for customers, assisted in computer maintenance and software installation, and handled basic operations such as printing, encoding, and customer service."
  },
  
];

export default function Experience() {
  return (
    <section id="experience" className="section container">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">Work <span className="text-gradient">Experience</span></h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "800px", margin: "0 auto" }}>
          {experiences.map((exp, index) => (
            <motion.div 
              key={index}
              className="glass-panel"
              style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)" }}>{exp.role}</h3>
                  <h4 style={{ fontSize: "1.1rem", color: "var(--accent-primary)", fontWeight: 500 }}>{exp.company}</h4>
                </div>
                <span style={{ padding: "0.4rem 1rem", background: "rgba(255,255,255,0.05)", borderRadius: "20px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  {exp.period}
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {exp.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
