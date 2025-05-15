
const SERVER_URL = "http://192.168.0.128:8000";  // Backend API base URL

const modelSelect = document.getElementById("model-select");
const chatBox = document.querySelector(".chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let selectedModel = null;
let messages = [];

async function fetchModels() {
  try {
    const response = await fetch(`${SERVER_URL}/api/models`);
    const data = await response.json();
    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
    if (data.models.length > 0) {
      selectedModel = data.models[0].name;
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

function appendMessage(content, isUser = true) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const avatar = document.createElement("div");
  avatar.className = `avatar ${isUser ? "user-avatar" : "model-avatar"}`;
  avatar.textContent = isUser ? "👤" : "🤖";
  
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = content;
  
  const timestamp = document.createElement("div");
  timestamp.className = "timestamp";
  const now = new Date();
  timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  container.appendChild(avatar);
  container.appendChild(messageContent);
  messageDiv.appendChild(container);
  messageDiv.appendChild(timestamp);
  
  // If it's a bot message, add model indicator
  if (!isUser) {
    const modelIndicator = document.createElement("div");
    modelIndicator.className = "model-indicator";
    modelIndicator.textContent = selectedModel;
    messageDiv.appendChild(modelIndicator);
  }
  
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showLoadingIndicator() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "goo-loading";
  loadingDiv.innerHTML = "<div class='dot'></div><div class='dot'></div><div class='dot'></div>";
  chatBox.appendChild(loadingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  return loadingDiv;
}

async function sendMessage() {
  const inputText = chatInput.value.trim();
  if (!inputText || !selectedModel) return;

  appendMessage(inputText, true);
  messages.push({ role: "user", content: inputText });
  chatInput.value = "";

  const loadingIndicator = showLoadingIndicator();

  try {
    const response = await fetch(`${SERVER_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: false  // Change to true if you want to use streaming
      })
    });

    // Remove loading indicator
    loadingIndicator.remove();

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const botReply = data.response;
    appendMessage(botReply, false);
    messages.push({ role: "assistant", content: botReply });

  } catch (error) {
    // Remove loading indicator in case of error
    loadingIndicator.remove();
    
    console.error("Error fetching chat:", error);
    appendMessage("⚠️ Error communicating with backend.", false);
  }
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

modelSelect.addEventListener("change", () => {
  selectedModel = modelSelect.value;
  messages = []; // Reset chat history when switching models
  chatBox.innerHTML = ""; // Clear chat display
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

fetchModels();
chatInput.addEventListener("input", function() {
  // Reset height to auto to get the correct scrollHeight
  this.style.height = "auto";
  
  // Set new height based on scrollHeight (with max-height constraint handled by CSS)
  this.style.height = (this.scrollHeight) + "px";
});
