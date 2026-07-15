'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Upload, UserRound, Globe, Mail, Building, AlignLeft, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SettingsPanelHead } from './settings-panel-head';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function WhatsAppProfile() {
  const t = useTranslations('Settings.whatsapp_profile');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [vertical, setVertical] = useState('OTHER');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/whatsapp/profile');
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Failed to fetch profile');
        } else if (data.profile) {
          setAbout(data.profile.about || '');
          setDescription(data.profile.description || '');
          setEmail(data.profile.email || '');
          setWebsite(data.profile.websites?.[0] || '');
          setVertical(data.profile.vertical || 'OTHER');
          setProfilePictureUrl(data.profile.profile_picture_url || '');
        }
      } catch (err) {
        console.error(err);
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('error_file_too_large') || 'File must be under 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      if (about) formData.append('about', about);
      if (description) formData.append('description', description);
      if (email) formData.append('email', email);
      if (website) formData.append('websites', website);
      if (vertical) formData.append('vertical', vertical);
      
      if (selectedFile) {
        formData.append('profile_picture', selectedFile);
      }

      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || t('error_saving') || 'Failed to save profile');
      } else {
        toast.success(t('success_saving') || 'Profile updated successfully!');
        if (previewUrl) {
          setProfilePictureUrl(previewUrl);
          setSelectedFile(null);
          setPreviewUrl(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t('error_saving') || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title={t("title") || 'WhatsApp Profile'}
          description={t("description") || 'Manage how your business appears to customers on WhatsApp'}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title={t("title") || 'WhatsApp Profile'}
          description={t("description") || 'Manage how your business appears to customers on WhatsApp'}
        />
        <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20 mt-4">
          <p className="font-medium text-sm">{error}</p>
          <p className="text-xs mt-1 opacity-80">{t('config_required_hint') || 'You need to set up WhatsApp Config first.'}</p>
        </div>
      </section>
    );
  }

  const displayImage = previewUrl || profilePictureUrl;

  return (
    <section className="animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title={t("title") || 'WhatsApp Profile'}
        description={t("description") || 'Manage how your business appears to customers on WhatsApp'}
      />
      
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-base">{t('public_info') || 'Public Information'}</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                {t('public_info_desc') || 'These details are visible to anyone who views your business profile on WhatsApp.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              <div className="flex items-start gap-6 pb-2">
                <div className="relative group shrink-0">
                  <div className="size-24 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center relative">
                    {displayImage ? (
                      <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserRound className="size-10 text-muted-foreground/50" />
                    )}
                    
                    <div 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-5 mb-1" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">{t('change') || 'Change'}</span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/jpeg,image/png"
                    onChange={handleFileSelect}
                  />
                </div>
                <div className="space-y-1 mt-2">
                  <p className="text-sm font-medium text-foreground">{t('profile_photo') || 'Profile Photo'}</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {t('photo_hint') || 'Recommended size: 640x640 pixels. Maximum file size: 5MB. Formats: JPG, PNG.'}
                  </p>
                  {selectedFile && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs text-destructive"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      {t('cancel_upload') || 'Cancel upload'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Info className="size-3.5" />
                  {t('about') || 'About (Status)'}
                </Label>
                <Input
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  maxLength={139}
                  className="bg-muted border-border text-foreground"
                  placeholder={t('about_placeholder') || 'e.g. Available'}
                />
                <p className="text-[10px] text-muted-foreground text-right">{about.length}/139</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <AlignLeft className="size-3.5" />
                  {t('description') || 'Business Description'}
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={512}
                  className="bg-muted border-border text-foreground resize-none h-24"
                  placeholder={t('desc_placeholder') || 'Tell your customers about your business...'}
                />
                <p className="text-[10px] text-muted-foreground text-right">{description.length}/512</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Globe className="size-3.5" />
                  {t('website') || 'Website'}
                </Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="bg-muted border-border text-foreground"
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Mail className="size-3.5" />
                    {t('email') || 'Email'}
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-muted border-border text-foreground"
                    placeholder="contact@company.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Building className="size-3.5" />
                    {t('vertical') || 'Category'}
                  </Label>
                  <Select value={vertical} onValueChange={(val) => setVertical(val || '')}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder={t('select_category') || 'Select a category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="EDUCATION">Education</SelectItem>
                      <SelectItem value="FINANCE">Finance</SelectItem>
                      <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                      <SelectItem value="RETAIL">Retail</SelectItem>
                      <SelectItem value="HEALTH">Health</SelectItem>
                      <SelectItem value="PROFESSIONAL_SERVICES">Professional Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
          
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-32"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  {t('saving') || 'Saving...'}
                </>
              ) : (
                t('save_changes') || 'Save Changes'
              )}
            </Button>
          </div>
        </div>

        {/* Live Preview Sidebar */}
        <div className="hidden lg:block">
          <Card className="sticky top-6 overflow-hidden">
            <div className="bg-[#075E54] p-4 text-white">
              <p className="font-semibold text-sm tracking-wide text-center uppercase">
                {t('preview') || 'Live Preview'}
              </p>
            </div>
            <CardContent className="p-0 bg-[#ECE5DD] h-[500px] relative overflow-y-auto">
              {/* Fake WhatsApp Profile Header */}
              <div className="bg-white shadow-sm mb-2">
                <div className="h-32 bg-gray-200 w-full relative">
                  {/* Banner */}
                </div>
                <div className="px-4 pb-4 -mt-12 flex flex-col items-center relative z-10">
                  <div className="size-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
                    {displayImage ? (
                      <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <UserRound className="size-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mt-2 text-gray-900">Your Business Name</h3>
                  <p className="text-sm text-gray-500 mb-4">{vertical}</p>
                  
                  <div className="flex gap-4 w-full">
                    <div className="flex-1 bg-gray-100 py-2 rounded-lg text-center">
                      <span className="text-xs font-semibold text-gray-600 block mb-1">Message</span>
                    </div>
                    <div className="flex-1 bg-gray-100 py-2 rounded-lg text-center">
                      <span className="text-xs font-semibold text-gray-600 block mb-1">Call</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm p-4 mb-2 space-y-4">
                {description && (
                  <div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{description}</p>
                  </div>
                )}
                
                {about && (
                  <div className="flex items-start gap-3">
                    <Info className="size-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{about}</p>
                      <p className="text-xs text-gray-500">About</p>
                    </div>
                  </div>
                )}

                {email && (
                  <div className="flex items-start gap-3">
                    <Mail className="size-5 text-gray-400 shrink-0" />
                    <p className="text-sm text-blue-600 mt-0.5">{email}</p>
                  </div>
                )}

                {website && (
                  <div className="flex items-start gap-3">
                    <Globe className="size-5 text-gray-400 shrink-0" />
                    <p className="text-sm text-blue-600 mt-0.5">{website}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
