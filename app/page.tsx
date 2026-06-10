import ImageUploader from "./components/ImageUploader";

// Floating hearts scattered across the screen — varied position, size, speed
const hearts = [
  { left: "5%", size: "1.4rem", duration: "14s", delay: "0s", emoji: "💕" },
  { left: "15%", size: "1rem", duration: "18s", delay: "3s", emoji: "🌸" },
  { left: "27%", size: "1.8rem", duration: "12s", delay: "6s", emoji: "💗" },
  { left: "40%", size: "1.2rem", duration: "16s", delay: "1.5s", emoji: "🌷" },
  { left: "52%", size: "1.5rem", duration: "20s", delay: "4s", emoji: "💞" },
  { left: "65%", size: "1rem", duration: "13s", delay: "7s", emoji: "🌸" },
  { left: "75%", size: "1.7rem", duration: "17s", delay: "2s", emoji: "💖" },
  { left: "85%", size: "1.3rem", duration: "15s", delay: "5s", emoji: "🤍" },
  { left: "93%", size: "1.1rem", duration: "19s", delay: "8s", emoji: "💕" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden py-12">
      {/* floating hearts background */}
      {hearts.map((h, i) => (
        <span
          key={i}
          className="heart"
          style={{
            left: h.left,
            fontSize: h.size,
            animationDuration: h.duration,
            animationDelay: h.delay,
          }}
        >
          {h.emoji}
        </span>
      ))}

      <div className="relative z-10">
        <ImageUploader />
      </div>
    </main>
  );
}
