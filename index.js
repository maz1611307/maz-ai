let selectedImageBase64 = null;

// 1. Open file picker when plus button is clicked
document.getElementById('plusBtn').addEventListener('click', () => {
  document.getElementById('imageInput').click();
});

// 2. Read selected image as Base64 string
document.getElementById('imageInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      selectedImageBase64 = e.target.result; // This is the Base64 image URL
      alert("Image attached successfully!");
    };
    reader.readAsDataURL(file);
  }
});

// 3. Send message with image to API
async function sendMessage() {
  const messageText = document.getElementById('messageInput').value;
  const userEmail = localStorage.getItem("user_email") || "user@example.com";

  if (!messageText && !selectedImageBase64) return;

  // Clear input fields
  document.getElementById('messageInput').value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        image: selectedImageBase64, // Sends Base64 image
        user_email: userEmail
      })
    });

    const data = await res.json();
    console.log("AI Response:", data.reply);

    // Reset image after sending
    selectedImageBase64 = null;
    document.getElementById('imageInput').value = '';

  } catch (err) {
    console.error("Error sending message:", err);
  }
}
