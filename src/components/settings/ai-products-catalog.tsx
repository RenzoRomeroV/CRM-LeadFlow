'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { canEditSettings } from '@/lib/auth/roles';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Package, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

type ProductVariant = {
  id: string;
  name: string | null;
  price: number;
  stock: number;
  attributes: Record<string, string>;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  product_variants: ProductVariant[];
};

type CompanyField = {
  id?: string;
  field_name: string;
  field_type: string;
};

// Form state variant
type FormVariant = {
  name: string;
  price: string;
  stock: string;
  attributes: Record<string, string>;
};

export function AiProductsCatalog() {
  const { accountRole, accountId } = useAuth();
  const supabase = createClient();
  const canEdit = accountRole ? canEditSettings(accountRole) : false;

  const [products, setProducts] = useState<Product[]>([]);
  const [companyFields, setCompanyFields] = useState<CompanyField[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<FormVariant[]>([]);

  // Config State
  const [editingFields, setEditingFields] = useState<CompanyField[]>([]);

  useEffect(() => {
    if (accountId) {
      fetchData();
    }
  }, [accountId]);

  const fetchData = async () => {
    try {
      // Fetch Products and their nested variants
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch Fields Schema
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('company_product_fields')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (fieldsError) {
        console.warn("Could not fetch fields", fieldsError);
      } else {
        setCompanyFields(fieldsData || []);
        setEditingFields(fieldsData || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getEmptyAttributes = () => {
    const initialAttrs: Record<string, string> = {};
    companyFields.forEach(f => {
      initialAttrs[f.field_name.toLowerCase()] = '';
    });
    return initialAttrs;
  };

  const handleOpenNewProduct = () => {
    setName('');
    setDescription('');
    setVariants([
      { name: 'Principal', price: '', stock: '0', attributes: getEmptyAttributes() }
    ]);
    setIsOpen(true);
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', stock: '0', attributes: getEmptyAttributes() }]);
  };

  const removeVariant = (index: number) => {
    const newVars = [...variants];
    newVars.splice(index, 1);
    setVariants(newVars);
  };

  const updateVariant = (index: number, field: keyof FormVariant, value: any) => {
    const newVars = [...variants];
    newVars[index] = { ...newVars[index], [field]: value };
    setVariants(newVars);
  };

  const updateVariantAttr = (index: number, attrKey: string, attrVal: string) => {
    const newVars = [...variants];
    newVars[index].attributes = { ...newVars[index].attributes, [attrKey]: attrVal };
    setVariants(newVars);
  };

  const addField = () => {
    setEditingFields([...editingFields, { field_name: '', field_type: 'text' }]);
  };

  const updateField = (index: number, val: string) => {
    const newFields = [...editingFields];
    newFields[index].field_name = val;
    setEditingFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = [...editingFields];
    newFields.splice(index, 1);
    setEditingFields(newFields);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await supabase.from('company_product_fields').delete().eq('account_id', accountId);
      
      const toInsert = editingFields
        .filter(f => f.field_name.trim())
        .map(f => ({
          account_id: accountId,
          field_name: f.field_name.trim(),
          field_type: f.field_type
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase.from('company_product_fields').insert(toInsert);
        if (error) throw error;
      }
      
      toast.success('Configuración guardada');
      setIsConfigOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }
    
    if (variants.length === 0) {
      toast.error('Debes agregar al menos una variante');
      return;
    }
    
    for (let i = 0; i < variants.length; i++) {
      if (!variants[i].price) {
        toast.error(`La variante ${i+1} debe tener un precio`);
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Insert Product
      const { data: newProduct, error: prodErr } = await supabase.from('products').insert({
        account_id: accountId,
        name,
        description,
      }).select('id').single();

      if (prodErr) throw prodErr;

      // 2. Insert Variants
      const variantsToInsert = variants.map(v => {
        const attrsRecord: Record<string, string> = {};
        Object.entries(v.attributes).forEach(([key, val]) => {
          if (val.trim()) {
            attrsRecord[key] = val.trim();
          }
        });
        
        return {
          product_id: newProduct.id,
          name: v.name || null,
          price: parseFloat(v.price) || 0,
          stock: parseInt(v.stock, 10) || 0,
          attributes: attrsRecord,
        };
      });

      const { error: varsErr } = await supabase.from('product_variants').insert(variantsToInsert);
      if (varsErr) throw varsErr;

      toast.success('Producto agregado exitosamente');
      setIsOpen(false);
      fetchData();
      
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto y todas sus variantes?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto eliminado');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar productos..." 
            className="pl-8" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
              <Settings className="mr-2 h-4 w-4" /> Configurar Campos
            </Button>
            <Button onClick={handleOpenNewProduct}>
              <Plus className="mr-2 h-4 w-4" /> Agregar Producto
            </Button>
          </div>
        )}
      </div>

      {canEdit && (
        <>
          {/* Modal de Configuración */}
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Configuración de Negocio</DialogTitle>
                <DialogDescription>
                  Define los campos que aplican a tus variantes (Ej: Marca, Talla, Sabor, Peso).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {editingFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input 
                      placeholder="Nombre del campo (Ej. Sabor)" 
                      value={field.field_name}
                      onChange={(e) => updateField(index, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeField(index)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full border-dashed">
                  <Plus className="mr-2 h-4 w-4" /> Agregar Campo
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancelar</Button>
                <Button onClick={saveConfig} disabled={savingConfig}>
                  {savingConfig && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Nuevo Producto */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Producto</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Producto *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Torta o Zapatillas" />
                </div>
                
                <div className="space-y-2">
                  <Label>Descripción General (Opcional)</Label>
                  <Textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Descripción compartida por todas las variantes..." 
                    rows={2}
                  />
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">Variantes del Producto</Label>
                    <Button variant="outline" size="sm" onClick={addVariant} className="h-8">
                      <Plus className="mr-2 h-3 w-3" /> Agregar Variante
                    </Button>
                  </div>

                  {variants.map((variant, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-muted/30 relative space-y-3">
                      {variants.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-2 top-2 h-6 w-6 text-destructive"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-8">
                        <div className="space-y-1">
                          <Label className="text-xs">Identificador</Label>
                          <Input 
                            value={variant.name} 
                            onChange={(e) => updateVariant(index, 'name', e.target.value)} 
                            placeholder="Ej. Talla 40, Mora" 
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Precio *</Label>
                          <Input 
                            type="number" step="0.01" 
                            value={variant.price} 
                            onChange={(e) => updateVariant(index, 'price', e.target.value)} 
                            placeholder="0.00" 
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Stock</Label>
                          <Input 
                            type="number" 
                            value={variant.stock} 
                            onChange={(e) => updateVariant(index, 'stock', e.target.value)} 
                            placeholder="0" 
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {companyFields.length > 0 && (
                        <div className="pt-2 border-t mt-2">
                          <div className="grid grid-cols-2 gap-3">
                            {companyFields.map((field) => {
                              const key = field.field_name.toLowerCase();
                              return (
                                <div key={key} className="space-y-1">
                                  <Label className="text-xs">{field.field_name}</Label>
                                  <Input 
                                    className="h-8 text-sm"
                                    placeholder={`...`}
                                    value={variant.attributes[key] || ''}
                                    onChange={(e) => updateVariantAttr(index, key, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {variants.length === 0 && (
                    <div className="text-sm text-center p-4 border border-dashed rounded-md text-muted-foreground">
                      Debes agregar al menos una variante.
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Producto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-muted/20">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p>No se encontraron productos.</p>
            {canEdit && <p className="text-sm mt-1">Haz clic en Agregar Producto para poblar tu catálogo.</p>}
          </div>
        ) : (
          filteredProducts.map((product) => {
            const variants = product.product_variants || [];
            // Calculate a price range to show
            const prices = variants.map(v => v.price);
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            const priceText = minPrice === maxPrice 
              ? `S/ ${minPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
              : `S/ ${minPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })} - S/ ${maxPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

            return (
              <Card key={product.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-3 bg-muted/10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                    <span className="font-bold whitespace-nowrap ml-2 text-primary">
                      {priceText}
                    </span>
                  </div>
                  <CardDescription className="line-clamp-2 mt-1 min-h-[20px]">
                    {product.description || 'Sin descripción'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4 pt-4 flex-1 flex flex-col">
                  <div className="space-y-3 mb-4 flex-1">
                    <p className="text-sm font-semibold text-muted-foreground">Variantes ({variants.length})</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {variants.map((v) => (
                        <div key={v.id} className="p-3 border rounded-md bg-card shadow-sm text-sm">
                          <div className="flex justify-between font-medium mb-2">
                            <span>{v.name || 'Principal'}</span>
                            <span>S/ {v.price.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {Object.entries(v.attributes || {}).map(([key, value]) => (
                              <Badge variant="secondary" key={key} className="text-xs font-normal">
                                <span className="font-medium mr-1 capitalize">{key}:</span> {value as string}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stock disponible: {v.stock}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center justify-end mt-4 pt-3 border-t">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)} className="h-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-1.5" /> Eliminar Producto
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
