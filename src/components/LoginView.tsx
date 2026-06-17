import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Headphones, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export function LoginView() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white font-sans relative">
      {/* Background Block */}
      <div className="absolute top-0 left-0 w-full h-[55%] bg-[#FFE500]" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {/* Logo/Header AB InBev style */}
        <div className="mb-10 text-center space-y-6">
           <h1 className="text-5xl font-black tracking-tight text-black">DataOps</h1>
           <h2 className="text-2xl font-medium text-black">Iniciá sesión</h2>
        </div>

        <Card className="w-full max-w-md bg-white border-gray-200 text-gray-900 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-xs">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ab-inbev.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-gray-200 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-xs">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-gray-200 h-12"
                />
              </div>
              {error && (
                <div className="text-sm text-red-500 font-medium">{error}</div>
              )}
              <div className="flex justify-end pt-2">
                 <Button
                   type="submit"
                   className="bg-black hover:bg-gray-900 text-white rounded-full pl-6 pr-2 h-12 w-auto font-semibold flex items-center gap-4"
                   disabled={loading}
                 >
                   <span>{loading ? "Entrando..." : "Entrar"}</span>
                   <div className="w-8 h-8 rounded-full bg-[#FFE500] flex items-center justify-center">
                     <ArrowRight className="w-5 h-5 text-black" />
                   </div>
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Help Footer */}
      <div className="w-full max-w-2xl mx-auto p-4 mb-8 relative z-10">
         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <button
               onClick={() => setHelpOpen(!helpOpen)}
               className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black">
                     <Headphones className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900">Ayuda</span>
               </div>
               {helpOpen ? <ChevronUp className="w-5 h-5 text-gray-900" /> : <ChevronDown className="w-5 h-5 text-gray-900" />}
            </button>
            {helpOpen && (
               <div className="p-4 pt-0 text-sm border-t border-gray-100">
                  <p className="font-semibold mb-1">¿Necesitas ayuda? Ponete en contacto con el Equipo de DataOps</p>
                  <a href="mailto:DataOpsTeam@ab-inbev.com" className="text-gray-600 hover:underline">DataOpsTeam@ab-inbev.com</a>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
