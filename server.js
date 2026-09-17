const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const systemPrompt = require('./systemPrompt');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { messages, leadData } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // We use gemini-1.5-flash as it's the recommended model for general text/chat tasks
        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            systemInstruction: systemPrompt
        });

        // Format history for Gemini API (it uses 'user' and 'model' roles)
        // Ensure that the very first interaction has context about the lead if they just filled the form
        let history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const latestMessage = messages[messages.length - 1].content;
        
        let contextPrefix = '';
        if (messages.length === 1 && leadData) {
            contextPrefix = `[System Note: The user has just filled out a lead form with the following details. 
Name: ${leadData.name || 'Not provided'}
Mobile: ${leadData.mobile || 'Not provided'}
Email: ${leadData.email || 'Not provided'}
Company: ${leadData.company || 'Not provided'}
You may greet them by name. Do not repeat all this info back to them, just use it for context.]\n\n`;
        }

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(contextPrefix + latestMessage);
        const response = result.response.text();

        res.json({ reply: response });
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

app.listen(port, () => {
    console.log(`NB Entrepreneurs Chatbot Backend running on port ${port}`);
});
