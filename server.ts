import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // API Route for Gemini with Multi-Model Fallback
  app.post('/api/gemini', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing on server' });
      }

      const { contents, systemInstruction, responseMimeType, responseSchema } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let reply = '';
      let lastErr: any = null;

      for (const model of candidateModels) {
        try {
          const config: any = {};
          if (systemInstruction) config.systemInstruction = systemInstruction;
          if (responseMimeType) config.responseMimeType = responseMimeType;
          if (responseSchema) config.responseSchema = responseSchema;

          const response = await ai.models.generateContent({
            model,
            contents,
            config: Object.keys(config).length > 0 ? config : undefined,
          });

          if (response && response.text) {
            reply = response.text;
            break;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`[Server Gemini] model ${model} error, attempting fallback:`, err?.message || err);
          await new Promise(r => setTimeout(r, 300));
        }
      }

      if (!reply) {
        throw lastErr || new Error('All Gemini models encountered high demand');
      }

      return res.json({ text: reply });
    } catch (err: any) {
      console.error('[Server Gemini Error]:', err);
      return res.status(500).json({ error: err?.message || 'AI request failed' });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        port: PORT,
        host: '0.0.0.0'
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudySnap server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
