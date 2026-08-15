const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

router.post('/', auth, async (req, res) => {
    try {
        const { message, currentDate, timezone, history } = req.body;
        const tz = timezone || 'Asia/Kolkata';
        
        console.log(`[Milli AI] Received message: "${message}"`);
        console.log(`[Milli AI] Timezone: ${tz}, Current Date: ${currentDate || new Date().toISOString()}`);

        if (!openai) {
            console.error("[Milli AI Error] Missing OPENAI_API_KEY");
            return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
        }
        
        const systemInstruction = `You are Milli AI, a highly efficient reminder assistant.
The user's current date and time is precisely ${currentDate || new Date().toISOString()} in their local timezone: ${tz}.
Your job is to parse the user's message and extract reminder details accurately.

Rules:
1. For relative times like 'in 15 minutes', 'tomorrow', 'next Monday', you MUST calculate the exact date (YYYY-MM-DD) and time (HH:mm) relative to the user's current date/time and timezone provided above.
2. If the user provides a complete reminder (event, date, and time), return status 'success' and the 'task' object.
3. If the user's request is ambiguous or missing a specific time/date (e.g. 'remind me to call mom'), return status 'clarify' and ask a short, friendly question in 'message' (e.g. 'When should I remind you to call Mom?').
4. Assume future dates. If today is Monday and they say 'Tuesday', they mean tomorrow.
5. For 'time', if they say 'morning', assume 09:00. If 'afternoon', assume 15:00. If 'evening', assume 19:00, unless they specify.
6. If they don't specify AM/PM, use common sense (e.g. 'dinner at 7' is 19:00).
7. Be friendly but concise in your message.`;

        // Format history for OpenAI
        const formattedHistory = (history || []).map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
        }));

        console.log("[Milli AI] Sending request to OpenAI...");

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Use gpt-4o-mini or gpt-3.5-turbo if you prefer
            messages: [
                { role: "system", content: systemInstruction },
                ...formattedHistory,
                { role: "user", content: message }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "reminder_response",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                description: "Must be 'success' if all required fields are present, or 'clarify' if something is missing or ambiguous.",
                                enum: ["success", "clarify"]
                            },
                            message: {
                                type: "string",
                                description: "If status is 'clarify', the question to ask the user. If 'success', a friendly confirmation message."
                            },
                            task: {
                                type: ["object", "null"],
                                description: "The parsed task details. Set to null if status is 'clarify'.",
                                properties: {
                                    title: { type: "string", description: "Clear and concise title of the reminder." },
                                    date: { type: "string", description: "YYYY-MM-DD format based on the exact local timezone." },
                                    time: { type: "string", description: "HH:mm format (24-hour) based on the exact local timezone." },
                                    isAllDay: { type: "boolean" },
                                    description: { type: "string", description: "Any extra notes or details provided." },
                                    category: { type: "string", description: "Best guess category (e.g. work, personal, shopping, health, other). Default to 'other'." }
                                },
                                required: ["title", "date", "time", "isAllDay", "description", "category"],
                                additionalProperties: false
                            }
                        },
                        required: ["status", "message", "task"],
                        additionalProperties: false
                    }
                }
            },
            temperature: 0.1
        });
        
        console.log("[Milli AI] OpenAI request successful.");
        const parsed = JSON.parse(response.choices[0].message.content);
        console.log(`[Milli AI] Parsed Result:`, JSON.stringify(parsed));
        
        // Minor cleanup: if status is clarify, but task is an empty object, we can omit it in the response to match frontend expectations
        if (parsed.status === 'clarify') {
            delete parsed.task;
        }
        
        res.json(parsed);
    } catch (error) {
        console.error("[Milli AI Error] Failed to process AI request:", error);
        
        // Handle specific OpenAI errors if possible
        if (error.status === 401) {
            return res.status(401).json({ error: "Invalid OPENAI_API_KEY." });
        }
        if (error.status === 429) {
            return res.status(429).json({ error: "Rate limit exceeded on OpenAI API." });
        }

        res.status(500).json({ error: "Failed to process AI request. Please try again." });
    }
});

module.exports = router;
