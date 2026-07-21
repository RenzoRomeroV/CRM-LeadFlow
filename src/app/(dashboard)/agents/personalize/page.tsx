'use client';

import { Sparkles, Building, CreditCard, ShoppingBag } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiPersonalizeConfig } from '@/components/settings/ai-personalize-config';
import { AiPaymentMethods } from '@/components/settings/ai-payment-methods';
import { AiProductsCatalog } from '@/components/settings/ai-products-catalog';

export default function AgentsPersonalizePage() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Personalización de IA
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Dale información a tu agente sobre tu negocio y métodos de pago para que pueda atender clientes y cerrar ventas como un humano.
      </p>

      <Tabs defaultValue="profile" className="mt-6">
        <TabsList>
          <TabsTrigger value="profile">
            <Building className="mr-1.5 h-4 w-4" /> Datos de la Empresa
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingBag className="mr-1.5 h-4 w-4" /> Productos
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-1.5 h-4 w-4" /> Métodos de Pago
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <AiPersonalizeConfig />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <AiProductsCatalog />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <AiPaymentMethods />
        </TabsContent>
      </Tabs>
    </div>
  );
}
