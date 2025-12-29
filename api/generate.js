// Serverless Function untuk Vercel yang menghasilkan caption Instagram berbasis Gemini (gratis tier tersedia).
// Menggunakan fetch bawaan Node 18; jika tidak tersedia, fallback ke node-fetch.
const doFetch =
  typeof fetch === 'function'
    ? fetch
    : (...args) => import('node-fetch').then(({ default: fetchImpl }) => fetchImpl(...args));

module.exports = async (req, res) => {
  // Hanya izinkan method POST untuk keamanan dan konsistensi.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  // Pastikan API key tersedia di server.
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server belum dikonfigurasi dengan GEMINI_API_KEY.' });
  }

  // Coba baca body request sebagai JSON, termasuk fallback jika body masih berupa string.
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (err) {
      return res.status(400).json({ error: 'Body harus berupa JSON valid.' });
    }
  }

  const { prompt } = body || {};

  // Validasi input sederhana agar prompt selalu terisi.
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Isi prompt terlebih dahulu.' });
  }

  const userPrompt = `Buatkan caption Instagram untuk UMKM berdasarkan permintaan berikut:
${prompt}
Tambahkan emoji dan hashtag secukupnya.`;

  try {
    // Panggil Gemini generateContent endpoint (v1 + model latest).
    const response = await doFetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Anda adalah asisten copywriting kreatif untuk UMKM. Beri caption singkat, menarik, ramah, dan mudah dibaca.' },
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 180
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${errText || response.statusText}`);
    }

    const completion = await response.json();
    const caption =
      completion.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() ||
      completion.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!caption) {
      throw new Error('Caption kosong dari model.');
    }

    return res.status(200).json({ caption });
  } catch (error) {
    // Log detail error di server untuk debugging, tapi kirim pesan aman ke client.
    console.error('Error generate caption:', error);
    const message = (error?.message || 'Terjadi kesalahan saat membuat caption.').slice(0, 200);
    return res.status(500).json({ error: message });
  }
};

// Pastikan runtime Node 18+ agar fetch tersedia.
module.exports.config = {
  runtime: 'nodejs18.x'
};
