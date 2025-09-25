// --- 1. Initialize Supabase ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTUxNDgsImV4cCI6MjA3NDAzMTE0OH0.EC_holDfG0UvhRgQl0Kj6CYeTLZpIWtXZqXeGVmFW00';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. Select All HTML Elements ---
const emailFormDiv = document.querySelector('#email-form');
const phoneFormDiv = document.querySelector('#phone-form');
const otpFormDiv = document.querySelector('#otp-form');

const signupFormEmail = document.querySelector('#signup-form-email');
const signupFormPhone = document.querySelector('#signup-form-phone');
const signupFormOtp = document.querySelector('#signup-form-otp');

const toggleToPhone = document.querySelector('#toggle-to-phone');
const toggleToEmail = document.querySelector('#toggle-to-email');
const googleButton = document.querySelector('#google-login-btn');

// --- 3. UI Management Functions ---
function showEmailForm() {
    emailFormDiv.classList.remove('hidden');
    phoneFormDiv.classList.add('hidden');
    otpFormDiv.classList.add('hidden');
    toggleToPhone.classList.remove('hidden');
    toggleToEmail.classList.add('hidden');
}

function showPhoneForm() {
    emailFormDiv.classList.add('hidden');
    phoneFormDiv.classList.remove('hidden');
    otpFormDiv.classList.add('hidden');
    toggleToPhone.classList.add('hidden');
    toggleToEmail.classList.remove('hidden');
}

function showOtpForm() {
    emailFormDiv.classList.add('hidden');
    phoneFormDiv.classList.add('hidden');
    otpFormDiv.classList.remove('hidden');
    toggleToPhone.classList.add('hidden');
    toggleToEmail.classList.remove('hidden');
}

// --- 4. Event Listeners ---

// Toggles
toggleToPhone.addEventListener('click', showPhoneForm);
toggleToEmail.addEventListener('click', showEmailForm);

// Email/Password Sign-Up
signupFormEmail.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = event.target.querySelector('#email').value;
    const password = event.target.querySelector('#password').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
        alert('Error signing up: ' + error.message);
    } else {
        alert('Sign up successful! Please check your email for a verification link.');
    }
});

// Phone Sign-Up (Step 1: Send OTP)
signupFormPhone.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = event.target.querySelector('#phone').value;
    const { data, error } = await supabaseClient.auth.signInWithOtp({ phone });
    if (error) {
        alert('Error sending OTP: ' + error.message);
    } else {
        alert('OTP sent successfully!');
        showOtpForm(); // Show the OTP form
    }
});

// Phone Sign-Up (Step 2: Verify OTP)
signupFormOtp.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = signupFormPhone.querySelector('#phone').value; // Get phone from previous form
    const token = event.target.querySelector('#otp').value;
    const { data, error } = await supabaseClient.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) {
        alert('Error verifying OTP: ' + error.message);
    } else {
        alert('Sign up successful!');
        window.location.href = 'index.html'; // Redirect on success
    }
});

// Google Sign-In
googleButton.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
        alert('Error signing in with Google: ' + error.message);
    }
});