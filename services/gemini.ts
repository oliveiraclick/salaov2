
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

export const getLocationContext = async (address: string) => {
  try {
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    if (!apiKey) return { text: '', links: [] };

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Forneça um contexto curto (máximo 20 palavras) sobre a localização deste endereço: "${address}". Mencione pontos de referência próximos ou estacionamento. Em Português.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '';
    const links: { title: string, uri: string }[] = [];
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
       if (chunk.web?.uri) {
           links.push({ title: chunk.web.title || 'Web', uri: chunk.web.uri });
       }
       if (chunk.maps?.uri) {
           links.push({ title: chunk.maps.title || 'Ver no Google Maps', uri: chunk.maps.uri });
       }
    });

    return { text, links };
  } catch (error) {
    console.error("Gemini Location Error:", error);
    return { text: '', links: [] };
  }
};
