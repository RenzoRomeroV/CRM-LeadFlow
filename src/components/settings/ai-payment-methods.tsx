'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { canEditSettings } from '@/lib/auth/roles';
import { toast } from 'sonner';
import { Plus, Trash2, CreditCard, Banknote, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

type PaymentMethod = {
  id: string;
  type: string;
  bank_name: string | null;
  account_number: string;
  cci: string | null;
  holder_name: string;
  qr_image_url: string | null;
};

export function AiPaymentMethods() {
  const { accountRole, accountId } = useAuth();
  const supabase = createClient();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [type, setType] = useState('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cci, setCci] = useState('');
  const [holderName, setHolderName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchMethods();
  }, [accountId]);

  const fetchMethods = async () => {
    try {
      const res = await fetch('/api/ai/payment-methods');
      const json = await res.json();
      if (res.ok) setMethods(json.data || []);
    } catch {
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!accountNumber || !holderName) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    setSaving(true);
    try {
      let qrUrl = null;

      if (file && (type === 'yape' || type === 'plin')) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `${accountId}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment_qrs')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment_qrs')
          .getPublicUrl(filePath);

        qrUrl = urlData.publicUrl;
      }

      const res = await fetch('/api/ai/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          bank_name: type === 'bank_transfer' ? bankName : null,
          account_number: accountNumber,
          cci: type === 'bank_transfer' ? cci : null,
          holder_name: holderName,
          qr_image_url: qrUrl,
        }),
      });

      if (res.ok) {
        toast.success('Método de pago agregado');
        setIsOpen(false);
        fetchMethods();
        // Reset form
        setType('bank_transfer');
        setBankName('');
        setAccountNumber('');
        setCci('');
        setHolderName('');
        setFile(null);
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Error al guardar');
      }
    } catch (e) {
      toast.error('Error al subir imagen o guardar método');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este método?')) return;
    try {
      const res = await fetch(`/api/ai/payment-methods/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Eliminado');
        fetchMethods();
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Métodos de Pago Activos</h2>
          <p className="text-sm text-muted-foreground">El agente de IA usará estos métodos para cerrar ventas directamente por WhatsApp.</p>
        </div>
        
        {canEdit && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="h-4 w-4 mr-2" /> Agregar Método
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nuevo Método de Pago</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Pago</Label>
                  <Select value={type} onValueChange={(val) => setType(val || '')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="yape">Yape</SelectItem>
                      <SelectItem value="plin">Plin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type === 'bank_transfer' && (
                  <div className="space-y-2">
                    <Label>Banco</Label>
                    <Input placeholder="Ej: BCP, Interbank..." value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{type === 'bank_transfer' ? 'Número de Cuenta' : 'Número de Celular'}</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>

                {type === 'bank_transfer' && (
                  <div className="space-y-2">
                    <Label>CCI (Opcional)</Label>
                    <Input value={cci} onChange={(e) => setCci(e.target.value)} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Titular / Razón Social</Label>
                  <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
                </div>

                {(type === 'yape' || type === 'plin') && (
                  <div className="space-y-2">
                    <Label>Imagen del Código QR (Opcional)</Label>
                    <Input type="file" accept="image/*" onChange={handleFileChange} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {methods.length === 0 ? (
          <div className="col-span-full py-8 text-center border rounded-lg bg-muted/20">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Aún no has agregado métodos de pago.</p>
          </div>
        ) : (
          methods.map((method) => (
            <Card key={method.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {method.type === 'bank_transfer' ? <Banknote className="h-4 w-4 text-primary" /> : <QrCode className="h-4 w-4 text-green-500" />}
                  {method.type === 'bank_transfer' ? 'Transferencia' : method.type === 'yape' ? 'Yape' : 'Plin'}
                  {method.bank_name && <span className="text-xs font-normal text-muted-foreground ml-auto">{method.bank_name}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-medium">{method.account_number}</p>
                  {method.cci && <p className="text-xs text-muted-foreground">CCI: {method.cci}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{method.holder_name}</p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {method.qr_image_url && (
                  <div className="mt-4 border rounded p-1 inline-block bg-white">
                    <img src={method.qr_image_url} alt="QR" className="h-16 w-16 object-contain" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
