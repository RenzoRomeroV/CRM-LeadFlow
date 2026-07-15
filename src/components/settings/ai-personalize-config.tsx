'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Building, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';

export function AiPersonalizeConfig() {
  const { accountId, accountRole, profileLoading } = useAuth();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyRuc, setCompanyRuc] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [configured, setConfigured] = useState(false);

  // We need to keep track of the required fields for the api payload
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Error cargando configuración');
        return;
      }
      if (data.configured) {
        setConfigured(true);
        setProvider(data.provider);
        setModel(data.model);
        setCompanyName(data.company_name ?? '');
        setCompanyRuc(data.company_ruc ?? '');
        setCompanyLocation(data.company_location ?? '');
        setCompanyAddress(data.company_address ?? '');
        setCompanyDescription(data.company_description ?? '');
      }
    } catch {
      toast.error('Error cargando configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accountId) return;
    void fetchConfig();
  }, [accountId, fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // API expects provider and model at minimum if not sending api_key.
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          company_name: companyName,
          company_ruc: companyRuc,
          company_location: companyLocation,
          company_address: companyAddress,
          company_description: companyDescription,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Perfil de negocio guardado');
        await fetchConfig();
      } else {
        toast.error(data.error ?? 'Error al guardar');
      }
    } catch {
      toast.error('Error de red al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
      </div>
    );
  }

  const disabled = !canEdit || saving || !configured;

  return (
    <div>
      <SettingsPanelHead
        title="Datos de la Empresa"
        description="Dale contexto a tu Agente de IA para que pueda responder preguntas sobre tu negocio, ubicación y servicios de manera precisa."
      />

      {!canEdit && (
        <p className="mb-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Solo los administradores pueden editar esta configuración.
        </p>
      )}

      {!configured && canEdit && (
        <p className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Primero debes configurar los Ajustes Técnicos (API Key y Modelo) antes de poder guardar el perfil de la empresa.
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4 text-primary" /> Perfil del Negocio
            </CardTitle>
            <CardDescription>
              Toda esta información se compartirá con el Agente de IA para que actúe como un representante oficial de tu empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nombre de la Empresa</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ej: Zapatería XYZ"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-ruc">RUC / Identificador fiscal</Label>
                <Input
                  id="company-ruc"
                  value={companyRuc}
                  onChange={(e) => setCompanyRuc(e.target.value)}
                  placeholder="Ej: 20123456789"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company-location">Ubicación (País/Ciudad)</Label>
                <Input
                  id="company-location"
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  placeholder="Ej: Lima, Perú"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Dirección Física</Label>
                <Input
                  id="company-address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Ej: Av. Principal 123, Miraflores"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-desc">Descripción Detallada y Reglas</Label>
              <Textarea
                id="company-desc"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Describe a qué se dedica la empresa, el tono de voz que debe usar el agente, y reglas importantes (ej. No dar descuentos mayores al 10%)."
                rows={6}
                disabled={disabled}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={disabled}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
