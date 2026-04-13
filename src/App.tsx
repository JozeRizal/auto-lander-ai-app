import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  Sparkles,
  Code, 
  FileText, 
  Eye, 
  Copy, 
  Check, 
  Loader2, 
  Zap, 
  Target, 
  ArrowRight, 
  Edit3, 
  Save, 
  Info,
  MessageCircle,
  Link as LinkIcon,
  Settings,
  Key
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { ScrollArea } from "./components/ui/scroll-area";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import { Toaster } from "./components/ui/sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "./components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { generateLandingPage, LandingPageInput, LandingPageResult, getEffectiveApiKey } from "./lib/gemini";

export default function App() {
  const [input, setInput] = useState<LandingPageInput>({
    productName: "",
    mainBenefit: "",
    features: "",
    originalPrice: "",
    discountedPrice: "",
    ctaType: "whatsapp",
    ctaValue: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Menganalisis Otak Reptil...");
  const [result, setResult] = useState<LandingPageResult | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [isLiveEditing, setIsLiveEditing] = useState(false);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const key = localStorage.getItem("gemini_api_key");
    if (!key && !process.env.GEMINI_API_KEY) {
      setShowApiDialog(true);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      const messages = [
        "Menganalisis Otak Reptil...",
        "Menyusun Copywriting Persuasif...",
        "Membangun Struktur Landing Page...",
        "Mengoptimalkan Psikologi Warna...",
        "Menyiapkan Tombol Konversi...",
        "Hampir Selesai..."
      ];
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleCtaTypeChange = (value: string) => {
    setInput((prev) => ({ ...prev, ctaType: value as "whatsapp" | "link", ctaValue: "" }));
  };

  const handleGenerate = async () => {
    const apiKey = getEffectiveApiKey();
    if (!apiKey) {
      toast.error("Anda belum mengatur API Key, silakan atur API Key terlebih dahulu.");
      setShowApiDialog(true);
      return;
    }

    if (!input.productName || !input.mainBenefit) {
      toast.error("Mohon isi Nama Produk dan Manfaat Utama.");
      return;
    }

    if (!input.ctaValue) {
      toast.error(input.ctaType === "whatsapp" ? "Mohon isi nomor WhatsApp." : "Mohon isi link tujuan.");
      return;
    }

    setIsLoading(true);
    setIsLiveEditing(false);
    try {
      const data = await generateLandingPage(input);
      setResult(data);
      toast.success("Landing Page berhasil dibuat!");
    } catch (error: any) {
      if (error?.message?.includes("API Key Gemini tidak ditemukan")) {
        toast.error("Anda belum mengatur API Key, silakan atur API Key terlebih dahulu.");
        setShowApiDialog(true);
      } else {
        toast.error("Gagal membuat landing page. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin ke clipboard!");
  };

  // Inject script for live editing
  const getProcessedHtml = (html: string) => {
    if (!html) return "";
    const script = `
      <script>
        window.addEventListener('message', (e) => {
          if (e.data === 'enable-edit') {
            document.body.contentEditable = 'true';
            document.body.style.outline = 'none';
            document.body.spellcheck = false;
            // Add visual cue
            const style = document.createElement('style');
            style.id = 'edit-mode-style';
            style.innerHTML = '*:hover { outline: 1px dashed #f97316 !important; cursor: text; }';
            document.head.appendChild(style);
          }
          if (e.data === 'disable-edit') {
            document.body.contentEditable = 'false';
            const style = document.getElementById('edit-mode-style');
            if (style) style.remove();
          }
          if (e.data === 'get-html') {
            // Remove the script and style before sending back
            const clone = document.documentElement.cloneNode(true);
            const s = clone.querySelector('script[data-editor-script]');
            if (s) s.remove();
            const st = clone.getElementById('edit-mode-style');
            if (st) st.remove();
            window.parent.postMessage({ type: 'html-content', html: clone.outerHTML }, '*');
          }
        });
      </script>
    `;
    // Add an identifier to the script so we can remove it later
    const scriptWithId = script.replace('<script>', '<script data-editor-script="true">');
    
    if (html.includes('</body>')) {
      return html.replace('</body>', `${scriptWithId}</body>`);
    }
    return html + scriptWithId;
  };

  const toggleLiveEdit = () => {
    const newState = !isLiveEditing;
    setIsLiveEditing(newState);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(newState ? 'enable-edit' : 'disable-edit', '*');
      if (newState) {
        toast.info("Mode Edit Aktif: Klik pada teks di preview untuk mengubahnya.");
      } else {
        toast.info("Mode Edit Dimatikan.");
      }
    }
  };

  const saveLiveEdits = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('get-html', '*');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'html-content') {
        setResult(prev => prev ? { ...prev, html: event.data.html } : null);
        toast.success("Perubahan berhasil disimpan ke Kode HTML!");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Auto Lander AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">AI Page Builder</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Instinctive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-orange-500" />
              <span>Conversion</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setTempApiKey(localStorage.getItem("gemini_api_key") || "");
                setShowApiDialog(true);
              }}
              className="text-slate-500 hover:text-orange-600"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    Input Produk
                  </CardTitle>
                  <CardDescription>
                    Berikan detail produk Anda untuk memicu insting pembeli.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Nama Produk/Jasa</Label>
                    <Input 
                      id="productName"
                      name="productName"
                      placeholder="Contoh: Kursus Copywriting Kilat"
                      value={input.productName}
                      onChange={handleInputChange}
                      className="focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mainBenefit">Manfaat Utama (The Big Gain)</Label>
                    <Textarea 
                      id="mainBenefit"
                      name="mainBenefit"
                      placeholder="Apa hasil instan yang didapat user? (Contoh: Jago nulis iklan dalam 24 jam)"
                      value={input.mainBenefit}
                      onChange={handleInputChange}
                      className="min-h-[80px] focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="features">Fitur Teknis (List)</Label>
                    <Textarea 
                      id="features"
                      name="features"
                      placeholder="Sebutkan fitur-fiturnya... (Contoh: 10 Video HD, Template Iklan, Grup Support)"
                      value={input.features}
                      onChange={handleInputChange}
                      className="min-h-[100px] focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Harga Asli</Label>
                      <Input 
                        id="originalPrice"
                        name="originalPrice"
                        placeholder="Contoh: 999.000"
                        value={input.originalPrice}
                        onChange={handleInputChange}
                        className="focus-visible:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountedPrice">Harga Coret (Promo)</Label>
                      <Input 
                        id="discountedPrice"
                        name="discountedPrice"
                        placeholder="Contoh: 149.000"
                        value={input.discountedPrice}
                        onChange={handleInputChange}
                        className="focus-visible:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-bold text-slate-700">Tujuan Tombol CTA</Label>
                    <Tabs value={input.ctaType} onValueChange={handleCtaTypeChange} className="w-full">
                      <TabsList className="grid grid-cols-2 w-full bg-slate-100">
                        <TabsTrigger value="whatsapp" className="data-[state=active]:bg-white">
                          <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                          WhatsApp
                        </TabsTrigger>
                        <TabsTrigger value="link" className="data-[state=active]:bg-white">
                          <LinkIcon className="w-4 h-4 mr-2 text-blue-600" />
                          Link Custom
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="mt-3">
                        {input.ctaType === "whatsapp" ? (
                          <div className="space-y-2">
                            <Label htmlFor="ctaValue" className="text-xs text-slate-500">Nomor WhatsApp (Gunakan format 62...)</Label>
                            <Input 
                              id="ctaValue"
                              name="ctaValue"
                              placeholder="Contoh: 628123456789"
                              value={input.ctaValue}
                              onChange={handleInputChange}
                              className="focus-visible:ring-green-500"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="ctaValue" className="text-xs text-slate-500">Link Tujuan (URL Lengkap)</Label>
                            <Input 
                              id="ctaValue"
                              name="ctaValue"
                              placeholder="Contoh: https://tokoanda.com/beli"
                              value={input.ctaValue}
                              onChange={handleInputChange}
                              className="focus-visible:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </Tabs>
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={isLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl transition-all active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {loadingMessage}
                      </>
                    ) : (
                      <>
                        Bangun Landing Page
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <h3 className="text-orange-800 font-bold text-sm mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Tips :
              </h3>
              <ul className="text-xs text-orange-700 space-y-1.5 list-disc pl-4">
                <li>Gunakan kata-kata yang memicu emosi (Takut, Ingin, Nyaman).</li>
                <li>Fokus pada "Apa untungnya buat SAYA?" (Self-Centered).</li>
                <li>Tunjukkan kontras yang tajam antara masalah dan solusi.</li>
              </ul>
            </div>
          </div>

          {/* Result Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="h-full"
                >
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="preview" className="data-[state=active]:bg-white">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </TabsTrigger>
                        <TabsTrigger value="text" className="data-[state=active]:bg-white">
                          <FileText className="w-4 h-4 mr-2" />
                          Copywriting
                        </TabsTrigger>
                        <TabsTrigger value="code" className="data-[state=active]:bg-white">
                          <Code className="w-4 h-4 mr-2" />
                          HTML Code
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-2">
                        {activeTab === "preview" && (
                          <>
                            <Button 
                              variant={isLiveEditing ? "default" : "outline"} 
                              size="sm" 
                              onClick={toggleLiveEdit}
                              className={`h-9 ${isLiveEditing ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              {isLiveEditing ? "Matikan Edit" : "Edit Manual"}
                            </Button>
                            {isLiveEditing && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={saveLiveEdits}
                                className="h-9 border-orange-200 text-orange-700 hover:bg-orange-50"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Simpan
                              </Button>
                            )}
                          </>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => copyToClipboard(activeTab === "text" ? result.markdown : result.html)}
                          className="h-9"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Salin {activeTab === "text" ? "Teks" : "Kode"}
                        </Button>
                      </div>
                    </div>

                    <div className="flex-grow min-h-[600px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
                      <TabsContent value="preview" className="m-0 h-full">
                        {isLiveEditing && (
                          <div className="absolute top-4 right-4 z-10 bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg animate-pulse">
                            <Edit3 className="w-3 h-3" />
                            MODE EDIT AKTIF
                          </div>
                        )}
                        <iframe 
                          ref={iframeRef}
                          srcDoc={getProcessedHtml(result.html)}
                          title="Landing Page Preview"
                          className="w-full h-[600px] border-none"
                        />
                      </TabsContent>

                      <TabsContent value="text" className="m-0 h-full">
                        <ScrollArea className="h-[600px] p-6">
                          <div className="prose prose-slate max-w-none">
                            <ReactMarkdown>{result.markdown}</ReactMarkdown>
                          </div>
                        </ScrollArea>
                      </TabsContent>

                      <TabsContent value="code" className="m-0 h-full">
                        <div className="p-4 bg-slate-800 text-slate-400 text-[10px] flex items-center gap-2">
                          <Info className="w-3 h-3" />
                          <span>Kode di bawah akan diperbarui jika Anda menekan tombol "Simpan" di mode edit preview.</span>
                        </div>
                        <ScrollArea className="h-[560px] p-6 bg-slate-900">
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                            {result.html}
                          </pre>
                        </ScrollArea>
                      </TabsContent>
                    </div>
                  </Tabs>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50"
                >
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <Brain className="w-10 h-10 text-slate-300" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-400 mb-2">Belum Ada Landing Page</h2>
                  <p className="text-slate-400 max-w-xs mx-auto">
                    Isi form di samping dan klik tombol "Bangun Landing Page" untuk mulai menghasilkan konversi.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <Brain className="w-5 h-5" />
            <span className="font-bold">Auto Lander AI</span>
          </div>
          <p className="text-sm text-slate-500">
            &copy; 2026 Built for High Conversion. Powered by AI.
          </p>
        </div>
      </footer>

      {/* API Key Dialog */}
      <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-600" />
              Konfigurasi API Key Gemini
            </DialogTitle>
            <DialogDescription>
              Masukkan API Key Gemini Anda untuk mulai menggunakan Auto Lander AI. Kunci ini akan disimpan dengan aman di browser Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="AIzaSy..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="focus-visible:ring-orange-500"
              />
              <p className="text-[10px] text-slate-500">
                Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-orange-600 underline">Google AI Studio</a>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowApiDialog(false)}
              className="rounded-full"
            >
              Batal
            </Button>
            <Button 
              onClick={() => {
                if (tempApiKey.trim()) {
                  localStorage.setItem("gemini_api_key", tempApiKey.trim());
                  toast.success("API Key berhasil disimpan!");
                  setShowApiDialog(false);
                } else {
                  toast.error("Mohon masukkan API Key yang valid.");
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-full"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
