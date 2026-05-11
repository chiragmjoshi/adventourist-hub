import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoMain from "@/assets/logo-main.png";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-[#EEE5D5] topo-texture text-abyss">
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md">
          <img src={logoMain} alt="Adventourist" className="h-20 w-auto mb-6" />
          <h2 className="text-3xl font-bold text-abyss mb-2 tracking-tight">
            Travel Designed For You
          </h2>
          <p className="text-sm text-abyss/60 mb-10">
            The internal hub for the Adventourist team — leads, trips, vendors, all in one place.
          </p>
          <div className="flex items-center gap-6 text-xs font-medium text-abyss/70">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-blaze">4.8★</span>
              <span className="uppercase tracking-wider">Google</span>
            </div>
            <span className="text-abyss/20">·</span>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-blaze">2018</span>
              <span className="uppercase tracking-wider">Since</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoMain} alt="Adventourist" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-abyss mb-1">Welcome back</h1>
          <p className="text-sm text-[#6B7280] mb-8">Sign in to Adventourist CMS</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-abyss text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@adventourist.in"
                required
                className="h-11 bg-white border-[#E5E7EB] text-abyss placeholder:text-[#9CA3AF]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-abyss text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 bg-white border-[#E5E7EB] text-abyss placeholder:text-[#9CA3AF]"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blaze hover:bg-blaze/90 text-white font-semibold"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-[#9CA3AF] text-center mt-8">
            Internal use only · Adventourist Travels
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
