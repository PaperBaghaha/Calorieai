// api/analyze.js
// Vercel / Netlify serverless function style (Node 18+)
import formidable from 'formidable';
import fs from 'fs/promises';
import fetch from 'node-fetch'; // or global fetch in newer runtimes

// helpers to parse form-data (image file)
export const config = {
  api: {
    bodyParser: false,
  }
};

async function parseForm(req) {
  const form = new formidable.IncomingForm();
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { files } = await parseForm(req);

    const image = files.image;
    if (!image) return res.status(400).json({ error: 'No image uploaded' });

    // read file buffer
    const buffer = await fs.readFile(image.filepath);
    const base64 = buffer.toString('base64');

    // 1) Send image to OpenAI Responses (vision) — prompt the model to identify food
    // NOTE: This code uses the OpenAI Responses API shape. If your OpenAI SDK differs, adapt accordingly.
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) return res.status(500).json({ error: 'Missing OpenAI key in env' });

    // Using the Responses API: we send a textual prompt + base64 image as content
    const visionPrompt = `You are a nutrition assistant. Identify the primary food or dish in the provided image and give a short label (one or two words), a confidence percentage (0-100), and a single-line description of portion size (e.g., "1 medium bowl", "200 g", "1 slice"). Reply in JSON with keys: food_name, confidence, portion_desc.`;

    const openaiResp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-vision', // if unavailable, replace with your vision-capable model
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: visionPrompt },
              // attach image as base64 data URL
              { type: 'input_image', image_base64: base64 }
            ]
          }
        ]
      })
    });

    if (!openaiResp.ok) {
      const t = await openaiResp.text();
      console.error('OpenAI error', t);
      return res.status(500).json({ error: 'OpenAI vision error', details: t });
    }

    const openaiJson = await openaiResp.json();
    // openai response structure can vary — try to extract plain_text from output
    // We attempt multiple fallbacks.
    let visionText = '';
    try {
      const outputs = openaiJson.output || openaiJson.outputs || openaiJson?.choices;
      // Try common places:
      if (openaiJson.output && Array.isArray(openaiJson.output) && openaiJson.output[0].content) {
        // new Responses shape
        const content = openaiJson.output[0].content;
        visionText = content.map(c => c.text || c).join(' ');
      } else if (openaiJson.choices && openaiJson.choices[0].message?.content) {
        visionText = openaiJson.choices[0].message.content;
      } else {
        visionText = JSON.stringify(openaiJson);
      }
    } catch (e) {
      visionText = JSON.stringify(openaiJson);
    }

    // Attempt to parse JSON from visionText
    let parsed = {};
    try {
      // If model returned JSON in code block, strip fences
      const jsonStr = (visionText.match(/\{[\s\S]*\}/) || [visionText])[0];
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // fallback: do a loose parse by extracting the first line as label
      parsed.food_name = (visionText.split('\n').find(Boolean) || '').trim().slice(0, 80) || 'Unknown';
      parsed.confidence = 60;
      parsed.portion_desc = 'medium';
    }

    const foodLabel = parsed.food_name || parsed.food || 'Unknown';
    const confidence = parsed.confidence ?? 60;
    const portionDesc = parsed.portion_desc || '1 serving';

    // 2) Lookup nutrition using Nutritionix (you need Nutritionix credentials)
    // Nutritionix - search item by natural language and get nutrient values
    const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID;
    const NUTRITIONIX_APP_KEY = process.env.NUTRITIONIX_APP_KEY;

    let nutrition = null;
    if (NUTRITIONIX_APP_ID && NUTRITIONIX_APP_KEY) {
      // Use Nutritionix natural language recipe endpoint
      const body = {
        query: `${portionDesc} ${foodLabel}`,
        timezone: 'UTC'
      };

      const nxRes = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
        method: 'POST',
        headers: {
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_APP_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (nxRes.ok) {
        const nxJson = await nxRes.json();
        // Nutritionix returns foods array; we'll take first item
        const first = nxJson.foods?.[0] || null;
        if (first) {
          nutrition = {
            calories: first.nf_calories ?? null,
            protein: first.nf_protein ?? null,
            carbs: first.nf_total_carbohydrate ?? null,
            fat: first.nf_total_fat ?? null,
            serving_qty: first.serving_qty,
            serving_unit: first.serving_unit
          };
        }
      } else {
        console.warn('Nutritionix lookup failed', await nxRes.text());
      }
    } else {
      // no nutritionix keys — return placeholder heuristics (rough estimates)
      nutrition = {
        calories: 400,
        protein: 20,
        carbs: 45,
        fat: 15
      };
    }

    const responsePayload = {
      food_name: foodLabel,
      confidence,
      calories: nutrition?.calories ?? null,
      protein: nutrition?.protein ?? null,
      carbs: nutrition?.carbs ?? null,
      fat: nutrition?.fat ?? null,
      category: parsed.category || 'main_course',
      image_url: null,
      date: new Date().toISOString().slice(0, 10),
      raw_vision: visionText
    };

    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
