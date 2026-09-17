import RotatingImageBanner from "@/components/RotatingImageBanner";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="h-screen w-full flex overflow-hidden relative"
      style={{ background: "#1c1c1c" }}
    >
      {/* ── Left: form panel ──────────────────────────────────────────────── */}
      {/* 
        On Desktop (lg and up): 38% width, px-14 
        On Mobile/Tablet (below lg): w-full, px-6
      */}
      <section
        className="relative flex-shrink-0 flex flex-col justify-center px-6 lg:px-14 w-full lg:w-[38%] z-10"
      >
        <LoginForm />
      </section>

      {/* ── Right: image grid ─────────────────────────────────────────────── */}
      {/* 
        On Desktop (lg and up): block, flex-1, pulled to the left
        On Mobile/Tablet (below lg): completely hidden
      */}
      <section
        className="hidden lg:block flex-1 relative -ml-[8%]"
      >
        <RotatingImageBanner />
      </section>
    </main>
  );
}