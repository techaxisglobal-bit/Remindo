const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Gemini expected structured schema
const reminderSchema = {
    type: SchemaType.OBJECT,
    properties: {
        intent: {
            type: SchemaType.STRING,
            description: "Must be 'create_reminder' if this is a reminder task.",
            enum: ["create_reminder", "other"]
        },
        title: {
            type: SchemaType.STRING,
            description: "Clear and concise title of the reminder. Required."
        },
        date: {
            type: SchemaType.STRING,
            description: "YYYY-MM-DD format based on the exact local timezone. E.g. 2026-08-16. Required."
        },
        time: {
            type: SchemaType.STRING,
            description: "HH:mm format (24-hour) based on the exact local timezone. E.g. 21:00. Required."
        },
        timezone: {
            type: SchemaType.STRING,
            description: "The provided timezone, e.g. Asia/Kolkata. Required."
        },
        repeat: {
            type: SchemaType.STRING,
            description: "Repeat option if provided by user, else omit.",
            nullable: true
        },
        notes: {
            type: SchemaType.STRING,
            description: "Additional notes or context, else omit.",
            nullable: true
        },
        needsClarification: {
            type: SchemaType.BOOLEAN,
            description: "True if the user request is ambiguous or missing a specific time/date (e.g. 'remind me to call mom')."
        },
        clarificationQuestion: {
            type: SchemaType.STRING,
            description: "If needsClarification is true, a short, friendly question asking for missing details (e.g. 'When should I remind you to call Mom?'). Else omit.",
            nullable: true
        }
    },
    required: ["intent", "title", "date", "time", "timezone", "needsClarification"]
};

router.post('/', auth, async (req, res) => {
    try {
        const { message, currentDate, timezone, history } = req.body;
        const tz = timezone || 'Asia/Kolkata';
        
        console.log(`[Milli AI - Gemini] Received message: "${message}"`);
        console.log(`[Milli AI - Gemini] Timezone: ${tz}, Current Date: ${currentDate || new Date().toISOString()}`);

        if (!genAI) {
            console.error("[Milli AI Error] Missing GEMINI_API_KEY");
            return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
        }
        
        const systemInstruction = `You are Milli AI, a highly efficient reminder assistant.
The user's current date and time is precisely ${currentDate || new Date().toISOString()} in their local timezone: ${tz}.
Your job is to parse the user's message and extract reminder details accurately.

Rules:
1. For relative times like 'in 15 minutes', 'tomorrow', 'next Monday', you MUST calculate the exact date (YYYY-MM-DD) and time (HH:mm) relative to the user's current date/time and timezone provided above.
2. If the user provides a complete reminder (event, date, and time), set needsClarification=false and populate the title, date, time, and timezone fields.
3. If the user's request is ambiguous or missing a specific time/date (e.g. 'remind me to call mom'), set needsClarification=true and ask a short, friendly question in 'clarificationQuestion' (e.g. 'When should I remind you to call Mom?'). You should still try to fill out title/date/time with best guesses if possible, but needsClarification takes precedence.
4. Assume future dates. If today is Monday and they say 'Tuesday', they mean tomorrow.
5. For 'time', if they say 'morning', assume 09:00. If 'afternoon', assume 15:00. If 'evening', assume 19:00, unless they specify.
6. If they don't specify AM/PM, use common sense (e.g. 'dinner at 7' is 19:00).
7. Be friendly but concise in your message.`;

        // Map frontend history to Gemini history
        const formattedHistory = (history || []).map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }]
        }));

        console.log("[Milli AI - Gemini] Sending request to Gemini...");

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: reminderSchema,
                temperature: 0.1
            }
        });

        const chat = model.startChat({ history: formattedHistory });
        
        const result = await chat.sendMessage([{ text: message }]);
        const responseText = result.response.text();
        
        console.log("[Milli AI - Gemini] Request successful.");
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            console.error("[Milli AI Error] Invalid JSON response from Gemini:", responseText);
            return res.status(500).json({ error: "Received invalid data from AI provider." });
        }
        
        console.log(`[Milli AI - Gemini] Parsed Result:`, JSON.stringify(parsed));

        // Convert Gemini structured output into the existing format expected by the frontend
        let frontendResponse;

        if (parsed.needsClarification && parsed.clarificationQuestion) {
            frontendResponse = {
                status: "clarify",
                message: parsed.clarificationQuestion
            };
        } else {
            frontendResponse = {
                status: "success",
                message: `I've created a reminder for "${parsed.title}" on ${parsed.date} at ${parsed.time}.`,
                task: {
                    title: parsed.title,
                    date: parsed.date,
                    time: parsed.time,
                    isAllDay: false, // Default to false unless explicitly told otherwise in notes
                    description: parsed.notes || "",
                    category: "other"
                }
            };
        }
        
        res.json(frontendResponse);
    } catch (error) {
        console.error("[Milli AI Error] Failed to process AI request:", error);
        
        const errorMessage = error.message || "";
        
        // Handle Gemini-specific errors gracefully
        if (errorMessage.includes("API key not valid") || errorMessage.includes("API key is invalid")) {
            return res.status(401).json({ error: "Invalid GEMINI_API_KEY configured." });
        }
        if (errorMessage.includes("quota") || errorMessage.includes("429")) {
            return res.status(429).json({ error: "Milli AI quota is exhausted or rate limited. Please check your Gemini billing." });
        }
        if (errorMessage.includes("fetch failed") || errorMessage.includes("network")) {
            return res.status(502).json({ error: "Network failure while connecting to Gemini." });
        }

        res.status(500).json({ error: "Failed to process AI request. Please try again." });
    }
});

module.exports = router;
