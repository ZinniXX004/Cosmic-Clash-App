import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface BattleAnalysis {
  strength: string;
  speed: string;
  durability: string;
  intelligence: string;
  abilities: string;
  conclusion: string;
}

export interface FighterStats {
  strength: number;
  speed: number;
  durability: number;
  intelligence: number;
  energyProjection: number;
  fightingSkills: number;
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface BattleResult {
  winner: string;
  loser: string;
  verdictSummary: string;
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  confidenceJustification: string;
  analysis: BattleAnalysis;
  nlfConsiderations?: string;
  fighter1: {
    name: string;
    stats: FighterStats;
    imageSearchQuery: string;
  };
  fighter2: {
    name: string;
    stats: FighterStats;
    imageSearchQuery: string;
  };
  sources?: GroundingChunk[];
}

export interface CharacterProfile {
  name: string;
  summary: string;
  archetypes: string[];
  abilities: {
    name: string;
    description: string;
  }[];
  imageSearchQuery: string;
  sources?: GroundingChunk[];
}

export interface CharacterLore {
  name: string;
  lore: string;
  sources?: GroundingChunk[];
}

export interface TierNegatingAbility {
  category: 'Power Nullification' | 'Resistance Negation' | 'Causality and Reality Negation';
  type: string;
  description: string;
}

export interface CharacterTierInfo {
  tier: string; // e.g., "High 6-A"
  tierName: string; // e.g., "Multi-Continent Level"
  tierValue: number; // A numerical representation for comparison.
  justification: string;
  tierNegatingAbilities: TierNegatingAbility[];
  sources?: GroundingChunk[];
}

// Interfaces for the new Lore Connections feature
export interface SharedCharacter {
  name: string;
  relationship: string; // e.g., "Fellow Avenger", "Arch-nemesis"
}

export interface KeyEvent {
  event: string; // e.g., "The Infinity Gauntlet Saga"
  description: string;
}

export interface LoreConnection {
  connectionExists: boolean;
  summary: string;
  sharedUniverse?: string;
  sharedAllies?: SharedCharacter[];
  sharedEnemies?: SharedCharacter[];
  keyEvents?: KeyEvent[];
  sources?: GroundingChunk[];
}


export enum BattlePath {
  MORTAL_PLANETARY = 'Mortal & Planetary (Tiers 11-6)',
  COSMIC_GALACTIC = 'Cosmic & Galactic (Tiers 5-3)',
  UNIVERSAL_MULTIVERSAL = 'Universal & Multiversal (Tiers 2-1)',
  BOUNDLESS = 'Boundless (Tier 0)',
  CROSS_TIER_HAX = 'Cross-Tier Hax Battle',
  MISMATCH = 'Mismatch',
  PENDING = 'Pending Analysis'
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = (process.env as any).API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private parseJsonFromText(text: string): any {
    if (!text) {
      console.error("AI response text is empty or undefined. This might be due to a blocked response for safety reasons.");
      throw new Error("The AI returned an empty response. This could be due to safety filters or a content generation issue. Please try a different query.");
    }

    // AI can sometimes return conversational text before or after the JSON.
    // First, try to extract from markdown code fences.
    const markdownMatch = text.match(/```(json)?([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[2]) {
      const jsonText = markdownMatch[2].trim();
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.warn("Failed to parse JSON from markdown, trying to find raw JSON object.");
      }
    }

    // If markdown fails or isn't present, find the first '{' and last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonText = text.substring(startIndex, endIndex + 1).trim();
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        // If this fails, we'll fall through to the final error.
        console.error("Failed to parse extracted JSON object:", e);
      }
    }
    
    // If all parsing attempts fail.
    console.error("Failed to parse JSON from AI response. None of the extraction methods worked.");
    console.error("Raw AI response text:", text);
    throw new Error("The AI returned an invalid response format that could not be parsed.");
  }

  private handleError(error: unknown, context: string): never {
    console.error(`Error during ${context}:`, error);
    const originalError = error as Error;
    const originalMessage = originalError?.message || 'An unknown error occurred.';

    // NEW: Check for AbortError specifically to handle timeouts
    if (originalError?.name === 'AbortError' || originalMessage.includes('The operation was aborted')) {
        throw new Error(`The request to the AI timed out. This can happen with complex matchups or network issues. Please try again.`);
    }
    
    if (originalMessage.includes('429') || originalMessage.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('The simulator is experiencing high traffic. Please try again after a short wait.');
    }
    if (originalMessage.includes('API key not valid')) {
      throw new Error('The provided API Key is invalid. Please check your configuration.');
    }
    if (originalMessage.toLowerCase().includes('failed to fetch')) {
        throw new Error('A network error occurred. Please check your internet connection and try again.');
    }
    if (originalMessage.includes('SAFETY')) {
        throw new Error(`The prompt was blocked due to safety settings.`);
    }
    if (originalMessage.includes('invalid response format')) {
        throw new Error("The AI's analysis was malformed. This can be a temporary issue. Please try again.");
    }

    throw new Error(`An unexpected error occurred while ${context}. Please try again.`);
  }

  async getRandomMatchup(): Promise<{ fighter1: string; fighter2: string }> {
    const prompt = `
      Suggest an interesting hypothetical matchup between two distinct fictional characters.
      You can pull from popular mainstream media (comics, anime, movies) or from more niche and obscure sources like indie games (e.g., the Black Souls series), visual novels, or webcomics. The matchup should be compelling.
      Examples: "Goku vs Superman", "Grimm (Black Souls) vs The Knight (Hollow Knight)", "Darth Vader vs Doctor Doom".
      The output must be a clean JSON object following the provided schema, with no markdown formatting.
    `;

    const matchupSchema = {
      type: Type.OBJECT,
      properties: {
        fighter1: { type: Type.STRING, description: 'The name of the first character.' },
        fighter2: { type: Type.STRING, description: 'The name of the second character.' },
      },
      required: ["fighter1", "fighter2"]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: matchupSchema,
          temperature: 1,
        },
      });
      const resultText = response.text?.trim();
      if (!resultText) {
        throw new Error("The AI returned an empty response for random matchup. Please try again.");
      }
      return JSON.parse(resultText) as { fighter1: string; fighter2: string };
    } catch (error) {
      this.handleError(error, 'generating a random matchup');
    }
  }

  async getCharacterTier(characterName: string): Promise<CharacterTierInfo> {
    const prompt = `
      Using Google Search to find the most up-to-date information, analyze the character "${characterName}" based on the VS Battles Wiki / Powerscaling Wiki Tiering System.
      Your knowledge base should include a wide array of fictional universes, from mainstream comics and anime to lesser-known media such as the "Black Souls" game series by Toro, visual novels, and light novels.
      Provide their tier, tier name, a numerical tier value, and a brief justification.

      Instead of a simple boolean for tier-negating abilities, identify and categorize any "hax" abilities they possess into a structured array called "tierNegatingAbilities". An ability qualifies if it can bypass conventional durability and power, allowing them to fight beings in much higher tiers. If no such abilities exist, return an empty array.

      The categories for "hax" are:
      1.  **Power Nullification**: The ability to disable or suppress powers (e.g., Targeted Negation, Field Negation, Total Negation).
      2.  **Resistance Negation**: Removes an opponent's immunity to effects (e.g., Bypassing Immunity, Ignoring Durability).
      3.  **Causality and Reality Negation**: Affects the fundamental nature of existence (e.g., Causality Manipulation, Reality Alteration Negation).
      
      For each identified ability, provide its category from the three main options, a specific type (like the examples provided), and a brief description of how the character uses it.

      The numerical tier value should be structured as 'T.S' where T is the main tier number (0-11) and S represents the sub-tier (e.g., A=1, B=2, C=3). For example:
      - "High 6-A" should be 6.1
      - "2-B" should be 2.2
      - "Low 7-C" should be 7.3
      - A character in "Tier 1" should be 1.0.

      **CRITICAL INSTRUCTION**: Respond with ONLY the raw, parsable JSON object. Omit all conversational text and markdown. Ensure the 'tierNegatingAbilities' field is an array (which can be empty). The JSON must conform to this structure:
      { "tier": "string", "tierName": "string", "tierValue": number, "justification": "string", "tierNegatingAbilities": [{ "category": "string", "type": "string", "description": "string" }] }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          temperature: 0.2,
        },
      });
      const tierInfo = this.parseJsonFromText(response.text) as Omit<CharacterTierInfo, 'sources'>;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

      return { ...tierInfo, sources };
    } catch (error) {
      this.handleError(error, `fetching tier for ${characterName}`);
    }
  }

  async getBattleResult(fighter1: string, fighter2: string, battlePath: BattlePath): Promise<BattleResult> {
    let pathContext = '';
    switch (battlePath) {
        case BattlePath.BOUNDLESS:
            pathContext = 'This is a special battle between two "Boundless" (Tier 0) beings. The outcome is highly subjective and UNLIKELY TO HAPPEN. Your analysis should reflect this subjectivity and focus on the philosophical or conceptual nature of their powers.';
            break;
        case BattlePath.UNIVERSAL_MULTIVERSAL:
            pathContext = 'This battle takes place at a Universal to Multiversal scale (Tiers 2-1). Account for abilities that can destroy or create universes and manipulate reality.';
            break;
        case BattlePath.COSMIC_GALACTIC:
            pathContext = 'This battle takes place at a Cosmic or Galactic scale (Tiers 5-3). Focus on abilities that affect solar systems, galaxies, and cosmic energies.';
            break;
        case BattlePath.MORTAL_PLANETARY:
            pathContext = `This battle takes place within the Mortal & Planetary scale (Tiers 11-6). Your analysis should focus on physical combat and tangible abilities. 
            **CRITICAL FOR LOW-TIER BATTLES**: If the characters are at the lower end of this scale (e.g., human-level, street-level like characters from GTA), DO NOT disqualify them for lacking planetary power. Instead, you MUST analyze a direct confrontation based on their known skills, weaponry, physical stats, intelligence, and tactical abilities. The verdict should be a grounded, logical analysis of who would win in a realistic fight, considering their canon equipment and capabilities.`;
            break;
        case BattlePath.CROSS_TIER_HAX:
            pathContext = 'This is a special Cross-Tier Hax battle. One or both combatants have abilities that can negate conventional power levels. The analysis must focus heavily on how these specific hax abilities interact.';
            break;
    }

    const prompt = `
      Analyze a hypothetical battle between ${fighter1} and ${fighter2}. Use Google Search for up-to-date information.
      BATTLE CONTEXT: ${pathContext}
      Your analysis must be based on established feats and powerscaling concepts. Provide a detailed, unbiased breakdown.

      **CRITICAL ANALYSIS RULE: AVOID THE "NO LIMITS FALLACY" (NLF)**
      Do not assume an ability is limitless. Base your analysis on demonstrated feats (actions) over statements (claims). If a victory relies on a poorly-defined ability (a potential NLF), you MUST address this in the "nlfConsiderations" field and penalize the 'confidenceScore' accordingly, explaining why in the 'confidenceJustification'. Acknowledge the context of the character's universe.
      
      **CRITICAL INSTRUCTION**: Your entire response MUST be ONLY the raw JSON object, immediately parsable. Do not include any text outside the JSON. All fields in the provided structure are mandatory, including all nested stats. Ensure fighter names in the JSON exactly match the inputs: "${fighter1}" and "${fighter2}".

      The required JSON structure is:
      {
        "winner": "string",
        "loser": "string",
        "verdictSummary": "string",
        "confidence": "High | Medium | Low",
        "confidenceScore": 0,
        "confidenceJustification": "A brief explanation for the confidence score. If the score was penalized due to a borderline NLF, explain that here.",
        "nlfConsiderations": "string - Analysis of any potential 'No Limits Fallacy'. Explain how it was avoided by focusing on feats. Leave empty if not applicable.",
        "analysis": {
          "strength": "string",
          "speed": "string",
          "durability": "string",
          "intelligence": "string",
          "abilities": "string",
          "conclusion": "string"
        },
        "fighter1": {
          "name": "${fighter1}",
          "stats": { "strength": 0, "speed": 0, "durability": 0, "intelligence": 0, "energyProjection": 0, "fightingSkills": 0 },
          "imageSearchQuery": "string"
        },
        "fighter2": {
          "name": "${fighter2}",
          "stats": { "strength": 0, "speed": 0, "durability": 0, "intelligence": 0, "energyProjection": 0, "fightingSkills": 0 },
          "imageSearchQuery": "string"
        }
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          temperature: 0.5,
        },
      });

      const battleResult = this.parseJsonFromText(response.text) as Omit<BattleResult, 'sources'>;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      return { ...battleResult, sources };

    } catch (error) {
      this.handleError(error, `analyzing the battle between ${fighter1} and ${fighter2}`);
    }
  }

  async getCharacterProfile(characterName: string): Promise<CharacterProfile> {
    const prompt = `
      Using Google Search to find the most up-to-date information, generate a concise character profile for "${characterName}".
      Draw upon all available lore for the character, including information from niche or obscure media if applicable (e.g., the "Black Souls" series, specific webcomics, light novels, etc.).
      
      **CRITICAL INSTRUCTION**: Respond with ONLY the raw, parsable JSON object. Omit all conversational text and markdown. Ensure the character name in the response exactly matches "${characterName}" and that all fields are present.
      
      The JSON object must contain:
      1. A "summary" field: A one-paragraph summary of their lore, origin, and general power level.
      2. An "archetypes" field: An array of 1-3 strings identifying common character archetypes they fit (e.g., 'The Hero', 'The Anti-Hero', 'The Mentor', 'The Trickster').
      3. An "abilities" field: An array of objects, listing their 3 to 5 most significant or iconic abilities, each with a brief one-sentence description.
      4. An "imageSearchQuery" field: A highly specific and effective query for a high-quality portrait or iconic artwork. This query should include their full name, their series/universe (e.g., 'DC Comics', 'Black Souls'), and a style descriptor like 'digital art' or 'portrait'. Example: "Wonder Woman DC Comics portrait digital art".
    `;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
            temperature: 0.3,
        },
      });

      const profile = this.parseJsonFromText(response.text) as Omit<CharacterProfile, 'sources'>;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;

      return { ...profile, sources };

    } catch (error) {
      this.handleError(error, `fetching profile for ${characterName}`);
    }
  }

  async getLoreConnections(fighter1: string, fighter2: string): Promise<LoreConnection> {
    const prompt = `
      Your task is to analyze the lore connection between "${fighter1}" and "${fighter2}". You MUST use Google Search to find the most up-to-date and accurate information from fan wikis, official sources, and comics.

      First, determine if a direct canonical connection exists (e.g., they are from the same universe, they have met in a crossover).
      - If a connection exists, provide a detailed summary, their shared universe, and lists of any shared allies, enemies, and key events they were both involved in.
      - If no connection exists (e.g., from different franchises with no official crossover), the 'connectionExists' flag must be false, and the summary must clearly state this. In this case, the 'sharedUniverse', 'sharedAllies', 'sharedEnemies', and 'keyEvents' fields should be empty arrays or null.

      **CRITICAL INSTRUCTION**: Respond with ONLY the raw, parsable JSON object. Omit all conversational text and markdown. Adhere strictly to the specified JSON structure.
      {
        "connectionExists": "boolean - True if a canonical connection exists, otherwise false.",
        "summary": "string - A detailed summary of their relationship or lack thereof, based on search results.",
        "sharedUniverse": "string | null - The name of the universe they share, or null if they do not.",
        "sharedAllies": [{ "name": "string - Name of the shared ally.", "relationship": "string - How they are allied to both characters." }],
        "sharedEnemies": [{ "name": "string - Name of the shared enemy.", "relationship": "string - The nature of their antagonism to both characters." }],
        "keyEvents": [{ "event": "string - The name of the key event or story arc.", "description": "string - A brief description of the event and their involvement." }]
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
          temperature: 0.3,
        },
      });

      const lore = this.parseJsonFromText(response.text) as Omit<LoreConnection, 'sources'>;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      return { ...lore, sources };
    } catch (error) {
      this.handleError(error, `fetching lore connections for ${fighter1} and ${fighter2}`);
    }
  }

  async getCharacterLore(characterName: string): Promise<CharacterLore> {
    const prompt = `
      Using Google Search for comprehensive and up-to-date information, generate a concise but detailed lore summary for the character "${characterName}".
      The summary should cover their origin story, key motivations, and their role within their universe.
      Draw upon all available information, including comics, games, movies, and other relevant media. Ensure the lore is presented as a coherent narrative with paragraphs.

      **CRITICAL INSTRUCTION**: Respond with ONLY the raw, parsable JSON object conforming to the required structure, with no extra text or markdown.
      {
        "lore": "A multi-paragraph summary of the character's lore."
      }
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{googleSearch: {}}],
            temperature: 0.4,
        },
      });

      const loreData = this.parseJsonFromText(response.text) as { lore: string };
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      
      return { lore: loreData.lore, name: characterName, sources };
    } catch (error) {
      this.handleError(error, `fetching lore for ${characterName}`);
    }
  }

  async generateImage(prompt: string, aspectRatio: string, style?: string, mood?: string): Promise<string> {
    try {
      let finalPrompt = prompt;
      if (style && style !== 'default') {
        finalPrompt += `, in the style of ${style}`;
      }
      if (mood && mood !== 'default') {
        finalPrompt += `, evoking a ${mood} mood`;
      }
      finalPrompt += `, high quality, detailed.`

      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });
  
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
      this.handleError(error, 'generating an image');
    }
  }

  async editImage(originalQuery: string, editPrompt: string, aspectRatio: string, style?: string, mood?: string): Promise<string> {
    const newPrompt = `
      This is an image editing request.
      Start with the concept of: "${originalQuery}".
      Now apply this modification: "${editPrompt}".
      The resulting image should be high-quality.
      Apply the following style: "${style && style !== 'default' ? style : 'digital art, comic art'}".
      Evoke the following mood: "${mood && mood !== 'default' ? mood : 'dynamic'}".
      Generate a new image based on this combined description.
    `;

    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: newPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });
  
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
      this.handleError(error, 'editing an image');
    }
  }
}