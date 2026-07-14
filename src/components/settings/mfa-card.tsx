"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MFACard() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEnabled(user.user_metadata?.mfa_enabled === true);
      }
      setLoading(false);
    }
    loadStatus();
  }, [supabase]);

  const toggleMFA = async (newValue: boolean) => {
    setEnabled(newValue);
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No autenticado");

      // Update auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { mfa_enabled: newValue }
      });

      if (updateError) throw updateError;

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ mfa_enabled: newValue })
        .eq('id', user.id);

      if (profileError) {
        console.error("Error updating profile mfa_enabled:", profileError);
      }

      toast.success(newValue ? "MFA Activado" : "MFA Desactivado", {
        description: newValue 
          ? "Se solicitará un código por correo al iniciar sesión." 
          : "Ya no se solicitará un código por correo."
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Error al actualizar MFA");
      // Revert optimism
      setEnabled(!newValue);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Autenticación de Dos Factores (MFA)
        </CardTitle>
        <CardDescription>
          Añade una capa extra de seguridad a tu cuenta. Cuando inicies sesión, te enviaremos un código de 6 dígitos a tu correo electrónico registrado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-medium text-sm">Validación por Correo Electrónico</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? "Activo" : "Inactivo"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch 
            checked={enabled} 
            onCheckedChange={toggleMFA} 
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
