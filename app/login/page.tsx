import RotatingImageBanner from "@/components/RotatingImageBanner";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="h-screen w-full flex overflow-hidden relative"
      style={{ background: "#1c1c1c" }}
    >
      {/* ── Left: form panel ──────────────────────────────────────────────── */}
      <section
        className="relative flex-shrink-0 flex flex-col justify-center px-14 z-10"
        style={{ width: "38%" }}
      >
        <LoginForm />
      </section>

      {/* ── Right: image grid ─────────────────────────────────────────────── */}
      {/* Removed the clip-path and negative margin. The RotatingImageBanner 
        now handles the geometric boundaries naturally.
      */}
      <section className="flex-1 relative">
        <RotatingImageBanner />
      </section>
    </main>
  );
}