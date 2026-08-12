const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const apiKey = process.env.MILLI_AI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    status: {
      type: SchemaType.STRING,
      description: "Must be 'success' if all required fields are present, or 'clarify' if something is missing or ambiguous.",
      enum: ["success", "clarify"]
    },
    message: {
      type: SchemaType.STRING,
      description: "If status is 'clarify', the question to ask the user. If 'success', a friendly confirmation message."
    },
    task: {
      type: SchemaType.OBJECT,
      description: "The parsed task details. Omit if status is 'clarify'.",
      properties: {
        title: { type: SchemaType.STRING },
        date: { type: SchemaType.STRING, description: "YYYY-MM-DD format" },
        time: { type: SchemaType.STRING, description: "HH:mm format (24-hour)" },
        isAllDay: { type: SchemaType.BOOLEAN }
      },
      required: ["title", "date", "time", "isAllDay"]
    }
  },
  required: ["status", "message"]
};

router.post('/', auth, async (req, res) => {
    try {
        const { message, currentDate, history } = req.body;
        
        if (!genAI) {
            console.warn("Milli AI is in offline mode (no API key configured). Using deterministic fallback parser.");
            
            const msgLower = message.toLowerCase().trim();
            
            if (msgLower.startsWith("remind me to") || msgLower.includes("remind me to ")) {
                const titleMatch = msgLower.split("remind me to ")[1];
                if (titleMatch && titleMatch.trim().length > 0) {
                    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                    return res.json({
                        status: "success",
                        message: "I've set a reminder for that.",
                        task: {
                            title: titleMatch.trim(),
                            date: tomorrow,
                            time: "09:00",
                            isAllDay: false
                        }
                    });
                }
            }

            return res.json({
                status: "clarify",
                message: "I'm currently in offline mode. Please say 'Remind me to' followed by your task, and I'll remind you tomorrow morning."
            });
        }
        
        const systemInstruction = `You are Milli AI, a highly efficient reminder assistant.
The user's current date and time is ${currentDate || new Date().toISOString()}.
Your job is to parse the user's message and extract reminder details.

Rules:
1. If the user provides a complete reminder (event, date, and time), return status 'success' and the 'task' object.
2. If the user's request is ambiguous or missing a specific time/date, return status 'clarify' and ask a short, friendly question in 'message'.
3. Assume future dates. If today is Monday and they say 'Tuesday', they mean tomorrow.
4. For 'time', if they say 'morning', assume 09:00. If 'afternoon', assume 15:00. If 'evening', assume 19:00, unless they specify.
5. If they don't specify AM/PM, use common sense (e.g. 'dinner at 7' is 19:00).
6. Be friendly but concise.`;

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1
            }
        });
        
        const chat = model.startChat({
            history: (history || []).map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }]
            }))
        });
        
        const result = await chat.sendMessage([{ text: message }]);
        let responseText = result.response.text();
        
        // Gemini often wraps JSON in markdown blocks (e.g. ```json ... ```)
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const parsed = JSON.parse(responseText);
        
        res.json(parsed);
    } catch (error) {
        console.error("Milli AI Error:", error);
        res.status(500).json({ error: "Failed to process AI request. Please try again." });
    }
});

module.exports = router;
