
// Modified client.js without health check but with multi-process server support
const BASE_PORT = 8000;  // Base port of the server
const SERVER_HOST = "192.168.0.109";  // Server host
const PORT_COUNT = 2;  // Number of server processes/ports to use (adjust based on your setup)

let currentPortIndex = 0;

const modelSelect = document.getElementById("model-select");
const chatBox = document.querySelector(".chat-box");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");

let selectedModel = null;
let messages = [];
let debugMode = false;  // Set to true to enable detailed debug logs

// Toggle debug mode with Ctrl+Shift+D
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    debugMode = !debugMode;
    console.log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
    e.preventDefault();
  }
});

// Enhanced logging function
function logDebug(...args) {
  if (debugMode) {
    console.log('[DEBUG]', ...args);
  }
}

// Get the next available port in a round-robin fashion
function getNextPort() {
  const port = BASE_PORT + currentPortIndex;
  currentPortIndex = (currentPortIndex + 1) % PORT_COUNT;
  logDebug(`Using server port: ${port}`);
  return port;
}

// Get server URL with the current port
function getServerURL() {
  const port = getNextPort();
  return `http://${SERVER_HOST}:${port}`;
}

async function fetchModels() {
  try {
    logDebug('Fetching model list...');
    const serverUrl = getServerURL();
    logDebug(`Requesting models from ${serverUrl}/api/models`);
    
    const response = await fetch(`${serverUrl}/api/models`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    logDebug('Models data received:', data);
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add models to select dropdown
    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = model.name;
      modelSelect.appendChild(option);
      logDebug(`Added model option: ${model.name}`);
    });
    
    if (data.models.length > 0) {
      selectedModel = data.models[0].name;
      logDebug(`Default selected model: ${selectedModel}`);
    } else {
      console.warn("No models found in the response");
    }
  } catch (error) {
    console.error("Error fetching models:", error);
    appendSystemMessage("⚠️ Failed to load models. Please check server connection.");
  }
}

function appendSystemMessage(content) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message system-message";
  
  const container = document.createElement("div");
  container.className = "message-container";
  
  const avatar = document.createElement("div");
  avatar.className = "avatar system-avatar";
  avatar.textContent = "⚙️";
  
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = content;
  
  container.appendChild(avatar);
  container.appendChild(messageContent);
  messageDiv.appendChild(container);
  
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
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
  loadingDiv.className = "goo-wrapper";
  
  // Create the actual goo container with particles
  const gooContainer = document.createElement("div");
  gooContainer.className = "goo";
  
  // Add particles (these will create the gooey effect)
  const particle1 = document.createElement("div");
  particle1.className = "particle";
  
  const particle2 = document.createElement("div");
  particle2.className = "particle";
  
  const particle3 = document.createElement("div");
  particle3.className = "particle";
  
  // Add particles to goo container
  gooContainer.appendChild(particle1);
  gooContainer.appendChild(particle2);
  gooContainer.appendChild(particle3);
  
  // Add bot icon as a separate element not affected by goo
  const botIcon = document.createElement("div");
  botIcon.className = "bot-icon";
  botIcon.textContent = "🤖";
  
  // Add model name indicator
  const modelName = document.createElement("div");
  modelName.className = "loading-model-name";
  modelName.textContent = selectedModel || "AI";
  
  // Add elements to the loading wrapper
  loadingDiv.appendChild(botIcon);
  loadingDiv.appendChild(gooContainer);
  loadingDiv.appendChild(modelName);
  
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
  const serverUrl = getServerURL();
  
  logDebug(`Sending chat request to ${serverUrl}/api/chat for model: ${selectedModel}`);
  logDebug('Request payload:', {
    model: selectedModel,
    messages: messages,
    stream: false
  });

  try {
    const response = await fetch(`${serverUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: false
      })
    });

    // Remove loading indicator
    loadingIndicator.remove();

    if (!response.ok) {
      const errorText = await response.text();
      logDebug(`Error response (${response.status}):`, errorText);
      
      try {
        // Try to parse error as JSON
        const errorJson = JSON.parse(errorText);
        throw new Error(`Server error (${response.status}): ${errorJson.error || errorText}`);
      } catch (parseError) {
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    logDebug('Response data:', data);
    
    const botReply = data.response;
    
    // Display timing information in console
    if (data.time_taken) {
      console.log(`Response time: ${data.time_taken.formatted}`);
    }
    
    appendMessage(botReply, false);
    messages.push({ role: "assistant", content: botReply });

  } catch (error) {
    // Remove loading indicator in case of error
    loadingIndicator.remove();
    
    console.error("Error in chat request:", error);
    
    // Add a more specific error message
    let errorMessage = "⚠️ Error communicating with backend.";
    
    // Check if it's a model-specific error
    if (error.message.includes("model") || error.message.includes("not found")) {
      errorMessage = `⚠️ Model error: ${selectedModel} may not be loaded or available.`;
    } 
    // Check if it's a timeout error
    else if (error.message.includes("timeout")) {
      errorMessage = "⚠️ Request timed out. Model may be too slow or unresponsive.";
    }
    // Check if it's a connection error
    else if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
      errorMessage = "⚠️ Network error. Connection to server lost.";
    }
    // If we have a more specific error message from the server
    else if (error.message.includes("Server error")) {
      errorMessage = error.message;
    }
    
    appendMessage(errorMessage, false);
  }
}

// Function to test model availability
async function testModel(modelName) {
  try {
    logDebug(`Testing model: ${modelName}`);
    const serverUrl = getServerURL();
    
    const response = await fetch(`${serverUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Hello" }],
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText, status: response.status };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

modelSelect.addEventListener("change", async () => {
  const newModel = modelSelect.value;
  logDebug(`Model changed to: ${newModel}`);
  
  // Test model before switching
  appendSystemMessage(`Testing model: ${newModel}...`);
  
  const testResult = await testModel(newModel);
  
  if (testResult.success) {
    selectedModel = newModel;
    messages = []; // Reset chat history when switching models
    chatBox.innerHTML = ""; // Clear chat display
    appendSystemMessage(`Model switched to ${selectedModel}`);
  } else {
    appendSystemMessage(`⚠️ Model test failed: ${newModel}`);
    logDebug('Model test error:', testResult);
    
    // Add detailed error information
    if (testResult.error) {
      let errorDetail = testResult.error;
      try {
        // Try to parse JSON error
        const jsonError = JSON.parse(testResult.error);
        if (jsonError.error) {
          errorDetail = jsonError.error;
        }
      } catch (e) {
        // Use the original error text
      }
      appendSystemMessage(`Error details: ${errorDetail}`);
    }
    
    // Reset select to previous model
    modelSelect.value = selectedModel;
  }
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${chatInput.scrollHeight}px`;
});

// Initialize app
async function initApp() {
  appendSystemMessage("Initializing chat interface...");
  
  // Hard-code the number of ports to use instead of discovering them
  appendSystemMessage(`Using ${PORT_COUNT} server ports starting at ${BASE_PORT}`);
  
  // Fetch models from one of the available ports
  appendSystemMessage("Loading available models...");
  await fetchModels();
  
  appendSystemMessage("Ready to chat!");
}

initApp();
