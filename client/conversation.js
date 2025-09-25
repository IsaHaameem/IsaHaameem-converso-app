// --- 1. Initialize Supabase ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTUxNDgsImV4cCI6MjA3NDAzMTE0OH0.EC_holDfG0UvhRgQl0Kj6CYeTLZpIWtXZqXeGVmFW00';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. Select HTML Elements ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const micButton = document.getElementById('mic-button');

// --- 3. State Management ---
let conversationHistory = [];
let isListening = false;
let recognition;

// --- 4. Page Protection & Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    }
    resetConversation(); 
});

// --- 5. Add a message to the UI ---
function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');
    const textElement = document.createElement('p');
    textElement.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    messageElement.appendChild(textElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return textElement;
}

// --- 6. Handle Form Submission ---
chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    window.speechSynthesis.cancel();
    const userMessage = messageInput.value.trim();
    if (userMessage) {
        addMessage(userMessage, 'user');
        messageInput.value = '';
        conversationHistory.push({ role: 'user', content: userMessage });
        await getAIResponse();
    }
});

// --- 7. Fetch and Stream AI Response ---
async function getAIResponse() {
    const aiMessageElement = addMessage('...', 'ai');
    aiMessageElement.textContent = '';
    let fullResponse = '';
    let sentenceBuffer = '';

    try {
        const response = await fetch('http://localhost:3001/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory }),
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                if (sentenceBuffer.trim()) speak(sentenceBuffer);
                break;
            }
            const chunk = decoder.decode(value);
            sentenceBuffer += chunk;
            fullResponse += chunk;
            aiMessageElement.innerHTML = fullResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            let sentenceEndIndex;
            while ((sentenceEndIndex = sentenceBuffer.search(/[.!?]/)) >= 0) {
                const sentence = sentenceBuffer.substring(0, sentenceEndIndex + 1);
                sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex + 1);
                speak(sentence);
            }
        }
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        startListeningWhenSpeechEnds();

    } catch (error) {
        console.error('Error fetching AI response:', error);
        const errorMsg = 'Sorry, I am having trouble connecting.';
        aiMessageElement.textContent = errorMsg;
        speak(errorMsg);
    }
}

// --- 8. Voice Input (Speech-to-Text) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    micButton.addEventListener('click', () => {
        if (isListening) recognition.stop();
        else {
            window.speechSynthesis.cancel();
            recognition.start();
        }
    });
    recognition.onstart = () => { isListening = true; micButton.classList.add('listening'); micButton.textContent = '...'; };
    recognition.onend = () => { isListening = false; micButton.classList.remove('listening'); micButton.textContent = '🎙️'; };
    recognition.onresult = (event) => { messageInput.value = event.results[0][0].transcript; chatForm.requestSubmit(); };
    recognition.onerror = (event) => console.error('Speech recognition error:', event.error);
} else {
    micButton.disabled = true;
    micButton.textContent = '🚫';
}

// --- 9. Voice Output (Text-to-Speech) ---
function speak(text) {
    const cleanText = text.replace(/\*\*/g, '');
    if ('speechSynthesis' in window && cleanText) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        window.speechSynthesis.speak(utterance);
    }
}

// --- 10. Core Conversation Loop & Session Logic ---
function startListeningWhenSpeechEnds() {
    const speechCheckInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
            clearInterval(speechCheckInterval);
            if (recognition && !isListening) {
                recognition.start();
            }
        }
    }, 100);
}

document.addEventListener('click', async (event) => {
    if (event.target && event.target.id === 'end-session-btn') {
        await endCurrentConversation();
    }
});

async function endCurrentConversation() {
    window.speechSynthesis.cancel();
    if (recognition && isListening) recognition.stop();

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const payload = {
        userId: session.user.id,
        transcript: conversationHistory
    };
    
    try {
        console.log('🚀 Saving conversation...');
        const saveResponse = await fetch('http://localhost:3001/save-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!saveResponse.ok) throw new Error('Failed to save conversation');
        console.log('✅ Conversation saved.');

        console.log('🚀 Analyzing conversation...');
        const analyzeResponse = await fetch('http://localhost:3001/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!analyzeResponse.ok) throw new Error('Failed to analyze conversation');
        console.log('✅ Analysis complete.');

    } catch (error) {
        console.error("❌ Error during end-of-session process:", error);
        alert("There was an error processing your conversation. Please check the browser console.");
    }
    
    resetConversation();
}

function resetConversation() {
    window.speechSynthesis.cancel();
    if (recognition && isListening) recognition.stop();
    
    chatMessages.innerHTML = ''; 
    const initialAIMessage = "Hello! What would you like to talk about today?";
    addMessage(initialAIMessage, 'ai');
    conversationHistory = [{ role: 'assistant', content: initialAIMessage }];
    
    speak(initialAIMessage);
    startListeningWhenSpeechEnds();
}