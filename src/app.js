// App State
let messages = [];
let isLoading = false;
let selectedModel = 'mixtral-8x7b-32768';

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');
const loadingIndicator = document.getElementById('loadingIndicator');
const welcomeMessage = document.getElementById('welcomeMessage');
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenu = document.getElementById('closeMenu');
const clearChat = document.getElementById('clearChat');
const exportChat = document.getElementById('exportChat');
const modelSelect = document.getElementById('modelSelect');
const themeToggle = document.getElementById('themeToggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    registerServiceWorker();
    loadChatHistory();
    setupEventListeners();
    optimizeFor120Hz();
});

// Initialize App
function initializeApp() {
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.checked = false;
    }

    // Check for saved model
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
        selectedModel = savedModel;
        modelSelect.value = savedModel;
    }

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        charCount.textContent = `${messageInput.value.length} / 4000`;
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Menu controls
    menuBtn.addEventListener('click', () => {
        sideMenu.classList.add('active');
    });

    closeMenu.addEventListener('click', () => {
        sideMenu.classList.remove('active');
    });

    // Clear chat
    clearChat.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the chat?')) {
            messages = [];
            messagesDiv.innerHTML = '';
            welcomeMessage.style.display = 'block';
            localStorage.removeItem('chatHistory');
        }
    });

    // Export chat
    exportChat.addEventListener('click', () => {
        const chatData = JSON.stringify(messages, null, 2);
        const blob = new Blob([chatData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${Date.now()}.json`;
        a.click();
    });

    // Model selection
    modelSelect.addEventListener('change', (e) => {
        selectedModel = e.target.value;
        localStorage.setItem('selectedModel', selectedModel);
    });

    // Theme toggle
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // Suggested prompts
    document.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            messageInput.value = chip.dataset.prompt;
            messageInput.dispatchEvent(new Event('input'));
            messageInput.focus();
        });
    });
}

// Send Message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || isLoading) return;

    // Hide welcome message
    welcomeMessage.style.display = 'none';

    // Add user message
    addMessage('user', message);
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    charCount.textContent = '0 / 4000';
    
    // Show loading
    isLoading = true;
    sendBtn.disabled = true;
    loadingIndicator.classList.add('active');

    try {
        // Prepare messages for API
        const apiMessages = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }));

        // Call API
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: apiMessages,
                model: selectedModel
            })
        });

        const data = await response.json();

        if (response.ok) {
            addMessage('bot', data.message);
        } else {
            throw new Error(data.error || 'Failed to get response');
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('bot', `Sorry, I encountered an error: ${error.message}`);
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        loadingIndicator.classList.remove('active');
    }
}

// Add Message to Chat
function addMessage(role, content) {
    const message = {
        role: role,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role} hardware-accelerated`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = content;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString();
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    messagesDiv.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    requestAnimationFrame(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    });
    
    // Save to localStorage
    saveChatHistory();
}

// Save Chat History
function saveChatHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (e) {
        console.error('Failed to save chat history:', e);
    }
}

// Load Chat History
function loadChatHistory() {
    try {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            messages = JSON.parse(saved);
            if (messages.length > 0) {
                welcomeMessage.style.display = 'none';
                messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.role} hardware-accelerated`;
                    
                    const avatar = document.createElement('div');
                    avatar.className = 'message-avatar';
                    avatar.textContent = msg.role === 'user' ? '👤' : '🤖';
                    
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'message-content';
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'message-text';
                    textDiv.textContent = msg.content;
                    
                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'message-time';
                    timeDiv.textContent = new Date(msg.timestamp).toLocaleTimeString();
                    
                    contentDiv.appendChild(textDiv);
                    contentDiv.appendChild(timeDiv);
                    
                    messageDiv.appendChild(avatar);
                    messageDiv.appendChild(contentDiv);
                    
                    messagesDiv.appendChild(messageDiv);
                });
            }
        }
    } catch (e) {
        console.error('Failed to load chat history:', e);
    }
}

// Optimize for 120Hz displays
function optimizeFor120Hz() {
    // Enable GPU acceleration
    document.querySelectorAll('.message, .prompt-chip, button').forEach(el => {
        el.classList.add('hardware-accelerated');
    });

    // Use requestAnimationFrame for smooth animations
    let lastScrollY = 0;
    let ticking = false;

    function updateScrollPosition() {
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }

    chatContainer.addEventListener('scroll', () => {
        lastScrollY = chatContainer.scrollTop;
        requestTick();
    });
}

// Register Service Worker for PWA
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Handle visibility change for battery optimization
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Reduce activity when app is in background
        console.log('App in background');
    } else {
        // Resume full activity
        console.log('App in foreground');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Back online');
});

window.addEventListener('offline', () => {
    console.log('Gone offline');
    addMessage('bot', 'You appear to be offline. Please check your connection.');
});
