import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Headphones, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export function LoginView({ setRecoveryMode = () => {} }: { recoveryMode?: boolean; setRecoveryMode?: (v: boolean) => void }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [step, setStep] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Paso 1: envía el código OTP de 6 dígitos al correo (el template usa {{ .Token }}).
  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError("Ingresá tu correo electrónico primero para recuperar la contraseña.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (error) {
      setError(error.message);
    } else {
      // recoveryMode mantiene visible el LoginView cuando verifyOtp cree la sesión.
      setRecoveryMode(true);
      setStep("reset");
      setSuccessMessage("Te enviamos un código de 6 dígitos a tu correo. Ingresalo abajo.");
    }
    setLoading(false);
  };

  // Paso 2: valida el código y fija la nueva contraseña; luego vuelve al login.
  const handleVerifyAndUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Ingresá el código de 6 dígitos que te llegó por correo.");
      return;
    }
    if (!newPassword.trim()) {
      setError("Ingresá una nueva contraseña.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error: vErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (vErr) {
      setError("El código es inválido o expiró. Pedí uno nuevo.");
      setLoading(false);
      return;
    }

    const { error: uErr } = await supabase.auth.updateUser({ password: newPassword });
    if (uErr) {
      setError("No se pudo actualizar la contraseña. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    setSuccessMessage("¡Contraseña actualizada! Iniciá sesión con tu nueva contraseña.");
    setTimeout(async () => {
      await supabase.auth.signOut(); // cierra la sesión de recuperación
      setRecoveryMode(false);
      setStep("login");
      setCode("");
      setNewPassword("");
      setPassword("");
      setSuccessMessage(null);
    }, 2000);
    setLoading(false);
  };

  const backToLogin = () => {
    setStep("login");
    setRecoveryMode(false);
    setError(null);
    setSuccessMessage(null);
    setCode("");
    setNewPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-[#0f111a] font-sans relative">
      {/* Background Block */}
      <div className="absolute top-0 left-0 w-full h-[55%] bg-[#FFE500]" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        {/* Logo/Header AB InBev style */}
        <div className="mb-10 text-center space-y-6">
           <h1 className="text-5xl font-black tracking-tight text-black">DataOps</h1>
           <h2 className="text-2xl font-medium text-black">{step === "reset" ? "Restablecer contraseña" : "Iniciá sesión"}</h2>
        </div>

        <Card className="w-full max-w-md bg-white dark:bg-[#1a1c29] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 shadow-md">
          <CardContent className="pt-6">
            {step === "reset" ? (
              <form onSubmit={handleVerifyAndUpdate} className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Te enviamos un código de 6 dígitos a <span className="font-semibold">{email}</span>.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="code" className="font-semibold text-xs">Código de verificación</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 h-12 tracking-[0.4em] text-center text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-semibold text-xs">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 h-12"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500 font-medium">{error}</div>
                )}
                {successMessage && (
                  <div className="text-sm text-green-600 font-medium">{successMessage}</div>
                )}
                <div className="flex items-center justify-between pt-2">
                   <button type="button" onClick={backToLogin} className="text-sm text-gray-600 hover:text-black hover:underline cursor-pointer dark:text-gray-400 dark:hover:text-white">
                     Volver
                   </button>
                   <Button
                     type="submit"
                     className="bg-black hover:bg-gray-900 text-white rounded-full pl-6 pr-2 h-12 w-auto font-semibold flex items-center gap-4"
                     disabled={loading}
                   >
                     <span>{loading ? "Cambiando..." : "Cambiar contraseña"}</span>
                     <div className="w-8 h-8 rounded-full bg-[#FFE500] flex items-center justify-center">
                       <ArrowRight className="w-5 h-5 text-black" />
                     </div>
                   </Button>
                </div>
              </form>
            ) : (
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
                  className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 h-12"
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
                  className="bg-white dark:bg-[#13151f] border-gray-200 dark:border-gray-800 h-12"
                />
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={handleRequestCode} disabled={loading} className="text-sm text-gray-600 hover:text-black hover:underline cursor-pointer dark:text-gray-400 dark:hover:text-white">
                    Olvidé mi contraseña
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-500 font-medium">{error}</div>
              )}
              {successMessage && (
                <div className="text-sm text-green-600 font-medium">{successMessage}</div>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Footer */}
      <div className="w-full max-w-2xl mx-auto p-4 mb-8 relative z-10">
         <div className="bg-white dark:bg-[#1a1c29] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <button
               onClick={() => setHelpOpen(!helpOpen)}
               className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#1f2233] transition-colors"
            >
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black">
                     <Headphones className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Ayuda</span>
               </div>
               {helpOpen ? <ChevronUp className="w-5 h-5 text-gray-900" /> : <ChevronDown className="w-5 h-5 text-gray-900 dark:text-gray-100" />}
            </button>
            {helpOpen && (
               <div className="p-4 pt-0 text-sm border-t border-gray-100 dark:border-gray-800">
                  <p className="font-semibold mb-1">¿Necesitas ayuda? Ponete en contacto con el Equipo de DataOps</p>
                  <a href="mailto:DataOpsTeam@ab-inbev.com" className="text-gray-600 dark:text-gray-400 hover:underline">DataOpsTeam@ab-inbev.com</a>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
