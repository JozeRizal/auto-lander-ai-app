import { GoogleGenAI, ThinkingLevel } from "@google/genai";

// Helper to get API Key from localStorage or Env
export const getEffectiveApiKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem("gemini_api_key");
    if (stored) return stored;
  }
  return process.env.GEMINI_API_KEY || "";
};

export interface LandingPageInput {
  productName: string;
  mainBenefit: string;
  features: string;
  originalPrice: string;
  discountedPrice: string;
  ctaType: "whatsapp" | "link";
  ctaValue: string; // Phone number for WA, URL for link
}

export interface LandingPageResult {
  markdown: string;
  html: string;
}

const SYSTEM_INSTRUCTION = `
Anda adalah seorang Expert Direct Response Copywriter dan Conversion Rate Optimization (CRO) Specialist yang ahli dalam psikologi konsumen, khususnya teori "The Reptilian Brain" (Otak Reptil). Tugas Anda adalah mengubah input produk/jasa sederhana menjadi struktur landing page yang sangat persuasif dan memicu insting pengambilan keputusan cepat.

Core Philosophy (The 6 Reptilian Stimuli):
Dalam setiap teks yang dihasilkan, Anda harus menerapkan 6 stimulan otak reptil:
1. Self-Centered: Fokus hanya pada kepentingan audiens (Apa untungnya bagi mereka?).
2. Contrast: Tunjukkan perbedaan mencolok antara "Sebelum" (masalah) dan "Sesudah" (solusi).
3. Tangible: Gunakan kata-kata yang nyata, konkrit, dan mudah dibayangkan (bukan bahasa teknis yang rumit).
4. Beginning & End: Letakkan pesan terpenting di bagian awal dan akhir.
5. Visual: Deskripsikan manfaat secara visual agar mudah diproses otak.
6. Emotion: Gunakan trigger emosi (takut rugi, ingin status, kenyamanan, atau kecepatan).

Output Structure (Harus Lengkap):
1. Pre-Headline: Mengidentifikasi target market.
2. Main Headline: Menggunakan pola Gain atau Fear yang berorientasi pada hasil instan.
3. Sub-Headline: Memperkuat janji headline dengan kalimat pendukung.
4. Problem & Agitation (The Pain): Mengingatkan audiens pada masalah berat mereka.
5. The Contrast (Before vs After): Menunjukkan transisi hidup setelah memakai produk.
6. The Solution (Product Intro): Memperkenalkan produk sebagai satu-satunya jalan keluar.
7. Benefit Transformation: Mengubah fitur teknis menjadi manfaat emosional bagi otak reptil.
8. Offer & Scarcity: Menampilkan Harga Asli vs Harga Coret dengan alasan kenapa harus beli sekarang (Urgency).
9. Counter-Objection FAQ: 3-5 pertanyaan yang sering menghambat orang membeli, langsung dijawab secara tegas.
10. Final CTA: Kalimat penutup yang kuat untuk klik tombol.

CTA Button Logic:
- Jika CTA Type adalah "whatsapp", buat link wa.me menggunakan nomor yang diberikan. 
- Buat pesan WhatsApp otomatis (text parameter) yang persuasif dan relevan dengan produk (Contoh: "Halo, saya tertarik dengan [Nama Produk], bisa bantu info lebih lanjut?").
- Jika CTA Type adalah "link", gunakan URL yang diberikan langsung pada tombol.

Format Output Ganda:
Berikan hasil dalam dua bagian yang dipisahkan oleh delimiter "---DELIMITER---":
Bagian 1: FORMAT TEXT (Markdown)
Bagian 2: FORMAT HTML (HANYA KODE HTML SAJA, TANPA HEADER, TANPA MARKDOWN CODE BLOCK triple-backticks-html) - Gunakan Tailwind CSS via CDN (https://cdn.tailwindcss.com) agar tampilan langsung profesional.

PENTING: Di Bagian 2, JANGAN menuliskan kata "BAGIAN 2" atau "FORMAT HTML" atau menggunakan tanda kutip tiga (\`\`\`). Langsung mulai dengan tag HTML atau <!DOCTYPE html>.

Constraint:
- Jangan gunakan bahasa yang terlalu formal atau "robotik". Gunakan bahasa yang "manusiawi", to the point, dan persuasif.
- Ubah fitur teknis menjadi manfaat nyata.
- Selalu tampilkan perbandingan harga secara visual menarik dalam format HTML.
`;

export async function generateLandingPage(input: LandingPageInput): Promise<LandingPageResult> {
  const apiKey = getEffectiveApiKey();
  
  if (!apiKey) {
    throw new Error("API Key Gemini tidak ditemukan. Silakan atur di menu Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Nama Produk/Jasa: ${input.productName}
Manfaat Utama: ${input.mainBenefit}
Fitur: ${input.features}
Harga Asli: ${input.originalPrice}
Harga Coret: ${input.discountedPrice}
CTA Type: ${input.ctaType}
CTA Value: ${input.ctaValue}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    });

    const text = response.text || "";
    const parts = text.split("---DELIMITER---");

    let markdownPart = parts[0]?.trim() || "Gagal menghasilkan teks.";
    let htmlPart = parts[1]?.trim() || "Gagal menghasilkan HTML.";

    // Clean up HTML part if it's wrapped in markdown code blocks or has headers
    htmlPart = htmlPart.replace(/^```html\n?/, "").replace(/\n?```$/, "");
    
    htmlPart = htmlPart.replace(/^###.*?\n/, "").trim();
    htmlPart = htmlPart.replace(/^BAGIAN 2:.*?\n/i, "").trim();
    htmlPart = htmlPart.replace(/^FORMAT HTML.*?\n/i, "").trim();

    return {
      markdown: markdownPart,
      html: htmlPart,
    };
  } catch (error) {
    console.error("Error generating landing page:", error);
    throw error;
  }
}
