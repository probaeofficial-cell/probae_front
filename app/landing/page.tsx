"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const FONT_POPPINS = "var(--font-poppins), 'Poppins', sans-serif";
const FONT_JAKARTA = "var(--font-plus-jakarta), 'Plus Jakarta Sans', sans-serif";

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    document.body.classList.add("landing-page");

    const lenis = new Lenis({
      duration: 2.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.8,
    });

    // Attach to window for the Navbar scroll-to button
    (window as any).__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      document.body.classList.remove("landing-page");
      delete (window as any).__lenis;
      lenis.destroy();
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, []);

  return (
    <main
      className="relative overflow-x-hidden selection:bg-[#6A0FAD] selection:text-[#F5F5F5]"
      style={{ backgroundColor: "#222222", color: "#F5F5F5" }}
      id="main-content"
    >
      <NoiseOverlay />
      <Navbar activeSection={activeSection} />
      <HeroSection onEnter={() => setActiveSection(0)} />
      <EngineTeaserSection onEnter={() => setActiveSection(1)} />
      <EndorsementsSection onEnter={() => setActiveSection(2)} />
      <AccessTerminalSection onEnter={() => setActiveSection(3)} />
      <FooterSection onEnter={() => setActiveSection(4)} />
    </main>
  );
}

function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.05]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        mixBlendMode: "overlay",
      }}
      aria-hidden="true"
    />
  );
}

function Navbar({ activeSection }: { activeSection: number }) {
  const TOTAL_SECTIONS = 5;

  const handleJoinClick = () => {
    (window as any).__lenis?.scrollTo("#access-terminal");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-8 px-6 pointer-events-none">
      <nav
        className="pointer-events-auto flex items-center justify-between px-8 py-4 rounded-full w-full max-w-5xl border"
        style={{
          backgroundColor: "rgba(34, 34, 34, 0.4)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(245, 245, 245, 0.1)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div className="relative select-none flex items-center">
          {/* Mobile LogoMark */}
          <div className="relative h-10 w-10 block md:hidden">
            <Image
              src="/images/logos/PB_Probae - LogoMark.png"
              alt="Probae LogoMark"
              fill
              className="object-contain object-left"
            />
          </div>
          {/* Desktop Wordmark */}
          <div className="relative h-10 w-48 hidden md:block">
            <Image
              src="/images/logos/PB_Probae - Wordmark.png"
              alt="Probae Wordmark"
              fill
              className="object-contain object-left"
            />
          </div>
        </div>

        {/* Section Track Indicator */}
        <div className="hidden md:flex items-center gap-2">
          {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => (
            <div
              key={i}
              className="h-[2px] transition-all duration-500 ease-out"
              style={{
                width: activeSection === i ? "32px" : "12px",
                backgroundColor: activeSection === i ? "#6A0FAD" : "rgba(245,245,245,0.2)",
              }}
            />
          ))}
        </div>

        <div>
          <button
            onClick={handleJoinClick}
            className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold overflow-hidden transition-transform duration-500 hover:scale-105 active:scale-95"
            style={{ fontFamily: FONT_JAKARTA, backgroundColor: "#4CAF50", color: "#222222" }}
          >
            <span
              className="absolute inset-0 w-full h-full translate-y-[100%] rounded-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            />
            <span className="relative z-10 tracking-wide uppercase">Join Waitlist</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function HeroSection({ onEnter }: { onEnter: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRefs = useRef<HTMLSpanElement[]>([]);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top center",
        end: "bottom center",
        onEnter,
        onEnterBack: onEnter,
      });

      const tl = gsap.timeline();

      // Kinetic Typography Mask Reveal
      tl.fromTo(
        textRefs.current,
        { y: "100%", opacity: 0 },
        {
          y: "0%",
          opacity: 1,
          duration: 1.6,
          stagger: 0.2,
          ease: "power4.out",
          delay: 0.3,
        }
      );

      // Subheadline fade
      tl.fromTo(
        subtextRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" },
        "-=1"
      );

      // Float ingredients entrance
      tl.fromTo(
        [orb1Ref.current, orb2Ref.current],
        { scale: 0.8, opacity: 0, rotation: -15 },
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 2.5,
          ease: "power4.out",
          stagger: 0.3,
        },
        "-=1.5"
      );

      // Mouse Parallax
      const xTo1 = gsap.quickTo(orb1Ref.current, "x", { duration: 1.2, ease: "power3.out" });
      const yTo1 = gsap.quickTo(orb1Ref.current, "y", { duration: 1.2, ease: "power3.out" });
      const xTo2 = gsap.quickTo(orb2Ref.current, "x", { duration: 1.8, ease: "power3.out" });
      const yTo2 = gsap.quickTo(orb2Ref.current, "y", { duration: 1.8, ease: "power3.out" });

      const onMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        xTo1(x * -90);
        yTo1(y * -90);
        xTo2(x * 70);
        yTo2(y * 70);
      };

      window.addEventListener("mousemove", onMouseMove);
      return () => window.removeEventListener("mousemove", onMouseMove);
    }, sectionRef);
    return () => ctx.revert();
  }, [onEnter]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen flex flex-col justify-center px-8 lg:px-20 overflow-hidden"
      style={{ backgroundColor: "#222222" }}
    >
      <div className="relative z-10 flex flex-col gap-1 md:gap-4 mt-12 md:mt-0 max-w-7xl">
        <div style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)" }}>
          <span
            ref={(el) => { if (el) textRefs.current[0] = el; }}
            className="block font-extrabold text-[clamp(4rem,10vw,12rem)] leading-[0.85] tracking-tighter"
            style={{ fontFamily: FONT_POPPINS, color: "#F5F5F5" }}
          >
            Eat Proper.
          </span>
        </div>
        <div style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)" }}>
          <span
            ref={(el) => { if (el) textRefs.current[1] = el; }}
            className="block font-extrabold text-[clamp(4rem,10vw,12rem)] leading-[0.85] tracking-tighter"
            style={{
              fontFamily: FONT_POPPINS,
              color: "transparent",
              WebkitTextStroke: "2px #F5F5F5",
            }}
          >
            Live Better.
          </span>
        </div>

        <p
          ref={subtextRef}
          className="mt-8 text-xl md:text-3xl max-w-3xl leading-snug font-medium"
          style={{ fontFamily: FONT_JAKARTA, color: "rgba(245,245,245,0.7)" }}
        >
          The Biometric Food Engine is initializing. <br />
          <span style={{ color: "#F5F5F5" }}>Radical transparency is coming to your city.</span>
        </p>
      </div>

      {/* Floating Ingredients */}
      <div
        ref={orb1Ref}
        className="absolute top-[15%] right-[5%] w-56 h-56 md:w-96 md:h-96 rounded-full overflow-hidden z-0 pointer-events-none"
        style={{ filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.8))" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&q=90"
          alt="Sliced Avocado"
          fill
          sizes="(max-width: 768px) 224px, 384px"
          className="object-cover scale-110 opacity-70 mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000"
        />
      </div>

      <div
        ref={orb2Ref}
        className="absolute bottom-[10%] left-[10%] w-48 h-48 md:w-80 md:h-80 rounded-full overflow-hidden z-0 pointer-events-none"
        style={{ filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.8))" }}
      >
        <Image
          src="https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=600&q=90"
          alt="Dragonfruit"
          fill
          sizes="(max-width: 768px) 192px, 320px"
          className="object-cover scale-110 opacity-70 mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000"
        />
      </div>
    </section>
  );
}

function EngineTeaserSection({ onEnter }: { onEnter: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bowlRef = useRef<HTMLDivElement>(null);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top center",
        end: "bottom center",
        onEnter,
        onEnterBack: onEnter,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=400%",
          scrub: 1,
          pin: true,
        },
      });

      // Bowl enter
      tl.fromTo(
        bowlRef.current,
        { x: "-50vw", y: "50vh", rotation: -45, scale: 0.8 },
        { x: 0, y: 0, rotation: 0, scale: 1, duration: 2.7, ease: "none" },
        0
      );

      // HUD 1 (Cost Teaser)
      tl.fromTo(
        card1Ref.current,
        { x: "-80vw", y: "-20vh", opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 1.5, ease: "none" },
        0.8
      );

      // HUD 2 (Merged Stats)
      tl.fromTo(
        card2Ref.current,
        { x: "80vw", y: "40vh", opacity: 0 },
        { x: 0, y: 0, opacity: 1, duration: 1.5, ease: "none" },
        1.2
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [onEnter]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-[100svh] md:min-h-screen flex flex-col md:flex-row items-center justify-between py-24 md:py-0 px-8 lg:px-20 overflow-visible"
      style={{ backgroundColor: "#F5F5F5", color: "#222222" }}
    >
      <div className="w-full md:w-1/3 z-20 mt-32 md:mt-0 flex flex-col gap-6">
        <h2
          className="font-extrabold text-[clamp(2.5rem,4vw,4rem)] leading-tight tracking-tight"
          style={{ fontFamily: FONT_POPPINS }}
        >
          Radical Transparency As A Love Language.
        </h2>
        <p
          className="text-lg md:text-xl leading-relaxed max-w-sm"
          style={{ fontFamily: FONT_JAKARTA, color: "rgba(34,34,34,0.7)" }}
        >
          Our internal engine separates structural cost metrics from nutritional precision. <br /><br />
          <strong style={{ color: "#222222" }}>The smart café experience is currently in closed beta.</strong>
        </p>
      </div>

      <div ref={containerRef} className="relative w-full md:w-2/3 h-full flex items-center justify-center">
        {/* The Bowl */}
        <div
          ref={bowlRef}
          className="absolute w-[320px] h-[320px] md:w-[600px] md:h-[600px] rounded-full overflow-hidden z-10"
          style={{ filter: "drop-shadow(0 40px 100px rgba(0,0,0,0.25))" }}
        >
          <Image
            src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=90"
            alt="Probae Signature Bowl"
            fill
            sizes="(max-width: 768px) 320px, 600px"
            className="object-cover"
          />
        </div>

        {/* HUD: Teaser 1 */}
        <div
          ref={card1Ref}
          className="absolute z-20 top-[15%] md:top-[20%] left-0 md:left-[5%] flex items-center px-4 md:px-5 py-3 rounded-none border-l-4"
          style={{
            backgroundColor: "#F5F5F5",
            borderColor: "#222222",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontFamily: FONT_JAKARTA }}>
            <span className="block text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: "rgba(34,34,34,0.5)" }}>
              Cost MGT Engine
            </span>
            <span className="block text-lg font-extrabold" style={{ color: "#222222", fontFamily: FONT_POPPINS }}>
              Calibrating<span className="animate-pulse">...</span>
            </span>
          </div>
        </div>

        {/* HUD: Teaser 2 (Merged Stats) */}
        <div
          ref={card2Ref}
          className="absolute z-20 bottom-[10%] md:bottom-[15%] right-0 md:right-[5%] flex flex-col gap-3"
        >
          {/* Badge A */}
          <div
            className="self-end flex items-center gap-2 px-5 py-3 rounded-full"
            style={{
              backgroundColor: "#222222",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#4CAF50", filter: "drop-shadow(0 0 8px #4CAF50)" }}
            />
            <span
              className="font-bold text-sm tracking-wide"
              style={{ fontFamily: FONT_JAKARTA, color: "#F5F5F5" }}
            >
              <span style={{ color: "#4CAF50" }}>570</span> Kcal
            </span>
          </div>

          {/* Badge B */}
          <div
            className="flex flex-col px-5 py-4 rounded-xl"
            style={{
              backgroundColor: "#6A0FAD",
              boxShadow: "0 20px 40px rgba(106,15,173,0.3)",
            }}
          >
            <span className="text-[10px] uppercase font-bold tracking-widest" style={{ fontFamily: FONT_JAKARTA, color: "rgba(245,245,245,0.6)" }}>
              Bio-Metric Scan
            </span>
            <span className="font-extrabold text-xl mt-1" style={{ fontFamily: FONT_POPPINS, color: "#F5F5F5" }}>
              25g Bioavailable Protein
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function EndorsementsSection({ onEnter }: { onEnter: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top center",
        end: "bottom center",
        onEnter,
        onEnterBack: onEnter,
      });

      gsap.fromTo(
        ".animate-up",
        { y: 80, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [onEnter]);

  return (
    <section
      ref={sectionRef}
      className="w-full py-32 px-8 lg:px-20"
      style={{ backgroundColor: "#F5F5F5", color: "#222222" }}
    >
      <div className="max-w-7xl mx-auto">
        <h2
          className="animate-up font-extrabold text-[clamp(2.5rem,5vw,5rem)] leading-tight tracking-tight mb-24 max-w-4xl"
          style={{ fontFamily: FONT_POPPINS }}
        >
          Verified by Early Beta Nodes.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
          <div className="animate-up flex flex-col gap-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 11L8 15H11V18H5V15L7 11H5V6H10V11ZM19 11L17 15H20V18H14V15L16 11H14V6H19V11Z" fill="#6A0FAD" />
            </svg>
            <p className="font-medium text-2xl md:text-3xl leading-snug" style={{ fontFamily: FONT_JAKARTA }}>
              &quot;Biometric optimization achieved within 14 days. This isn&apos;t a restrictive diet; it&apos;s a structural upgrade.&quot;
            </p>
            <div>
              <p className="font-bold text-sm uppercase tracking-widest" style={{ fontFamily: FONT_JAKARTA }}>Resident</p>
              <p className="text-sm mt-1" style={{ fontFamily: FONT_JAKARTA, color: "rgba(34,34,34,0.5)" }}>Performance Lab</p>
            </div>
          </div>

          <div className="animate-up flex flex-col gap-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 11L8 15H11V18H5V15L7 11H5V6H10V11ZM19 11L17 15H20V18H14V15L16 11H14V6H19V11Z" fill="#4CAF50" />
            </svg>
            <p className="font-medium text-2xl md:text-3xl leading-snug" style={{ fontFamily: FONT_JAKARTA }}>
              &quot;The first culinary execution that treats macro density with clinical precision.&quot;
            </p>
            <div>
              <p className="font-bold text-sm uppercase tracking-widest" style={{ fontFamily: FONT_JAKARTA }}>Gastronomy Lead</p>
              <p className="text-sm mt-1" style={{ fontFamily: FONT_JAKARTA, color: "rgba(34,34,34,0.5)" }}>Internal Research</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccessTerminalSection({ onEnter }: { onEnter: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top center",
      end: "bottom center",
      onEnter,
      onEnterBack: onEnter,
    });
  }, [onEnter]);

  const handleInputFocus = () => {
    gsap.to(borderRef.current, { scaleX: 1, duration: 0.5, ease: "power3.out" });
  };

  const handleInputBlur = () => {
    if (!inputRef.current?.value) {
      gsap.to(borderRef.current, { scaleX: 0, duration: 0.5, ease: "power3.out" });
    }
  };

  return (
    <section
      id="access-terminal"
      ref={sectionRef}
      className="w-full py-32 px-8 lg:px-20 min-h-screen flex items-center"
      style={{ backgroundColor: "#222222", color: "#F5F5F5" }}
    >
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center">
        <div className="w-4 h-4 mb-8" style={{ backgroundColor: "#FFD700" }} />
        <h2
          className="font-extrabold text-[clamp(2.5rem,5vw,5rem)] leading-[1.1] tracking-tight mb-16"
          style={{ fontFamily: FONT_POPPINS }}
        >
          Secure initial node access.
        </h2>

        <form className="w-full max-w-2xl flex flex-col gap-12" onSubmit={(e) => e.preventDefault()}>
          <div className="relative w-full">
            <input
              ref={inputRef}
              type="email"
              placeholder="Enter primary email..."
              className="w-full bg-transparent text-xl md:text-2xl outline-none placeholder:text-white/20 pb-4 text-center"
              style={{ fontFamily: FONT_JAKARTA, color: "#F5F5F5" }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
            />
            <div
              className="absolute bottom-0 left-0 w-full h-[1px]"
              style={{ backgroundColor: "rgba(245,245,245,0.2)" }}
            />
            <div
              ref={borderRef}
              className="absolute bottom-0 left-0 w-full h-[2px] origin-center scale-x-0"
              style={{ backgroundColor: "#6A0FAD" }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-12 py-5 text-sm font-extrabold uppercase tracking-widest overflow-hidden transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: FONT_JAKARTA,
                backgroundColor: "#4CAF50",
                color: "#222222",
              }}
            >
              Initialize Access
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function FooterSection({ onEnter }: { onEnter: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top center",
        end: "bottom center",
        onEnter,
        onEnterBack: onEnter,
      });

      gsap.fromTo(
        textRef.current,
        { scale: 0.8, opacity: 0.5 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: 2.5,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [onEnter]);

  return (
    <footer
      ref={sectionRef}
      className="relative w-full flex flex-col items-center justify-center py-32 md:py-48 px-4 overflow-hidden"
      style={{ backgroundColor: "#222222" }}
    >
      <h1
        ref={textRef}
        className="font-extrabold text-[clamp(2rem,10vw,20rem)] leading-[0.8] tracking-tighter text-center w-full origin-bottom"
        style={{ fontFamily: FONT_POPPINS, color: "#F5F5F5" }}
      >
        STOP DIETING.
        <br />
        <span style={{ color: "#4CAF50" }}>START OPTIMIZING.</span>
      </h1>

      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs uppercase tracking-widest font-bold opacity-30" style={{ fontFamily: FONT_JAKARTA, color: "#F5F5F5" }}>
          © 2026 Probae Initiative Inc. // Access Restricted.
        </p>
      </div>
    </footer>
  );
}
