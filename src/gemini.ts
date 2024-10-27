import { GoogleGenerativeAI } from "@google/generative-ai";

const genAi = new GoogleGenerativeAI(process.env.API_KEY!);

const model = genAi.getGenerativeModel({
  model: "gemini-1.5-flash", generationConfig: {
    temperature: 0
  }
});

async function generateResponse(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const resultText = response.text();

    return resultText;
  } catch(error) {
    console.error(error);
  }
}

generateResponse('你好')