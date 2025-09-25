require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

// --- Initialize Supabase Admin Client ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// --- AI Chat Endpoint (Using Groq) ---
app.post('/chat', async (req, res) => {
    const groqApiKey = process.env.GROQ_API_KEY;
    
    const systemPrompt = {
        role: 'system',
        content: `You are 'Converso', a friendly, casual, and encouraging AI conversation partner. Your personality is relaxed and human-like. Your primary goal is to keep a natural conversation flowing. Follow these critical rules: 1. **Correct Mistakes, but be Casual:** If the user makes a grammar mistake, provide a correction. Your Tip MUST be one very short, simple sentence. Do not give a long grammar lesson. 2. **Be Concise:** Keep your conversational replies short (1-3 sentences). 3. **Be Human:** Use natural fillers like "umm," "oh," and "well." Spell "um" as "umm". 4. **NO MARKDOWN:** Your entire response must be plain text. Do not use asterisks (*). Correction Format Example: Correction: "Oh, I see." Tip: We usually say "I see" in this situation. Umm, yeah! It's a pretty interesting topic. What else is on your mind?`
    };
    
    const { messages } = req.body;
    if (!messages) return res.status(400).send('No messages provided');
    
    const fullMessages = [systemPrompt, ...messages];

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: fullMessages,
                model: "llama3-8b-8192",
                stream: true
            })
        });

        groqResponse.body.pipe(res);

    } catch (error) {
        console.error('Error with Groq API:', error);
        res.status(500).send('Error communicating with AI');
    }
});

// --- Other Endpoints ---
app.post('/save-conversation', async (req, res) => {
    const { userId, transcript } = req.body;
    if (!userId || !transcript) return res.status(400).json({ error: 'User ID and transcript are required.' });
    
    const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: userId, transcript: transcript }]);
        
    if (error) {
        console.error('Error saving conversation:', error);
        return res.status(500).json({ error: 'Failed to save conversation.' });
    }
    res.status(200).json({ message: 'Conversation saved successfully.' });
});

app.post('/analyze', async (req, res) => {
    const { userId, transcript } = req.body;
    if (!userId || !transcript) return res.status(400).json({ error: 'User ID and transcript are required.' });

    let userWordCount = 0;
    transcript.forEach(message => {
        if (message.role === 'user') {
            userWordCount += message.content.split(' ').length;
        }
    });

    try {
        const { data: profile, error: fetchError } = await supabase
            .from('Profiles')
            .select('words_learned, conversation_streak, last_conversation_at')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        let newStreak = profile.conversation_streak || 0;
        const today = new Date();
        const lastConversation = profile.last_conversation_at ? new Date(profile.last_conversation_at) : null;
        
        if (lastConversation) {
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            if (lastConversation.toDateString() === yesterday.toDateString()) {
                newStreak++;
            } else if (lastConversation.toDateString() !== today.toDateString()) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        const newTotalWords = (profile.words_learned || 0) + userWordCount;
        const profileUpdate = {
            words_learned: newTotalWords,
            conversation_streak: newStreak,
            last_conversation_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('Profiles')
            .update(profileUpdate)
            .eq('id', userId);
            
        if (updateError) throw updateError;
        
        res.status(200).json({ message: 'Analysis complete and profile updated.' });
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        res.status(500).json({ error: 'Failed to analyze conversation.' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Converso backend server running at http://localhost:${port}`);
});