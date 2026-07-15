"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

export default function MFAPage() {
  return (
    <Suspense fallback={null}>
      <MFAPageInner />
    </Suspense>
  );
}

function MFAPageInner() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Send code on mount
    sendCode();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/mfa/send", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to send code");
      }
      setTimeLeft(120); // Reset timer
    } catch (err) {
      setError("Hubo un problema al enviar el código.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código inválido");
      }

      // Success! Force a hard redirect to dashboard to ensure cookies are sent cleanly
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-foreground">
            Verificación de Seguridad
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Hemos enviado un código de 6 dígitos a tu correo electrónico. 
            Ingrésalo para verificar tu identidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center gap-2">
              <Input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                required
              />
              <span className={`text-sm font-medium ${timeLeft === 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {timeLeft > 0 ? `Expira en ${formatTime(timeLeft)}` : "El código expiró"}
              </span>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading || timeLeft === 0 || code.length !== 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar Código
            </Button>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={sendCode}
              disabled={timeLeft > 0 || sending}
            >
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reenviar código"}
            </Button>
          </form>

          <div className="mt-6 flex justify-center">
            <Button variant="ghost" className="text-sm text-muted-foreground" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Volver al Inicio de Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
