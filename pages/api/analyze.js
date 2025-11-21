import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Identify this food and estimate calories, protein (g), carbs (g), fat (g). Respond ONLY in JSON with keys food_name, calories, protein, carbs, fat, confidence (0 to 1)."
            },
            {
              type: "input_image",
              image_base64: imageBase64
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const data = response.output[0].content[0].json;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Analyze API error: ", error);
    return res.status(500).json({ error: error.message });
  }
}
