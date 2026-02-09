import { GoogleGenAI, Type } from "@google/genai";

export const extractInvoiceData = async (
  base64Data: string,
  mimeType: string
): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      invoice_number: { type: Type.STRING, description: "The invoice number found on the document" },
      receipt_number: { type: Type.STRING, description: "A receipt number or payment reference (e.g. TI20251264) if the document is a receipt or paid invoice. Null if not found." },
      customer: { type: Type.STRING, description: "The name of the client or customer" },
      amount_before_vat: { type: Type.NUMBER, description: "The total amount before tax/VAT. If not explicitly stated, infer from total." },
      currency_code: { type: Type.STRING, description: "The 3-letter currency code of the invoice amount (e.g., THB, USD, EUR)." },
      invoice_date: { type: Type.STRING, description: "The date of the invoice/receipt in YYYY-MM-DD format" },
      project_description: { type: Type.STRING, description: "Brief description of the service or project" }
    },
    required: ["invoice_number", "amount_before_vat"],
  };

  // Timeout promise
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout: API did not respond in 30 seconds")), 30000)
  );

  // API Call promise
  const apiCall = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: "Extract the following details: Invoice Number, Receipt Number (looks like TI2025xxx, if present), Customer Name, Amount (before tax), Currency Code, Date, and Project description. Return in JSON. If unreadable, return null.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  try {
    // Race between API call and timeout
    const response: any = await Promise.race([apiCall, timeout]);

    if (response.text) {
      try {
        return JSON.parse(response.text);
      } catch (e) {
        console.error("Failed to parse JSON response");
        return null;
      }
    }
    return null;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};