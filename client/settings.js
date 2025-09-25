// --- 1. Initialize Supabase ---
const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTUxNDgsImV4cCI6MjA3NDAzMTE0OH0.EC_holDfG0UvhRgQl0Kj6CYeTLZpIWtXZqXeGVmFW00';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. Select HTML Elements ---
const settingsForm = document.getElementById('settings-form');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const bioInput = document.getElementById('bio');
const dobInput = document.getElementById('dob');
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');

let currentUser = null; // Variable to store the current user session

// --- 3. Main Function to Load Profile Data ---
async function loadProfileData() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;

    const { data: profile, error } = await supabaseClient
        .from('Profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (profile) {
        usernameInput.value = profile.username || '';
        emailInput.value = currentUser.email || '';
        bioInput.value = profile.bio || '';
        dobInput.value = profile.date_of_birth || '';
        if (profile.avatar_url) {
            avatarPreview.src = profile.avatar_url;
        }
    }
}

// --- 4. Handle Profile Detail Updates ---
settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    const updates = {
        id: currentUser.id,
        username: usernameInput.value,
        bio: bioInput.value,
        date_of_birth: dobInput.value,
        updated_at: new Date(),
    };

    const { error } = await supabaseClient.from('Profiles').upsert(updates);

    if (error) {
        alert('Error updating profile: ' + error.message);
    } else {
        alert('Profile saved successfully!');
    }
});

// --- 5. Handle Avatar Upload ---
avatarInput.addEventListener('change', async (event) => {
    if (!currentUser) return;

    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Show a preview of the new avatar
    avatarPreview.src = URL.createObjectURL(file);

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true }); // upsert:true allows overwriting the file

    if (uploadError) {
        alert('Error uploading avatar: ' + uploadError.message);
        return;
    }

    // Get the public URL of the uploaded file
    const { data } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);
    
    const publicUrl = data.publicUrl;

    // Update the avatar_url in the Profiles table
    const { error: updateError } = await supabaseClient
        .from('Profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

    if (updateError) {
        alert('Error saving avatar URL: ' + updateError.message);
    } else {
        alert('Avatar updated successfully!');
    }
});

// --- 6. Run Everything When the Page Loads ---
document.addEventListener('DOMContentLoaded', loadProfileData);