
// Modified client.js to work with multi-process server
const BASE_PORT = 8000;  // Base port of the server
const SERVER_HOST = "192.168.0.109";  // Server host
const MAX_PORT = BASE_PORT + 10;  // Maximum expected port number

let availablePorts = [];
let currentPortIndex = 0;

const modelSelect = document.getElementById("model-select");
const chatBox = document.querySelector(".chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let selectedModel = null;
let messages = [];

// Discover available server ports
async function discoverServerPorts() {
  availablePorts = [];
  const portProbes = [];

  // Try to connect to each potential port
  for (let port = BASE_PORT; port <= MAX_PORT; port++) {
    const url = `http://${SERVER_HOST}:${port}/health`;
    portProbes.push(
      fetch(url, { method: 'GET', timeout: 1000 })
        .then(response => {
          if (response.ok) {
            availablePorts.push(port);
            console.log(`Server port ${port} is available`);
          }
        })
        .catch(() => {
          // Ignore errors - port is likely not available
        })
    );
  }

  await Promise.allSettled(portProbes);
  
  if (availablePorts.length === 0) {
    // If no ports were discovered, fall back to the base port
    console.warn("No server ports discovered, falling back to base port");
    availablePorts = [BASE_PORT];
  }
  
  console.log(`Discovered ${availablePorts.length} server ports:`, availablePorts);
}

// Get the next available port in a round-robin fashion
function getNextPort() {
  if (availablePorts.length === 0) return BASE_PORT;
  
  const port = availablePorts[currentPortIndex];
  currentPortIndex = (currentPortIndex + 1) % availablePorts.length;
  return port;
}

// Get server URL with the current port
function getServerURL() {
  const port = getNextPort();
  return `http://${SERVER_HOST}:${port}`;
}

async function fetchModels() {
  try {
    const response = await fetch(`${getServerURL()}/api/models`);
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
    const response = await fetch(`${getServerURL()}/api/chat`, {
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
    
    // Display timing information in console for debugging
    if (data.time_taken) {
      console.log(`Response time: ${data.time_taken.formatted}`);
    }
    
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

chatInput.addEventListener("input", function() {
  // Reset height to auto to get the correct scrollHeight
  this.style.height = "auto";
  
  // Set new height based on scrollHeight (with max-height constraint handled by CSS)
  this.style.height = (this.scrollHeight) + "px";
});

// Initialize app
async function initApp() {
  // First discover available server ports
  await discoverServerPorts();
  
  // Then fetch models from one of the discovered ports
  await fetchModels();
}

initApp();
