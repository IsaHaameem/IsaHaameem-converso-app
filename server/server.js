const express = require('express');
const cors = require('cors');
const { Ollama } = require('ollama');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3001;

// --- Initialize Supabase Admin Client ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ1NTE0OCwiZXhwIjoyMDc0MDMxMTQ4fQ.fuWKxqJP-zGf0JweWeX52qZQHxSc3XAWkFfEBdwMeFw';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

const ollama = new Ollama({ host: 'http://localhost:11434' });

// --- AI Chat Endpoint ---
app.post('/chat', async (req, res) => {
    const systemPrompt = {
        role: 'system',
        content: `You are 'Converso', a friendly, casual, and encouraging AI conversation partner. Your personality is relaxed and human-like. Your primary goal is to keep a natural conversation flowing. Follow these critical rules: 1. **Correct Mistakes, but be Casual:** If the user makes a grammar mistake, provide a correction. Your Tip MUST be one very short, simple sentence. Do not give a long grammar lesson. 2. **Be Concise:** Keep your conversational replies short (1-3 sentences). 3. **Be Human:** Use natural fillers like "umm," "oh," and "well." Spell "um" as "umm". 4. **NO MARKDOWN:** Your entire response must be plain text. Do not use asterisks (*). Correction Format Example: Correction: "Oh, I see." Tip: We usually say "I see" in this situation. Umm, yeah! It's a pretty interesting topic. What else is on your mind?`
    };
    const { messages } = req.body;
    if (!messages) return res.status(400).send('No messages provided');
    const fullMessages = [systemPrompt, ...messages];
    try {
        const stream = await ollama.chat({ model: 'phi3', messages: fullMessages, stream: true });
        for await (const part of stream) { res.write(part.message.content); }
        res.end();
    } catch (error) {
        console.error('Error with Ollama:', error);
        res.status(500).send('Error communicating with AI');
    }
});

// --- Endpoint to Save Conversations ---
app.post('/save-conversation', async (req, res) => {
    const { userId, transcript } = req.body;
    if (!userId || !transcript) {
        return res.status(400).json({ error: 'User ID and transcript are required.' });
    }
    const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: userId, transcript: transcript }]);
    if (error) {
        console.error('Error saving conversation:', error);
        return res.status(500).json({ error: 'Failed to save conversation.' });
    }
    res.status(200).json({ message: 'Conversation saved successfully.' });
});

// --- Endpoint to Analyze Conversation & Update Stats (UPDATED) ---
app.post('/analyze', async (req, res) => {
    const { userId, transcript } = req.body;
    if (!userId || !transcript) {
        return res.status(400).json({ error: 'User ID and transcript are required.' });
    }

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

        // Calculate the new streak
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
        
        console.log(`Profile updated for user ${userId}:`, profileUpdate);
        res.status(200).json({ message: 'Analysis complete and profile updated.' });

    } catch (error) {
        console.error('Error analyzing conversation:', error);
        res.status(500).json({ error: 'Failed to analyze conversation.' });
    }
});


app.listen(port, () => {
    console.log(`🚀 Converso backend server running at http://localhost:${port}`);
});