import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload size limit for images
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Gemini Configuration
const SYSTEM_INSTRUCTION = `You are an SEO expert and sales specialist for tourist equipment on Avito. 
Analyze the image provided.
1) Write a selling title (title, max 50 chars).
2) Write a VERY SHORT SEO filename for the alt-tag (alt_text, strictly 3-5 key words separated by spaces, transliterated friendly, no prepositions). Example: "palatka-turisticheskaya-red-fox".
3) Write a detailed selling description (description, with emojis and a list of benefits).
4) Estimate the price in RUB (price_guess).
Return ONLY valid JSON.`;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!process.env.API_KEY) {
      return res.status(500).json({ error: 'Server API Key not configured' });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64
            }
          },
          {
            text: "Analyze this image for an Avito listing."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini");
    }

    // Parse JSON here to ensure validity before sending to client
    const jsonResponse = JSON.parse(response.text);
    res.json(jsonResponse);

  } catch (error) {
    console.error('Gemini Server Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Serve React App for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});