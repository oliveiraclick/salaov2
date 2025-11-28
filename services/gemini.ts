import { GoogleGenAI } from "@google/genai";

export const generateDescription = async (name: string, type: 'service' | 'product' | 'employee', extraInfo?: string): Promise<string> => {
  try {
    // Initialize inside the function to avoid "Uncaught ReferenceError: process is not defined" 
    // during module loading if the environment isn't fully polyfilled yet.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let prompt = "";
    
    if (type === 'employee') {
      prompt = `Escreva uma biografia profissional curta e amigável (máximo 25 palavras) para um funcionário de salão de beleza chamado "${name}" cujo cargo/especialidade é "${extraInfo || 'Profissional de Beleza'}". Em Português do Brasil.`;
    } else {
      prompt = `Escreva uma descrição curta, atraente e comercial (máximo de 20 palavras) para um ${type === 'service' ? 'serviço de salão de beleza' : 'produto de beleza'} chamado "${name}". Em Português do Brasil.`;
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Descrição indisponível no momento.";
  }
};