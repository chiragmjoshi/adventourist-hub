import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoMain from "@/assets/logo-main.png";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

const card = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70`;

const SLIDES = [
  { name: "Leh Ladakh",  tagline: "Where Sky Meets Earth",   region: "India", image: card("photo-1571536802807-30451e3955d8") },
  { name: "Rajasthan",   tagline: "Land of Kings",           region: "India", image: card("photo-1599661046289-e31897846e41") },
  { name: "Kerala",      tagline: "God's Own Country",       region: "India", image: card("photo-1602216056096-3b40cc0c9944") },
  { name: "Himachal",    tagline: "Where Mountains Whisper", region: "India", image: card("photo-1626621341517-bbf3d9990a23") },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [current, setCurrent] = useState(0);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast.error("Invalid credentials. Please try again.");
    } else {
      navigate("/admin");
    }
  };

  const dest = SLIDES[current];

  return (
    <div className="min-h-screen flex bg-drift">
      {/* ───────── Left cinematic panel ───────── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden bg-abyss">
        {/* Image carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${dest.image})` }}
            aria-hidden="true"
          />
        </AnimatePresence>

        {/* Dark gradient overlays */}
        <div className="absolute inset-0 bg-abyss/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss/40 via-transparent to-transparent" />

        {/* Giant translucent wordmark */}
        <div className="absolute inset-x-0 top-[14%] flex justify-center pointer-events-none select-none">
          <span
            className="font-display font-black tracking-tight text-drift/[0.08] leading-none whitespace-nowrap"
            style={{ fontSize: "clamp(6rem, 14vw, 14rem)" }}
            aria-hidden="true"
          >
            ADVENTOURIST
          </span>
        </div>

        {/* Top-left logo + tag */}
        <div className="relative z-10 p-10 flex flex-col w-full">
          <div className="flex items-center gap-3">
            <img src={logoMain} alt="Adventourist" className="h-12 w-auto drop-shadow-lg" />
          </div>

          <div className="mt-auto max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-horizon" />
              <span className="font-body text-white/90 text-xs tracking-wide uppercase">
                Crafting Journeys Since 2018
              </span>
            </div>

            <h2 className="font-display font-black leading-[0.95] mb-5 text-white">
              <span className="block" style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.5rem)" }}>Travel</span>
              <span className="block text-blaze italic" style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.5rem)" }}>Designed</span>
              <span className="block" style={{ fontSize: "clamp(2.5rem, 4.5vw, 4.5rem)" }}>For You.</span>
            </h2>

            <p className="font-body text-white/80 text-base max-w-md leading-relaxed mb-8">
              The command centre for the Adventourist team — leads, trips, vendors and stories, all in one place.
            </p>

            {/* Now showing strip */}
            <div className="flex items-end justify-between gap-4 border-t border-white/15 pt-5">
              <div>
                <p className="font-body text-white/60 text-[10px] uppercase tracking-[0.25em] mb-1">
                  Now showing · {dest.region}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={dest.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="font-display font-bold text-white text-2xl"
                  >
                    {dest.name}{" "}
                    <span className="text-white/60 font-normal italic text-base">
                      — {dest.tagline}
                    </span>
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 pb-1">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Show ${SLIDES[i].name}`}
                    className="p-1.5 -m-1.5"
                  >
                    <span
                      className={`block h-1 rounded-full transition-all duration-500 ${
                        i === current ? "w-8 bg-blaze" : "w-1.5 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────── Right form panel ───────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-drift relative overflow-hidden">
        {/* Subtle topo bg */}
        <div className="absolute inset-0 topo-texture opacity-50 pointer-events-none" aria-hidden="true" />
        {/* Soft blaze glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blaze/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-horizon/10 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoMain} alt="Adventourist" className="h-14 w-auto" />
          </div>

          {/* Glass card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-[0_25px_80px_-20px_rgba(26,29,46,0.25)] p-9 sm:p-10">
            <div className="inline-flex items-center gap-2 bg-blaze/10 text-blaze rounded-full px-3 py-1 mb-5">
              <span className="block w-1.5 h-1.5 rounded-full bg-blaze animate-pulse" />
              <span className="font-body text-[11px] tracking-[0.2em] uppercase font-semibold">CMS Access</span>
            </div>

            <h1 className="font-display font-black text-abyss text-4xl leading-tight mb-2">
              Welcome <span className="italic text-blaze">back.</span>
            </h1>
            <p className="font-body text-abyss/60 text-sm mb-8">
              Sign in to continue crafting unforgettable journeys.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-abyss text-xs font-semibold uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@adventourist.in"
                  required
                  className="h-12 bg-white/70 border-abyss/10 text-abyss placeholder:text-abyss/30 rounded-xl focus-visible:ring-blaze/30 focus-visible:border-blaze/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-abyss text-xs font-semibold uppercase tracking-wider">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 bg-white/70 border-abyss/10 text-abyss placeholder:text-abyss/30 rounded-xl pr-11 focus-visible:ring-blaze/30 focus-visible:border-blaze/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-abyss/40 hover:text-abyss transition-colors"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="group w-full h-12 bg-abyss hover:bg-blaze text-white font-display font-bold text-base rounded-xl shadow-lg shadow-abyss/20 hover:shadow-blaze/40 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  "Signing in..."
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    Sign in
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15 group-hover:bg-white/25 group-hover:translate-x-0.5 transition-all">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-abyss/10 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[11px] text-abyss/50">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-blaze text-sm">4.8★</span>
                  <span className="uppercase tracking-wider">Google</span>
                </div>
                <span className="text-abyss/15">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-blaze text-sm">2018</span>
                  <span className="uppercase tracking-wider">Since</span>
                </div>
              </div>
              <span className="text-[10px] text-abyss/40 uppercase tracking-widest">Internal · Secure</span>
            </div>
          </div>

          <p className="text-center text-[11px] text-abyss/40 mt-6 tracking-wide">
            © {new Date().getFullYear()} Adventourist Travels · Mumbai, India
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
