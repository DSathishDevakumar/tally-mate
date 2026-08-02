import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../config/env";

const client = new GoogleGenAI({ apiKey: env.geminiApiKey });

export interface VoiceExtraction {
  transcript: string;
  customerName: string | null;
  customerNameNative: string | null;
  amount: number | null;
  note: string | null;
  confidence: number;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description: "Verbatim transcript of the spoken audio.",
    },
    customerName: {
      type: Type.STRING,
      nullable: true,
      description:
        "The customer's name as spoken, transliterated into English/Latin letters if it was spoken in " +
        "another script (phonetic transliteration, not translation), or null if none was mentioned.",
    },
    customerNameNative: {
      type: Type.STRING,
      nullable: true,
      description:
        "The customer's name exactly as spoken/written in its original script, only if that script isn't " +
        "already Latin (e.g. Tamil, Hindi). Null if the name was already in English/Latin or none was mentioned.",
    },
    amount: {
      type: Type.NUMBER,
      nullable: true,
      description: "The credit amount in rupees, or null if none was mentioned.",
    },
    note: {
      type: Type.STRING,
      nullable: true,
      description: "Short free-text summary of items purchased, or null if none was mentioned.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Overall confidence (0.0-1.0) that customerName and amount were extracted correctly.",
    },
  },
  required: ["transcript", "confidence"],
};

const PROMPT = `You are helping digitize a small Indian grocery (kirana) shop's spoken credit-notebook entries.
The shopkeeper recorded a short voice note, usually in a mix of Hindi, Tamil, and English, naming a customer, an
amount of money owed (in rupees), and optionally what they bought. Transcribe the audio, then extract:
- customerName: the customer's name as spoken. If it was spoken in a non-Latin script language (e.g. Tamil,
  Hindi), phonetically transliterate it into English/Latin letters (transliterate the sound, do not translate
  the meaning). If it was already spoken in English, use it as-is. Null if unclear/not mentioned.
- customerNameNative: the customer's name written in its own original script (e.g. Tamil, Devanagari), only if
  that script isn't already Latin. Null if the name was already in English or not mentioned.
- amount: the rupee amount as a plain number (or null if unclear/not mentioned)
- note: a short free-text summary of items purchased, e.g. "rice, oil, soap" (or null if not mentioned)
- confidence: your overall confidence (0.0-1.0) in the customerName and amount extraction

Respond with strict JSON matching the schema. Do not invent a customer name or amount that wasn't said.`;

export async function extractVoiceEntry(audio: Buffer, mimeType: string): Promise<VoiceExtraction> {
  const response = await client.models.generateContent({
    model: env.geminiModel,
    contents: [
      {
        role: "user",
        parts: [{ text: PROMPT }, { inlineData: { data: audio.toString("base64"), mimeType } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a response that wasn't valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || !("transcript" in parsed) || !("confidence" in parsed)) {
    throw new Error("Gemini response was missing required fields");
  }

  const p = parsed as Record<string, unknown>;
  return {
    transcript: typeof p.transcript === "string" ? p.transcript : "",
    customerName: typeof p.customerName === "string" && p.customerName.trim() ? p.customerName.trim() : null,
    customerNameNative:
      typeof p.customerNameNative === "string" && p.customerNameNative.trim() ? p.customerNameNative.trim() : null,
    amount: typeof p.amount === "number" && Number.isFinite(p.amount) ? p.amount : null,
    note: typeof p.note === "string" && p.note.trim() ? p.note.trim() : null,
    confidence: typeof p.confidence === "number" ? Math.max(0, Math.min(1, p.confidence)) : 0,
  };
}

export interface PhotoExtractionRow {
  customerName: string | null;
  customerNameNative: string | null;
  amount: number | null;
  note: string | null;
  confidence: number;
}

const photoResponseSchema = {
  type: Type.OBJECT,
  properties: {
    rows: {
      type: Type.ARRAY,
      description: "One row per distinct customer credit entry found on the notebook page.",
      items: {
        type: Type.OBJECT,
        properties: {
          customerName: {
            type: Type.STRING,
            nullable: true,
            description:
              "The customer's name as handwritten, transliterated into English/Latin letters if it was " +
              "written in another script (phonetic transliteration, not translation), or null if illegible/not present.",
          },
          customerNameNative: {
            type: Type.STRING,
            nullable: true,
            description:
              "The customer's name exactly as handwritten in its original script, only if that script isn't " +
              "already Latin (e.g. Tamil, Hindi). Null if the name was already in English or illegible/not present.",
          },
          amount: {
            type: Type.NUMBER,
            nullable: true,
            description: "The rupee amount for this row, or null if illegible/not present.",
          },
          note: {
            type: Type.STRING,
            nullable: true,
            description: "Short free-text summary of items listed for this row, or null if none.",
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confidence (0.0-1.0) that customerName and amount were read correctly for this row.",
          },
        },
        required: ["confidence"],
      },
    },
  },
  required: ["rows"],
};

const PHOTO_PROMPT = `You are helping digitize a small Indian grocery (kirana) shop's handwritten credit notebook.
The photo shows one page of the notebook, which may be written in English, Tamil, Hindi, or a mix. Each line
or row generally records one customer's purchase on credit: a customer name and a rupee amount, sometimes
with a short list of items. Extract every such row you can find on the page:
- customerName: the customer's name as handwritten. If it was written in a non-Latin script (e.g. Tamil,
  Hindi), phonetically transliterate it into English/Latin letters (transliterate the sound, do not translate
  the meaning). If it was already written in English, use it as-is. Null if illegible or not present on that row.
- customerNameNative: the customer's name exactly as handwritten in its own original script, only if that
  script isn't already Latin. Null if the name was already in English or illegible/not present on that row.
- amount: the rupee amount as a plain number (or null if illegible or not present on that row)
- note: a short free-text summary of items listed, e.g. "rice, oil, soap" (or null if none written)
- confidence: your confidence (0.0-1.0) that customerName and amount were read correctly for that row

Ignore page headers, dates, running totals, and anything that isn't a specific customer's line item. Do not
invent rows, names, or amounts that aren't actually written on the page. If the page is blank or unreadable,
return an empty rows array. Respond with strict JSON matching the schema.`;

export async function extractPhotoEntries(image: Buffer, mimeType: string): Promise<PhotoExtractionRow[]> {
  const response = await client.models.generateContent({
    model: env.geminiModel,
    contents: [
      {
        role: "user",
        parts: [{ text: PHOTO_PROMPT }, { inlineData: { data: image.toString("base64"), mimeType } }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: photoResponseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a response that wasn't valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || !("rows" in parsed) || !Array.isArray((parsed as { rows: unknown }).rows)) {
    throw new Error("Gemini response was missing the rows array");
  }

  const rows = (parsed as { rows: unknown[] }).rows;
  return rows
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
    .map((r) => ({
      customerName: typeof r.customerName === "string" && r.customerName.trim() ? r.customerName.trim() : null,
      customerNameNative:
        typeof r.customerNameNative === "string" && r.customerNameNative.trim() ? r.customerNameNative.trim() : null,
      amount: typeof r.amount === "number" && Number.isFinite(r.amount) ? r.amount : null,
      note: typeof r.note === "string" && r.note.trim() ? r.note.trim() : null,
      confidence: typeof r.confidence === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0,
    }))
    .filter((r) => r.customerName !== null || r.amount !== null);
}
