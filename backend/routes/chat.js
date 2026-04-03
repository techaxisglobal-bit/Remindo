const express = require('express');
const router = express.Router();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const lowerStr = message.toLowerCase();
    let responseText = "";

    // Local simulated smart responder based on user rules
    if (lowerStr.includes('special')) {
      responseText = "Step 1: Go to the Dashboard or Home.\nStep 2: Click the Plus icon to open the Create Reminder menu.\nStep 3: Toggle the 'Mark as Special' switch to ON.\nStep 4: Tap Create Task.";
    } else if (lowerStr.includes('repeating') || lowerStr.includes('repeat')) {
      responseText = "Step 1: Click to Create or Edit a reminder.\nStep 2: Find the 'Repeat' option.\nStep 3: Select your desired recurring frequency (Weekly, Daily, Custom).\nStep 4: Save your reminder.";
    } else if (lowerStr.includes('password')) {
      responseText = "Step 1: Go to Settings.\nStep 2: Tap Change Password.\nStep 3: Enter your new password.\nStep 4: Tap Save.";
    } else if (lowerStr.includes('theme') || lowerStr.includes('dark') || lowerStr.includes('light')) {
      responseText = "Step 1: Open the Sidebar Menu.\nStep 2: Locate the Theme toggle at the bottom.\nStep 3: Tap the Sun or Moon icon to switch between Light and Dark mode.";
    } else if (lowerStr.includes('edit') || lowerStr.includes('delete') || lowerStr.includes('remove') || lowerStr.includes('update')) {
      responseText = "Step 1: Go to your Dashboard calendar or Pending tasks.\nStep 2: Click on the reminder you want to modify to open its details.\nStep 3: Tap the Edit (pencil) or Delete (trash) icon.\nStep 4: Confirm your changes.";
    } else if (lowerStr.includes('profile') || lowerStr.includes('name') || lowerStr.includes('account')) {
      responseText = "Step 1: Open Settings from the sidebar.\nStep 2: Tap on your profile name.\nStep 3: Update your user details.\nStep 4: Save your changes.";
    } else if (lowerStr.includes('hello') || lowerStr.includes('hi')) {
      responseText = "Hello! I am the official Customer Service Support Assistant for RemindDo. How can I help you with your app today?";
    } else if (lowerStr.includes('notification') || lowerStr.includes('alert')) {
      responseText = "Step 1: Go to Settings.\nStep 2: Locate the Notifications toggle.\nStep 3: Turn it ON or OFF based on your preference.";
    } else if (lowerStr.includes('set') || lowerStr.includes('create') || lowerStr.includes('add')) {
      responseText = "Step 1: Go to the Dashboard.\nStep 2: Click the Plus (+) button in the bottom right.\nStep 3: Enter your reminder title and details, or just use your voice.\nStep 4: Pick a date and time.\nStep 5: Tap Create Task.";
    } else {
      responseText = "Could you please clarify your question?";
    }

    // Simulate streaming the response word by word
    const chunks = responseText.split(/(?=[ \n])/);
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await delay(75); // slight delay to simulate natural AI streaming
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("Chat Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process chat" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
