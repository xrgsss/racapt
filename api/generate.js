// Serverless Function untuk Vercel yang menghasilkan caption Instagram berbasis OpenAI.
// API key dibaca dari environment variable OPENAI_API_KEY agar tetap aman (tidak pernah dikirim ke frontend).
const OpenAI = require('openai');

// Inisialisasi client OpenAI sekali di luar handler untuk efisiensi.
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async (req, res) => {
  // Hanya izinkan method POST untuk keamanan dan konsistensi.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Gunakan POST.' });
  }

  // Pastikan API key tersedia di server.
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Server belum dikonfigurasi dengan OpenAI API Key.' });
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
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Anda adalah asisten copywriting kreatif untuk UMKM. Beri caption singkat, menarik, ramah, dan mudah dibaca.'
        },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 180,
      temperature: 0.7
    });

    const caption = completion.choices?.[0]?.message?.content?.trim();

    if (!caption) {
      throw new Error('Caption kosong dari model.');
    }

    return res.status(200).json({ caption });
  } catch (error) {
    // Log detail error di server untuk debugging, tapi kirim pesan aman ke client.
    console.error('Error generate caption:', error);
    const message = error?.message?.includes('Invalid') ? 'Input kurang valid.' : 'Terjadi kesalahan saat membuat caption.';
    return res.status(500).json({ error: message });
  }
};
