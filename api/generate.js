// Serverless Function untuk Vercel yang menghasilkan caption Instagram berbasis OpenAI.
// Menggunakan fetch bawaan Node 18+ agar bebas dependensi tambahan.
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
    // Panggil OpenAI Chat Completions via HTTP agar sederhana dan eksplisit.
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
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
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${errText || response.statusText}`);
    }

    const completion = await response.json();
    const caption = completion.choices?.[0]?.message?.content?.trim();

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
