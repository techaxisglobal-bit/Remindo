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
        title: { type: SchemaType.STRING, description: "Clear and concise title of the reminder." },
        date: { type: SchemaType.STRING, description: "YYYY-MM-DD format based on the exact local timezone." },
        time: { type: SchemaType.STRING, description: "HH:mm format (24-hour) based on the exact local timezone." },
        isAllDay: { type: SchemaType.BOOLEAN },
        description: { type: SchemaType.STRING, description: "Any extra notes or details provided." },
        category: { type: SchemaType.STRING, description: "Best guess category (e.g. work, personal, shopping, health, other). Default to 'other'." }
      },
      required: ["title", "date", "time", "isAllDay"]
    }
  },
  required: ["status", "message"]
};

router.post('/', auth, async (req, res) => {
    try {
        const { message, currentDate, timezone, history } = req.body;
        const tz = timezone || 'Asia/Kolkata';
        
        if (!genAI) {
            console.warn("Milli AI is in offline mode (no API key configured). Using deterministic fallback parser.");
            
            let msgLower = message.toLowerCase().trim();
            
            // Remove common prefixes
            const prefixes = ["remind me to ", "remind me about ", "remind me ", "set a reminder for ", "set reminder for ", "set a reminder to ", "set reminder to "];
            let taskText = msgLower;
            for (const prefix of prefixes) {
                if (msgLower.startsWith(prefix)) {
                    taskText = msgLower.substring(prefix.length).trim();
                    break;
                }
            }

            if (!taskText || taskText === 'remind' || taskText === 'reminder') {
                return res.json({
                    status: "clarify",
                    message: "What would you like me to remind you about?"
                });
            }

            // Basic Date/Time parsing
            let date = new Date(currentDate || Date.now());
            let timeStr = "09:00"; // default morning
            let dateStr = "";
            let timeFound = false;

            if (taskText.includes("tomorrow")) {
                date.setDate(date.getDate() + 1);
                taskText = taskText.replace("tomorrow", "").trim();
            } else if (taskText.includes("today")) {
                // leave date as today
                taskText = taskText.replace("today", "").trim();
            } else if (taskText.includes("next week")) {
                date.setDate(date.getDate() + 7);
                taskText = taskText.replace("next week", "").trim();
            } else {
                // default to tomorrow if no date specified
                date.setDate(date.getDate() + 1);
            }

            // Look for time like "at 9", "at 9pm", "at 9:30 pm"
            const timeRegex = /at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/;
            const timeMatch = taskText.match(timeRegex);
            if (timeMatch) {
                let hour = parseInt(timeMatch[1]);
                let min = timeMatch[2] || "00";
                let ampm = timeMatch[3];
                
                if (ampm === 'pm' && hour < 12) hour += 12;
                if (ampm === 'am' && hour === 12) hour = 0;
                // Basic assumption if no am/pm
                if (!ampm && hour < 7) hour += 12; // 1 -> 1pm

                timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                taskText = taskText.replace(timeRegex, "").trim();
                timeFound = true;
            } else if (taskText.includes("in ") && taskText.includes("minutes")) {
                const minMatch = taskText.match(/in (\d+)\s+minutes/);
                if (minMatch) {
                    const minsToAdd = parseInt(minMatch[1]);
                    date.setMinutes(date.getMinutes() + minsToAdd);
                    timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    taskText = taskText.replace(minMatch[0], "").trim();
                    timeFound = true;
                }
            } else if (taskText.includes("morning")) {
                timeStr = "09:00";
                taskText = taskText.replace("morning", "").trim();
            } else if (taskText.includes("afternoon")) {
                timeStr = "15:00";
                taskText = taskText.replace("afternoon", "").trim();
            } else if (taskText.includes("evening") || taskText.includes("night")) {
                timeStr = "20:00";
                taskText = taskText.replace(/evening|night/, "").trim();
            }

            // Clean up connecting words
            taskText = taskText.replace(/^(on|at|about|that|for)\s+/, "").trim();
            // Remove trailing words
            taskText = taskText.replace(/\s+(on|at)$/, "").trim();
            
            if (taskText === "") {
                return res.json({
                    status: "clarify",
                    message: "What was the reminder for?"
                });
            }

            // Capitalize first letter
            taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);
            
            // Format YYYY-MM-DD
            dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

            return res.json({
                status: "success",
                message: timeFound ? `I've set a reminder for ${taskText}.` : `I scheduled "${taskText}" for tomorrow morning. (Offline mode)`,
                task: {
                    title: taskText,
                    date: dateStr,
                    time: timeStr,
                    isAllDay: false,
                    description: "Created via offline parser",
                    category: "other"
                }
            });
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
