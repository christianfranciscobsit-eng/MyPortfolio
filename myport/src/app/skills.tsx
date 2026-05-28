"use client";

import { motion } from "framer-motion";

const skillsData = [
  { category: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "HTML, CSS ,JavaScript",] },
  { category: "Graphic Design", items: ["Adobe Photoshop", "Canva", "Figma", "Illustrator", "CapCut", "UI/UX Design"] },
  { category: "Office & Productivity", items: ["Microsoft Word", "Microsoft PowerPoint", "Microsoft Excel", "Google Docs", "File Management", "Typing & Encoding"] },
];

export default function Skills() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="skills" className="section container">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">Technical <span className="text-gradient">Skills</span></h2>
        
        <motion.div 
          className="skills-grid" 
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {skillsData.map((group, i) => (
            <motion.div key={i} variants={itemVariants} className="glass-panel" style={{ padding: "2rem" }}>
              <h3 style={{ fontSize: "1.3rem", marginBottom: "1.5rem", color: "var(--accent-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                {group.category}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {group.items.map((skill, j) => (
                  <span 
                    key={j} 
                    style={{ 
                      padding: "0.4rem 1rem", 
                      background: "rgba(255,255,255,0.05)", 
                      borderRadius: "20px", 
                      fontSize: "0.9rem",
                      border: "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent-primary)";
                      e.currentTarget.style.color = "white";
                      e.currentTarget.style.borderColor = "var(--accent-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "var(--text-primary)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
