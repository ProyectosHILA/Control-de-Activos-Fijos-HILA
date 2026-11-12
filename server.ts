import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const TEMPLATE_FILE = path.resolve(DATA_DIR, 'template.json');

// Initialize Gemini client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Ensure persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Support large payload for thousands of assets and base64 template
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to read data from server disk
function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        documentos: Array.isArray(parsed.documentos) ? parsed.documentos : [],
        activos: Array.isArray(parsed.activos) ? parsed.activos : [],
      };
    }
  } catch (e) {
    console.error('Error reading db.json:', e);
  }
  return { documentos: [], activos: [] };
}

// Helper to save data to server disk
function writeDatabase(data: { documentos: any[]; activos: any[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing db.json:', e);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'HILA Activos Backend',
    timestamp: new Date().toISOString(),
  });
});

// Get all persisted assets and documents
app.get('/api/data', (req, res) => {
  const data = readDatabase();
  res.json(data);
});

// Save or sync assets and documents to disk
app.post('/api/data', (req, res) => {
  const { documentos, activos } = req.body;
  const current = readDatabase();

  const toSave = {
    documentos: Array.isArray(documentos) ? documentos : current.documentos,
    activos: Array.isArray(activos) ? activos : current.activos,
  };

  writeDatabase(toSave);
  res.json({
    success: true,
    countDocs: toSave.documentos.length,
    countActivos: toSave.activos.length,
  });
});

// Delete document and all its associated assets
app.delete('/api/documentos/:id', (req, res) => {
  const docId = req.params.id;
  const current = readDatabase();

  const updatedDocs = current.documentos.filter((d: any) => d.id !== docId);
  const updatedActivos = current.activos.filter(
    (a: any) => (a.documentId || 'doc_base') !== docId
  );

  writeDatabase({ documentos: updatedDocs, activos: updatedActivos });
  res.json({ success: true, deletedDocId: docId, remainingActivos: updatedActivos.length });
});

// Get custom Excel template if saved
app.get('/api/template', (req, res) => {
  try {
    if (fs.existsSync(TEMPLATE_FILE)) {
      const content = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return res.json({ hasTemplate: true, ...parsed });
    }
  } catch (e) {
    console.error('Error reading template.json:', e);
  }
  res.json({ hasTemplate: false });
});

// Save custom Excel template
app.post('/api/template', (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ error: 'Falta el contenido del archivo plantilla.' });
    }
    const data = {
      filename: filename || 'Plantilla_HILA.xlsx',
      base64,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ success: true, message: 'Plantilla guardada correctamente en el servidor' });
  } catch (e: any) {
    console.error('Error saving template:', e);
    res.status(500).json({ error: e.message || 'Error al guardar la plantilla' });
  }
});

// Delete custom Excel template
app.delete('/api/template', (req, res) => {
  try {
    if (fs.existsSync(TEMPLATE_FILE)) {
      fs.unlinkSync(TEMPLATE_FILE);
    }
    res.json({ success: true, message: 'Plantilla eliminada. Se usará la plantilla predeterminada.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Scan barcode / numbers using Gemini Multimodal AI
app.post('/api/scan-barcode-ai', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta la imagen' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Eres un lector óptico y OCR de alta precisión para el Hospital Infantil Los Ángeles (HILA).
Tu objetivo es identificar el código de barras o la etiqueta del activo hospitalario que se muestra en la imagen.
En particular:
1. Lee los números o código que están impresos justo DEBAJO o AL LADO de las líneas del código de barras (ejemplo: "000321", "011753", "HILA-000301", "1532", "011753", "000301").
2. Si hay una placa metálica o sticker de inventario con texto "ACTIVO", "CÓDIGO", "PLACA", extrae ese número o código.
3. Si hay varios textos, prioriza el número que corresponda al código de activo o placa.

Devuelve ÚNICAMENTE un JSON con:
{
  "code": "número o código extraído (solo el valor limpio, sin comillas ni espacios)",
  "label": "descripción de lo detectado (ej: Código de barras con números 000321)",
  "confidence": "high" | "medium" | "low"
}
Si no ves ningún código de barras o número identificador de activo en la imagen, responde con "code": "", "confidence": "low".`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    let parsed: any = { code: '', label: '', confidence: 'low' };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\b\d{4,10}\b/);
      if (match) {
        parsed = { code: match[0], label: 'Código numérico detectado', confidence: 'medium' };
      }
    }

    // Clean any prefix quotes
    if (parsed.code) {
      parsed.code = String(parsed.code).replace(/^['"\s]+/, '').replace(/['"\s]+$/, '');
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/scan-barcode-ai:', error);
    return res.status(500).json({
      error: error.message || 'Error al procesar la imagen con IA',
    });
  }
});

// Main startup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HILA] Server activo en http://0.0.0.0:${PORT} con Gemini AI Scanner y almacenamiento persistente`);
  });
}

startServer();

