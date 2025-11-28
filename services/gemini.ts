
import { GoogleGenAI } from "@google/genai";

export const generateDescription = async (name: string, type: 'service' | 'product' | 'employee', extraInfo?: string): Promise<string> => {
  try {
    // Safely check for process.env to avoid "Uncaught ReferenceError" in browsers without polyfills
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    
    if (!apiKey) {
      console.warn("Gemini API Key is missing.");
      return "Descrição indisponível (Chave API ausente).";
    }

    const ai = new GoogleGenAI({ apiKey });

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
