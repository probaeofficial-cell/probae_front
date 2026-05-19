import RotatingImageBanner from "@/components/RotatingImageBanner";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main
      className="h-screen w-full flex overflow-hidden relative"
      style={{ background: "#1c1c1c" }}
    >
      {/* ── Left: form panel ──────────────────────────────────────────────── */}
      {/* Reverted back to 38% and px-14 so the login form DOES NOT MOVE */}
      <section
        className="relative flex-shrink-0 flex flex-col justify-center px-14 z-10"
        style={{ width: "38%" }}
      >
        <LoginForm />
      </section>

      {/* ── Right: image grid ─────────────────────────────────────────────── */}
      {/* Added marginLeft to "pull" the image section to the left. 
        Tweak the "-8%" up or down (e.g., "-5%" or "-12%") to get the exact gap you want.
      */}
      <section
        className="flex-1 relative"
        style={{ marginLeft: "-8%" }}
      >
        <RotatingImageBanner />
      </section>
    </main>
  );
}