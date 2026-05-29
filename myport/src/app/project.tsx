"use client";

import { motion } from "framer-motion";
import { ExternalLink, Github } from "lucide-react";
import InfiniteCarousel from "@/components/InfiniteCarousel";

const projects = [
  {
    title: "ABBE WEBSITE",
    description: "Modern e-commerce website with responsive UI and smooth user experience.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "React"],
    link: "https://abbe.com.ph/",
    image: "/images/projects/Abbee.png",
  },
  {
    title: "ABR DIAGNOSTIC SYSTEM",
    description: "Diagnostic management system with organized records and efficient workflow.",
    tech: ["Laravel", "PHP", "MySQL", "HTML,CSS,Javascript"],
    link: "https://www.abr-diagnostic.com/",
    image: "/images/projects/ABRR.png",
  },
  {
    title: "Portfolio",
    description: "Personal portfolio showcasing creative designs and frontend projects.",
    tech: ["NextJS", "React", "Typescript"],
    link: "#",
    image: "/images/projects/port.png",
  },
];

const carouselImages = [
  "/images/carousel/AJ.png",
  "/images/carousel/Jihyoh.png",
  "/images/carousel/Lisa.png",
  "/images/carousel/VJ.png",
  "/images/carousel/Yarn.png",
  "/images/carousel/Gez.png",
  "/images/carousel/Jhia.png",
];

export default function Projects() {
  return (
    <section id="projects" className="section container">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Featured <span className="text-gradient">Projects</span>
        </h2>

        {/* Infinite auto-scrolling carousel */}
        <div style={{ marginBottom: "4rem" }}>
          <InfiniteCarousel
            images={carouselImages}
            cardWidth={210}
            cardHeight={297}
            gap={20}
            speed={60}
          />
        </div>

        {/* Project cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "2rem",
          }}
        >
          {projects.map((project, index) => (
            <motion.div
              key={index}
              className="glass-panel"
              style={{
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
                overflow: "hidden",
              }}
              whileHover={{ y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div
                style={{
                  width: "100%",
                  height: "180px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  marginBottom: "1.5rem",
                }}
              >
                <img
                  src={project.image}
                  alt={project.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ fontSize: "1.5rem", color: "var(--text-primary)" }}>
                  {project.title}
                </h3>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <a
                    href="#"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <Github size={20} />
                  </a>
                  <a
                    href={project.link}
                    style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>

              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", flexGrow: 1 }}>
                {project.description}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {project.tech.map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--accent-primary)",
                      background: "rgba(59,130,246,0.1)",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "4px",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
