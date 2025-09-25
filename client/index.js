// --- 1. Initialize Supabase ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTUxNDgsImV4cCI6MjA3NDAzMTE0OH0.EC_holDfG0UvhRgQl0Kj6CYeTLZpIWtXZqXeGVmFW00';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Wait for the entire HTML document to be ready before running our scripts ---
document.addEventListener('DOMContentLoaded', () => {

    // --- AUTHENTICATION LOGIC ---
    supabaseClient.auth.onAuthStateChange((event, session) => {
        const navButtons = document.querySelector('.nav-buttons');

        if (session) {
            // If a user is logged in, redirect them immediately to the dashboard.
            console.log('User is logged in, redirecting to dashboard...');
            window.location.href = 'dashboard.html';
        } else {
            // If no user is logged in, ensure the Login and Sign Up buttons are shown.
            console.log('User is logged out.');
            if (navButtons) { // Check if navButtons exists before changing it
                navButtons.innerHTML = `
                    <a href="login.html" class="btn btn-secondary">Login</a>
                    <a href="signup.html" class="btn btn-primary">Sign Up</a>
                `;
            }
        }
    });

    // --- ANIMATION LOGIC ---
    const cards = document.querySelectorAll('.feature-card');
    if (cards.length) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        cards.forEach(card => {
            observer.observe(card);
        });
    }

    // --- Optional: Add basic styling for the user email ---
    // This is generally not needed on this page anymore due to the redirect,
    // but it doesn't hurt to keep for edge cases.
    const style = document.createElement('style');
    style.textContent = `
        .user-email {
            color: var(--text-muted);
            margin: 0;
            align-self: center;
        }
    `;
    document.head.append(style);
});