const { ipcRenderer, clipboard, nativeImage } = require("electron");

// ... (code omitted)

// --- Action Buttons Logic ---
const copyBtn = document.getElementById('copy-btn');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const combineBtn = document.getElementById('combine-btn');
const screenshotsContainer = document.getElementById('screenshots-container');

if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        if (currentScreenshotData) {
            try {
                const img = nativeImage.createFromDataURL(currentScreenshotData);
                clipboard.writeImage(img);

                // Visual Feedback
                const originalContent = copyBtn.innerHTML;
                copyBtn.innerHTML = '<span class="material-icons" style="font-size: 18px;">check</span> Copied!';
                copyBtn.style.borderColor = '#28a745';
                copyBtn.style.color = '#28a745';

                setTimeout(() => {
                    copyBtn.innerHTML = originalContent;
                    copyBtn.style.borderColor = ''; // Reset to CSS default
                    copyBtn.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    });
}

// Combine Logic
if (combineBtn && screenshotsContainer) {
    combineBtn.addEventListener('click', () => {
        ipcRenderer.send('log', 'Combine button clicked');
        console.log('Combine button clicked');

        if (!currentScreenshotData) {
            ipcRenderer.send('log', 'No currentScreenshotData found');
            console.error('No currentScreenshotData');
            return;
        }

        ipcRenderer.send('log', 'Duplicating screenshot...');
        const newImg = document.createElement('img');
        newImg.src = currentScreenshotData;
        newImg.decoding = 'async'; // Optimize decoding
        newImg.classList.add('screenshot-item');
        // Optional: add distinct ID or margin if needed via class

        screenshotsContainer.appendChild(newImg);
        observer.observe(newImg); // Observe for active state

        // Scroll to show new content
        screenshotsContainer.scrollTop = screenshotsContainer.scrollHeight;
    });
} else {
    console.error('Combine button or container not found in DOM');
}

// Snap Navigation Logic
function getCenteredScreenshotIndex() {
    const images = Array.from(screenshotsContainer.querySelectorAll('.screenshot-item'));
    if (images.length === 0) return -1;

    const containerCenter = screenshotsContainer.scrollTop + (screenshotsContainer.clientHeight / 2);

    // Find image closest to center
    let closestIndex = 0;
    let minDiff = Infinity;

    images.forEach((img, index) => {
        const imgCenter = img.offsetTop + (img.clientHeight / 2);
        const diff = Math.abs(containerCenter - imgCenter);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
        }
    });

    return closestIndex;
}

// Active State Observer (Carousel Effect)
const observerOptions = {
    root: screenshotsContainer,
    threshold: 0.6 // Trigger when 60% visible
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Remove active from others? No, scroll might show 2 partially. 
            // Better: Find truly centered one in scroll event?
            // Actually, for "one active", lets force only one active.
            // We can rely on css snap to keep one mostly visible.
            // Let's just highlight all that are >60% visible (usually just one).
            entry.target.classList.add('active');
        } else {
            entry.target.classList.remove('active');
        }
    });
}, observerOptions);

// Observe initial image (wait for DOM)
// Assuming 'previewImg' is the initial image displayed in the modal,
// or if the first combined image is added to screenshotsContainer, it will be observed by the combineBtn logic.
// If there's an initial 'screenshot-item' in screenshotsContainer on load, observe it here.
// For now, we'll rely on the combineBtn to observe new items.
// If there's a single initial image in screenshotsContainer, uncomment and adjust:
// const initialScreenshotItem = screenshotsContainer.querySelector('.screenshot-item');
// if (initialScreenshotItem) observer.observe(initialScreenshotItem);


if (btnUp) btnUp.addEventListener('click', () => {
    const index = getCenteredScreenshotIndex();
    const images = screenshotsContainer.querySelectorAll('.screenshot-item');
    if (index > 0) {
        const target = images[index - 1];
        const targetConnect = target.offsetTop + (target.clientHeight / 2) - (screenshotsContainer.clientHeight / 2);
        fastScrollTo(screenshotsContainer, targetConnect, 250); // 250ms fast scroll
    }
});

if (btnDown) btnDown.addEventListener('click', () => {
    const index = getCenteredScreenshotIndex();
    const images = screenshotsContainer.querySelectorAll('.screenshot-item');
    if (index < images.length - 1) {
        const target = images[index + 1];
        const targetConnect = target.offsetTop + (target.clientHeight / 2) - (screenshotsContainer.clientHeight / 2);
        fastScrollTo(screenshotsContainer, targetConnect, 250);
    } else {
        // If at last item, ensure it is fully scrolled
        // Actually, logic handles last item too if padding allows.
        const target = images[images.length - 1];
        const targetConnect = target.offsetTop + (target.clientHeight / 2) - (screenshotsContainer.clientHeight / 2);
        fastScrollTo(screenshotsContainer, targetConnect, 250);
    }
});


// UI Elements
const reflectBtn = document.getElementById('reflect-btn');
const chatbot = document.getElementById('chatbot');
const closeBtn = document.querySelector('.close-btn');
const screenshotBtn = document.getElementById('screenshot-btn');
const selectionOverlay = document.getElementById('selection-overlay');
const selectionBox = document.getElementById('selection-box');
const windowHighlight = document.getElementById('window-highlight');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const selectionIndicator = document.getElementById('selection-indicator');
const screenshotPreview = document.getElementById('screenshot-preview');
const previewImg = document.getElementById('preview-img');
const removeScreenshotBtn = document.getElementById('remove-screenshot');

// Dev Menu Elements
const devBtn = document.getElementById('dev-btn');
const devMenu = document.getElementById('dev-menu');
const blurSlider = document.getElementById('blur-slider');
const blurVal = document.getElementById('blur-val');
const modalBgImage = document.getElementById('modal-bg-image');
const apiKeyInput = document.getElementById('api-key-input');
const aiModeToggle = document.getElementById('ai-mode-toggle');

// State
let isChatbotOpen = false;
let isScreenshotMode = false;
let isModalOpen = false;
let currentScreenshotData = null;
let startX, startY;
let lastMouseX = 0;
let lastMouseY = 0;
let windows = [];
let currentHighlightedWindow = null;
let currentBlurRadius = 8;
let escTimer = null; // Timer for Hold-to-Close

// --- Hold Escape to Close Logic ---
// --- Simple Escape to Hide ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
        hideScreenshotModal();
    }
});
// (Keyup listener for Escape removed as it's no longer hold-based)

// --- Resize Logic ---
const leftPanel = document.getElementById('result-panel');
const leftHandle = document.querySelector('#result-panel .handle-left');

const rightPanel = document.getElementById('right-panel');
const rightHandle = document.querySelector('#right-panel .handle-right');

let resizingLeft = false;
let resizingRight = false;
let resizingDev = false; // New state for Dev Menu
let resizeStartX = 0;
let resizeStartWidth = 0;
let justResized = false;

// Left Panel Resize (Handle on LEFT outer edge)
// Expanding outwards means moving mouse LEFT increases width.
if (leftHandle && leftPanel) {
    leftHandle.addEventListener('mousedown', (e) => {
        resizingLeft = true;
        resizeStartX = e.clientX;
        resizeStartWidth = leftPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        setIgnoreMouseEvents(false);
    });
}

// Right Panel Resize (Handle on RIGHT outer edge)
// Expanding outwards means moving mouse RIGHT increases width.
if (rightHandle && rightPanel) {
    rightHandle.addEventListener('mousedown', (e) => {
        resizingRight = true;
        resizeStartX = e.clientX;
        resizeStartWidth = rightPanel.offsetWidth;
        document.body.style.cursor = 'col-resize';
        setIgnoreMouseEvents(false);
    });
}

window.addEventListener('mousemove', (e) => {
    if (resizingLeft && leftPanel) {
        // Dragging Left (smaller X) -> Increase Width
        const delta = resizeStartX - e.clientX;
        leftPanel.style.width = (resizeStartWidth + delta) + 'px';
    }

    if (resizingRight && rightPanel) {
        // Dragging Right (larger X) -> Increase Width
        const delta = e.clientX - resizeStartX;
        rightPanel.style.width = (resizeStartWidth + delta) + 'px';
    }

    if (resizingDev && devMenu) {
        const delta = e.clientX - resizeStartX;
        const newWidth = Math.max(200, resizeStartWidth + delta); // Min width 200px
        devMenu.style.width = newWidth + 'px';
    }
});

window.addEventListener('mouseup', () => {
    if (resizingLeft || resizingRight || resizingDev) {
        resizingLeft = false;
        resizingRight = false;
        resizingDev = false;
        document.body.style.cursor = 'default';

        // Prevent click event on background from closing modal immediately
        justResized = true;
        setTimeout(() => {
            justResized = false;
        }, 100);
    }
});

// --- Dev Menu Logic ---
devBtn.addEventListener('click', () => {
    if (devMenu.style.display === 'flex') {
        devMenu.style.display = 'none';
        // Reset or disable resizing state just in case
        resizingDev = false;
    } else {
        devMenu.style.display = 'flex';
    }
});

// Dev Menu Resize Handle
const devResizeHandle = devMenu ? devMenu.querySelector('.resize-handle-dev') : null;
if (devResizeHandle) {
    devResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text selection
        resizingDev = true;
        resizeStartX = e.clientX;
        resizeStartWidth = devMenu.offsetWidth;
    });
}

// --- Filter Control Logic (Blur & Brightness) ---
let currentBrightness = 0.9;
// currentBlurRadius is already defined globally or above

const updateBackgroundFilter = () => {
    if (modalBgImage) {
        modalBgImage.style.filter = `blur(${currentBlurRadius}px) brightness(${currentBrightness})`;
        modalBgImage.style.webkitFilter = `blur(${currentBlurRadius}px) brightness(${currentBrightness})`;
    }
};

blurSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    blurVal.innerText = val + 'px';
    currentBlurRadius = val;
    updateBackgroundFilter();
});

const brightnessSlider = document.getElementById('brightness-slider');
const brightnessVal = document.getElementById('brightness-val');

if (brightnessSlider && brightnessVal) {
    brightnessSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        brightnessVal.innerText = val;
        currentBrightness = val;
        updateBackgroundFilter();
    });
}

// --- API Key & AI Mode Logic ---
const checkApiBtn = document.getElementById('check-api-btn');
const modelSelect = document.getElementById('model-select');

// Default model
let currentModel = 'gemini-1.5-flash';

if (modelSelect) {
    const savedModel = localStorage.getItem('sky_ai_model');
    if (savedModel) {
        modelSelect.value = savedModel;
        currentModel = savedModel;
    }

    modelSelect.addEventListener('change', (e) => {
        currentModel = e.target.value;
        localStorage.setItem('sky_ai_model', currentModel);
        console.log("Model Changed:", currentModel);
    });
}

// Custom Instructions
const customInstructionsInput = document.getElementById('custom-instructions-input');
if (customInstructionsInput) {
    const savedInstructions = localStorage.getItem('sky_custom_instructions');
    if (savedInstructions) customInstructionsInput.value = savedInstructions;

    customInstructionsInput.addEventListener('input', (e) => {
        localStorage.setItem('sky_custom_instructions', e.target.value);
    });
}

if (apiKeyInput) {
    const savedKey = localStorage.getItem('sky_api_key');
    if (savedKey) apiKeyInput.value = savedKey;

    apiKeyInput.addEventListener('input', (e) => {
        localStorage.setItem('sky_api_key', e.target.value);
    });
}

// --- Specialized Personas (Instructions) ---
const promptFunctionInput = document.getElementById('prompt-function');
const promptEmotionInput = document.getElementById('prompt-emotion');
const promptSymbolInput = document.getElementById('prompt-symbol');

const setupPersonaInput = (inputEl, storageKey) => {
    if (inputEl) {
        const saved = localStorage.getItem(storageKey);
        if (saved) inputEl.value = saved;
        inputEl.addEventListener('input', (e) => {
            localStorage.setItem(storageKey, e.target.value);
        });
    }
};

// --- Orb Popup Logic ---
const popupItemReflection = document.getElementById('popup-item-reflection');
if (popupItemReflection) {
    popupItemReflection.addEventListener('click', () => {
        // Logic from reflectBtn
        if (currentScreenshotData && !isModalOpen) {
            showScreenshotModal(null, null);
        }
    });
}

setupPersonaInput(promptFunctionInput, 'sky_prompt_func');
setupPersonaInput(promptEmotionInput, 'sky_prompt_emo');
setupPersonaInput(promptSymbolInput, 'sky_prompt_sym');

if (checkApiBtn) {
    checkApiBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value;
        if (!apiKey) {
            alert("Please enter an API Key first.");
            return;
        }

        // Visual Feedback - Loading
        checkApiBtn.innerHTML = '<span class="material-icons" style="font-size: 14px; animation: spin 1s linear infinite;">refresh</span>';

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }]
                })
            });

            if (response.ok) {
                // Success
                checkApiBtn.style.borderColor = "#4caf50";
                checkApiBtn.style.color = "#4caf50";
                checkApiBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">check</span>';
                setTimeout(() => {
                    checkApiBtn.style.borderColor = "rgba(255,255,255,0.2)";
                    checkApiBtn.style.color = "white";
                    checkApiBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">check_circle</span>';
                }, 2000);
            } else {
                throw new Error("Invalid Key");
            }
        } catch (error) {
            // Error
            checkApiBtn.style.borderColor = "#f44336";
            checkApiBtn.style.color = "#f44336";
            checkApiBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">error</span>';
            setTimeout(() => {
                checkApiBtn.style.borderColor = "rgba(255,255,255,0.2)";
                checkApiBtn.style.color = "white";
                checkApiBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">check_circle</span>';
            }, 2000);
        }
    });
}

if (aiModeToggle) {
    const savedMode = localStorage.getItem('sky_ai_mode');
    if (savedMode === 'true') {
        aiModeToggle.checked = true;
    }

    aiModeToggle.addEventListener('change', (e) => {
        localStorage.setItem('sky_ai_mode', e.target.checked);
        console.log("AI Mode Toggled:", e.target.checked);
    });
}

// --- Segmented Control Logic ---
const segmentBtns = document.querySelectorAll('.segment-btn');
const leftPanelContent = document.getElementById('result-panel');

if (segmentBtns.length > 0 && leftPanelContent) {
    // Initial State Check
    // If the first button (Reflexion) is active by default, hide right panel
    if (segmentBtns[0].classList.contains('active') && segmentBtns[0].dataset.target === 'view-reflection') {
        if (rightPanel) rightPanel.style.visibility = 'hidden';
    }

    segmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            segmentBtns.forEach(b => b.classList.remove('active'));
            // Add to clicked
            btn.classList.add('active');

            const targetId = btn.dataset.target;
            const container = btn.closest('#result-panel');

            // Toggle Right Panel Visibility
            if (rightPanel) {
                if (targetId === 'view-reflection') {
                    rightPanel.style.visibility = 'hidden';
                } else {
                    rightPanel.style.visibility = 'visible';
                }
            }

            // Update Views
            container.querySelectorAll('.panel-view').forEach(view => view.classList.remove('active-view'));
            const targetView = container.querySelector(`#${targetId}`);
            if (targetView) targetView.classList.add('active-view');
        });
    });
}

// --- Reflection Chat Logic (Demo) ---
const chatInputReflect = document.getElementById('reflection-chat-input');
const chatSendReflect = document.getElementById('reflection-chat-send');
const chatMessagesReflect = document.getElementById('reflection-chat-messages');

// Helper to Add Message to Chat Interface
function addChatMessage(text, isUser, color = null) {
    if (!chatMessagesReflect) return;

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.classList.add(isUser ? 'message-user' : 'message-ai');
    bubble.innerText = text;

    if (isUser && color) {
        bubble.style.background = color;
        // Adjust text color if needed, but usually white is fine for our colored chips
    }

    chatMessagesReflect.appendChild(bubble);
    chatMessagesReflect.scrollTop = chatMessagesReflect.scrollHeight;

    return bubble;
}

// --- Start State Input Logic ---
const startInput = document.getElementById("start-input");
const startSendBtn = document.getElementById("start-send-btn");
const mainChatInputWrapper = document.getElementById("main-chat-input-wrapper");

function handleStartConnect() {
    const text = startInput.value.trim();
    if (!text) return;

    const panelStepSwitch = document.getElementById("panel-step-switch");
    const startStateContent = document.getElementById("start-state-content");
    const reflectionHeader = document.getElementById("reflection-header");
    const reflectionTopicText = document.getElementById("reflection-topic-text");

    if (reflectionTopicText) reflectionTopicText.innerText = text;
    if (reflectionHeader) reflectionHeader.style.display = "block";
    if (panelStepSwitch) panelStepSwitch.style.visibility = "visible";
    if (startStateContent) startStateContent.style.display = "none";
    if (mainChatInputWrapper) mainChatInputWrapper.style.display = "flex";

    const staticChips = document.getElementById('static-chips-container');
    if (staticChips) staticChips.style.display = 'flex';

    startInput.value = "";

    const isAIMode = localStorage.getItem('sky_ai_mode') === 'true';
    const apiKey = localStorage.getItem('sky_api_key');

    if (isAIMode && apiKey) {
        getInitialReflectionQuestion(text, apiKey);
    } else {
        setTimeout(() => {
            const responses = [
                "Das ist ein interessanter Gedanke. Erzähl mir mehr darüber.",
                "Wie fühlst du dich dabei?",
                "Was würdest du beim nächsten Mal anders machen?",
                "Verstehe. Das klingt nach einem wichtigen Moment."
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addChatMessage(randomResponse, false);
        }, 1000);
    }
}

async function getInitialReflectionQuestion(topic, apiKey) {
    const loadingMsg = addChatMessage("...", false);

    try {
        let systemPrompt = `You are a helpful design assistant named 'SKY'. The user wants to reflect on the following topic related to the screenshot: "${topic}".\nAnalyze the visual content of the screenshot and the user's topic. Generate a SINGLE, engaging, and relevant question to start the reflection dialogue. Be specific to what you see.`;

        // Include global custom instructions if any
        const customInstructions = localStorage.getItem('sky_custom_instructions');
        if (customInstructions) {
            systemPrompt += `\n\n[GLOBAL USER INSTRUCTIONS]:\n${customInstructions}`;
        }

        const contents = {
            parts: [{ text: systemPrompt }]
        };

        if (currentScreenshotData) {
            const base64Data = currentScreenshotData.replace(/^data:image\/\w+;base64,/, "");
            const mimeType = currentScreenshotData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0] || "image/png";
            contents.parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [contents] })
        });

        if (!response.ok) throw new Error(`API Error ${response.status}`);

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Erzähl mir mehr darüber.";

        if (loadingMsg) loadingMsg.remove();
        addChatMessage(aiText, false);

    } catch (error) {
        console.error("Initial AI Error:", error);
        if (loadingMsg) loadingMsg.remove();
        addChatMessage("Das ist ein interessantes Thema. Was genau möchtest du dazu anmerken? (AI Error)", false);
    }
}

if (startSendBtn) {
    startSendBtn.addEventListener("click", handleStartConnect);
}
if (startInput) {
    startInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleStartConnect();
    });
}

// --- Static Chips Logic ---
let currentAnnotationColor = 'rgba(0, 122, 255, 0.8)'; // Default Blue
let currentAnnotationCategory = 'Funktionen'; // Default Category
const staticFeatureChips = document.querySelectorAll('.static-chip');
const finishCommentsBtn = document.getElementById('finish-comments-btn');
// Redundant check for annotationSubmitBtn if defined later, but safe to grab here or rely on global if var exists
// We'll rely on global `annotationSubmitBtn` (it might be defined later or earlier, usually earlier in definitions)

// Helper: Hex/RGBA mapping if needed, but we start with Chip's background
if (staticFeatureChips.length > 0) {
    // Helper to Trigger Context Switch Question
    async function triggerContextSwitchQuestion(category, apiKey) {
        if (!apiKey) return;

        // Show loading bubble
        const loadingMsg = addChatMessage("...", false);

        try {
            let systemPrompt = `You are a helpful design assistant named 'SKY'. The user has just switched their focus to the "${category}" perspective.\nAnalyze the screenshot and this new perspective. Generate a SINGLE, specific reflective question to help the user explore the design from the point of view of ${category}.`;

            // Include global custom instructions
            const customInstructions = localStorage.getItem('sky_custom_instructions');
            if (customInstructions) {
                systemPrompt += `\n\n[GLOBAL USER INSTRUCTIONS]:\n${customInstructions}`;
            }

            // Include Specific Persona Instructions
            let categoryPrompt = "";
            if (category === 'Funktionen') categoryPrompt = localStorage.getItem('sky_prompt_func');
            else if (category === 'Emotionen') categoryPrompt = localStorage.getItem('sky_prompt_emo');
            else if (category === 'Symbole') categoryPrompt = localStorage.getItem('sky_prompt_sym');

            if (categoryPrompt) {
                systemPrompt += `\n\n[CONTEXT SPECIFIC (${category.toUpperCase()}) INSTRUCTIONS]:\n${categoryPrompt}`;
            }

            const contents = {
                parts: [{ text: systemPrompt }]
            };

            // Add Image
            if (currentScreenshotData) {
                const base64Data = currentScreenshotData.replace(/^data:image\/\w+;base64,/, "");
                const mimeType = currentScreenshotData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0] || "image/png";
                contents.parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [contents] })
            });

            if (!response.ok) throw new Error(`API Error ${response.status}`);

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Was fällt dir dazu ein?";

            if (loadingMsg) loadingMsg.remove();
            addChatMessage(aiText, false);

        } catch (error) {
            console.error("Context Switch AI Error:", error);
            if (loadingMsg) loadingMsg.remove();
            // Silent fail or minimal message
            addChatMessage("Lass uns diesen Aspekt genauer betrachten.", false);
        }
    }

    staticFeatureChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Set all to inactive
            staticFeatureChips.forEach(c => {
                c.classList.add('inactive');
                c.classList.remove('active');
            });
            // Add to clicked
            chip.classList.remove('inactive');
            chip.classList.add('active');

            // Extract color from chip style
            // We use the computed style or the inline style we set
            currentAnnotationColor = chip.style.background;
            currentAnnotationCategory = chip.dataset.value; // Store category name
            console.log("Selected Feature:", currentAnnotationCategory, currentAnnotationColor);

            // Update Send Button
            if (finishCommentsBtn) {
                finishCommentsBtn.style.background = currentAnnotationColor;
            }

            // Update Annotation Submit Button (Plus)
            const submitBtn = document.getElementById('annotation-submit-btn'); // Grab Fresh
            if (submitBtn) {
                submitBtn.style.background = currentAnnotationColor;
            }

            // TRIGGER AI QUESTION ON SWITCH
            const isAIMode = localStorage.getItem('sky_ai_mode') === 'true';

            if (isAIMode) {
                const apiKey = localStorage.getItem('sky_api_key');
                triggerContextSwitchQuestion(currentAnnotationCategory, apiKey);
            } else {
                // Demo Mode
                setTimeout(() => {
                    const demoMsg = `[${currentAnnotationCategory} Persona]: Hier ist eine Frage basierend auf ${currentAnnotationCategory}?`;
                    addChatMessage(demoMsg, false);
                }, 500);
            }
        });
    });
}

function handleChatSend() {
    const text = chatInputReflect.value.trim();
    if (!text) return;
    addChatMessage(text, true);
    chatInputReflect.value = "";
    setTimeout(() => {
        const responses = [
            "Das ist ein interessanter Gedanke. Erzähl mir mehr darüber.",
            "Wie fühlst du dich dabei?",
            "Was würdest du beim nächsten Mal anders machen?",
            "Verstehe. Das klingt nach einem wichtigen Moment."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(randomResponse, false);
    }, 1000);
}

if (chatSendReflect && chatInputReflect) {
    chatSendReflect.addEventListener('click', handleChatSend);
    chatInputReflect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleChatSend();
    });
}



// Helper to set ignore mouse events
function setIgnoreMouseEvents(ignore, forward = false) {
    ipcRenderer.send('set-ignore-mouse-events', ignore, { forward });
}

// --- Chatbot Toggle Logic ---

if (reflectBtn) reflectBtn.addEventListener('click', () => {
    // Only restore hidden screenshots
    if (currentScreenshotData && !isModalOpen) {
        showScreenshotModal(null, null); // Restore view
    }
});

closeBtn.addEventListener('click', () => {
    isChatbotOpen = false;
    chatbot.classList.remove('visible');
});

// --- Mouse Event Handling for UI ---

// Function to check if mouse is over interactive elements
function isMouseOverUI(x, y) {
    if (isScreenshotMode || isModalOpen) return true;

    // Use elementFromPoint for robust detection
    const el = document.elementFromPoint(x, y);
    if (!el) return false;

    // Check if the element is an interactive part of our UI
    // We check for buttons, inputs, specific containers, or standard interactive elements
    if (el.closest('button') ||
        el.closest('input') ||
        el.closest('.glass-panel') ||
        el.closest('.action-bar') ||
        el.closest('#chatbot') ||
        el.closest('#dev-menu') ||
        el.closest('#dev-btn') ||
        el.closest('#orb-wrapper') ||
        el.closest('.segmented-control')) {
        return true;
    }

    return false;
}

// Global mouse move to handle click-through dynamically
window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if (isScreenshotMode) return; // Don't interfere during screenshot

    const overUI = isMouseOverUI(e.clientX, e.clientY);

    // Debug specific elements
    // const btnRect = reflectBtn.getBoundingClientRect();
    // if (e.clientX >= btnRect.left && e.clientX <= btnRect.right && e.clientY >= btnRect.top && e.clientY <= btnRect.bottom) {
    //    console.log('Over Reflect Button');
    // }

    if (overUI) {
        // console.log('Over UI - enabling mouse events');
        setIgnoreMouseEvents(false);
    } else {
        // console.log('Not over UI - ignoring mouse events');
        setIgnoreMouseEvents(true, true);
    }
});

// Cancel screenshot on Escape
window.addEventListener('keydown', (e) => {
    if (isScreenshotMode && e.key === 'Escape') {
        endScreenshotMode();
    }
});

// Toggle screenshot mode via IPC (Double Command)
ipcRenderer.on('toggle-screenshot', () => {
    if (isScreenshotMode) {
        endScreenshotMode();
    } else {
        startScreenshotMode();
    }
});

ipcRenderer.on('toggle-selection-icon', (event, isSelected) => {
    // Old indicator is hidden by default now

    const textSelectionPill = document.getElementById('text-selection-pill');
    if (!textSelectionPill) return;

    if (isSelected) {
        textSelectionPill.style.opacity = '1';
        textSelectionPill.style.transform = 'translateX(0) scale(1)';
    } else {
        textSelectionPill.style.opacity = '0';
        textSelectionPill.style.transform = 'translateX(20px) scale(0.9)';
    }
});

// --- Chat Input Logic ---

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !currentScreenshotData) return;

    // Add user message
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';

    let content = '';
    if (currentScreenshotData) {
        content += `<img src="${currentScreenshotData}" class="chat-thumbnail" /><br>`;
    }
    if (text) {
        content += `<span>${text}</span>`;
    }
    msgDiv.innerHTML = content;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Clear input and preview
    chatInput.value = '';
    clearScreenshotPreview();

    // Simulate AI response
    setTimeout(() => {
        const botDiv = document.createElement('div');
        botDiv.className = 'message bot';
        botDiv.innerText = 'Ich habe deine Nachricht erhalten! (Demo Modus)';
        chatMessages.appendChild(botDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
}

// --- Screenshot Logic ---

screenshotBtn.addEventListener('click', () => {
    startScreenshotMode();
});

removeScreenshotBtn.addEventListener('click', () => {
    clearScreenshotPreview();
});

function clearScreenshotPreview() {
    currentScreenshotData = null;
    previewImg.src = '';
    screenshotPreview.style.display = 'none';
}

function startScreenshotMode() {
    isScreenshotMode = true;

    // Hide UI
    chatbot.classList.remove('visible');

    // Show overlay
    selectionOverlay.style.display = 'block';

    // Show instruction pill
    const pill = document.getElementById('capture-instructions-pill');
    if (pill) {
        pill.style.opacity = '1';
        pill.style.transform = 'translateX(0) scale(1)';
    }

    // Capture all mouse events
    setIgnoreMouseEvents(false);

    // Fetch window bounds for highlighting
    ipcRenderer.invoke('get-window-bounds').then(fetchedWindows => {
        // Filter out our own overlay window if possible, or just all windows
        // We might want to filter out windows with 0 width/height or off-screen
        windows = fetchedWindows.filter(w => w.width > 0 && w.height > 0 && w.layer === 0); // Layer 0 is usually normal apps
        console.log('Windows fetched:', windows.length);
    });
}

function endScreenshotMode() {
    isScreenshotMode = false;

    // Hide instruction pill
    const pill = document.getElementById('capture-instructions-pill');
    if (pill) {
        pill.style.opacity = '0';
        pill.style.transform = 'translateX(20px) scale(0.9)';
    }

    // Hide overlay
    selectionOverlay.style.display = 'none';
    selectionBox.style.display = 'none';
    windowHighlight.style.display = 'none';
    currentHighlightedWindow = null;
    windows = [];

    // Restore UI
    if (isChatbotOpen) chatbot.classList.add('visible');

    // Reset mouse events based on current position
    if (isMouseOverUI(lastMouseX, lastMouseY)) {
        setIgnoreMouseEvents(false);
    } else {
        setIgnoreMouseEvents(true, true);
    }

    // Force a window refresh to ensure UI reappears
    ipcRenderer.send('refresh-window');
}

// Drag Selection
selectionOverlay.addEventListener('mousedown', (e) => {
    if (!isScreenshotMode) return;
    startX = e.clientX;
    startY = e.clientY;

    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
});

selectionOverlay.addEventListener('mousemove', (e) => {
    if (!isScreenshotMode || selectionBox.style.display === 'none') return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
});

// Handle window highlighting
selectionOverlay.addEventListener('mousemove', (e) => {
    if (!isScreenshotMode || selectionBox.style.display === 'block') {
        windowHighlight.style.display = 'none';
        return;
    }

    const x = e.clientX;
    const y = e.clientY;

    // Find top-most window under mouse
    // The list from CGWindowListCopyWindowInfo is usually ordered from front to back?
    // Actually, it depends. But let's assume the order we get is somewhat relevant or we just pick the first one that matches.
    // We filtered for Layer 0.

    // We need to find a window that contains (x, y)
    // Since we want the "top" one, and the list might be ordered, let's try finding the first match.
    // Note: The list from Swift script: kCGWindowListOptionOnScreenOnly returns windows in order from front to back.

    const found = windows.find(w => {
        return x >= w.x && x <= (w.x + w.width) &&
            y >= w.y && y <= (w.y + w.height);
    });

    if (found) {
        currentHighlightedWindow = found;
        windowHighlight.style.left = found.x + 'px';
        windowHighlight.style.top = found.y + 'px';
        windowHighlight.style.width = found.width + 'px';
        windowHighlight.style.height = found.height + 'px';
        windowHighlight.style.display = 'block';
    } else {
        currentHighlightedWindow = null;
        windowHighlight.style.display = 'none';
    }
});

selectionOverlay.addEventListener('mouseup', async (e) => {
    if (!isScreenshotMode) return;

    // Get final coordinates
    const rect = selectionBox.getBoundingClientRect();

    // Hide overlay immediately
    selectionOverlay.style.display = 'none';

    // Check if it was a drag selection (size > 10px to account for border and accidental drags)
    // A click results in 4x4px due to 2px border
    if (rect.width > 10 && rect.height > 10) {
        await captureScreen(rect);
    } else if (currentHighlightedWindow) {
        // Clicked without dragging (or very small drag), and a window was highlighted
        // Capture the window bounds
        console.log('Capturing window:', currentHighlightedWindow.name);
        await captureScreen({
            left: currentHighlightedWindow.x,
            top: currentHighlightedWindow.y,
            width: currentHighlightedWindow.width,
            height: currentHighlightedWindow.height
        });
    }

    endScreenshotMode();
});

async function captureScreen(rect) {
    try {
        console.log('Starting captureScreen...');
        ipcRenderer.send('log', 'Starting captureScreen...');

        // --- NEW: Clear previous annotations ---
        // 1. Remove markers from DOM
        const existingMarkers = document.querySelectorAll('.annotation-marker');
        existingMarkers.forEach(m => m.remove());

        // 2. Clear Queue
        console.log(`Clearing pending queue (size: ${pendingAnnotationsQueue.length})`);
        pendingAnnotationsQueue.length = 0;
        if (typeof updatePendingUI === 'function') {
            updatePendingUI();
        }
        // ------------------------------------

        // Use IPC to get sources from main process
        const sources = await ipcRenderer.invoke('get-sources');
        if (sources.length === 0) {
            alert('No screen sources found!');
            return;
        }

        // Assuming primary display for now
        const source = sources[0];

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: source.id,
                    minWidth: 1280,
                    maxWidth: 4000,
                    minHeight: 720,
                    maxHeight: 4000
                }
            }
        });

        const video = document.createElement('video');
        video.srcObject = stream;

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                try {
                    ipcRenderer.send('log', `Video loaded: ${video.videoWidth}x${video.videoHeight}`);

                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        alert('Error: Video stream has 0 dimensions.');
                        stream.getTracks().forEach(track => track.stop());
                        resolve();
                        return;
                    }

                    video.play();

                    // WAIT for the first frame to actually render!
                    setTimeout(() => {
                        try {
                            ipcRenderer.send('log', 'Capturing frame now...');

                            // Calculate scale factor (Physical Pixels / Logical CSS Pixels)
                            const scaleX = video.videoWidth / window.innerWidth;
                            const scaleY = video.videoHeight / window.innerHeight;

                            // Create canvas at NATIVE resolution (high DPI)
                            const outputWidth = rect.width * scaleX;
                            const outputHeight = rect.height * scaleY;

                            const canvas = document.createElement('canvas');
                            canvas.width = outputWidth;
                            canvas.height = outputHeight;
                            const ctx = canvas.getContext('2d');

                            // Draw the specific region mapping logical coords to physical coords
                            ctx.drawImage(video,
                                rect.left * scaleX, rect.top * scaleY, outputWidth, outputHeight, // Source (Physical)
                                0, 0, outputWidth, outputHeight // Destination (Physical)
                            );

                            // --- Capture Full Background for Blur ---
                            const fullCanvas = document.createElement('canvas');
                            fullCanvas.width = video.videoWidth;
                            fullCanvas.height = video.videoHeight;
                            const fullCtx = fullCanvas.getContext('2d');

                            // Draw full frame with explicit dimensions
                            fullCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

                            const bgDataURL = fullCanvas.toDataURL('image/png');
                            ipcRenderer.send('log', `Captured Bg Length: ${bgDataURL.length}`);

                            const dataURL = canvas.toDataURL('image/png');

                            // Stop video stream
                            stream.getTracks().forEach(track => track.stop());

                            // Show result in modal
                            showScreenshotModal(dataURL, bgDataURL);
                            resolve();
                        } catch (innerErr) {
                            console.error(innerErr);
                            ipcRenderer.send('log', 'Inner Capture Error: ' + innerErr.message);
                            resolve();
                        }
                    }, 300); // 300ms delay

                } catch (e) {
                    console.error(e);
                    alert('Capture error: ' + e.message);
                    resolve();
                }
            };
            video.onerror = (e) => reject(e);
        });

    } catch (e) {
        console.error('Error capturing screen:', e);
        ipcRenderer.send('log', 'Outer Capture Error: ' + e.message);
        alert('Error capturing screen: ' + e.message + '\nCheck permissions in System Settings -> Privacy & Security -> Screen Recording');
    }
}

const screenshotModal = document.getElementById('screenshot-result-modal');
const resultImg = document.getElementById('result-img');

// --- Screenshot Modal Logic ---
const deleteBtn = document.getElementById('delete-btn');
const hideBtn = document.getElementById('hide-btn');

if (deleteBtn) {
    let deleteTimer = null;

    // Hold to Delete Logic (0.5s)
    deleteBtn.addEventListener('mousedown', () => {
        deleteBtn.classList.add('holding-esc'); // Reuse CSS animation
        deleteTimer = setTimeout(() => {
            deleteAndCloseModal();
            deleteBtn.classList.remove('holding-esc');
            deleteTimer = null;
        }, 500);
    });

    const cancelDelete = () => {
        if (deleteTimer) {
            clearTimeout(deleteTimer);
            deleteTimer = null;
            deleteBtn.classList.remove('holding-esc');
        }
    };

    deleteBtn.addEventListener('mouseup', cancelDelete);
    deleteBtn.addEventListener('mouseleave', cancelDelete);
}

if (hideBtn) {
    hideBtn.addEventListener('click', () => {
        hideScreenshotModal();
    });
}

// Click on background (desktop) to HIDE without deleting
screenshotModal.addEventListener('click', (e) => {
    // Determine if click is on the background (backdrop)
    if (e.target === screenshotModal || e.target.id === 'modal-anchor') {
        hideScreenshotModal();
    }
});

function showScreenshotModal(dataURL, bgDataURL) {
    // If data provided, update. If not (restoring), just show.
    if (dataURL) {
        // FORCE RESET UI
        const _pSwitch = document.getElementById("panel-step-switch");
        const _sContent = document.getElementById("start-state-content");
        const _rHeader = document.getElementById("reflection-header");
        const _mInput = document.getElementById("main-chat-input-wrapper");
        const _sInput = document.getElementById("start-input");
        const _cMsgs = document.getElementById("reflection-chat-messages");
        const _rTopic = document.getElementById("reflection-topic-text");

        if (_pSwitch) _pSwitch.style.visibility = "hidden";
        if (_sContent) _sContent.style.display = "flex";
        if (_rHeader) _rHeader.style.display = "none";
        if (_mInput) _mInput.style.display = "none";
        if (_sInput) _sInput.value = "";
        if (_rTopic) _rTopic.innerText = "";

        if (_cMsgs) {
            Array.from(_cMsgs.children).forEach(child => {
                if (child.id !== "start-state-content") {
                    _cMsgs.removeChild(child);
                }
            });
        }

        // Ensure Annotations are cleared (Redundant safety)
        const markers = document.querySelectorAll('.annotation-marker');
        markers.forEach(marker => marker.remove());
        pendingAnnotationsQueue.length = 0;
        if (typeof updatePendingUI === 'function') updatePendingUI();

        // Clear Attributes List
        const attributesList = document.getElementById('attributes-list');
        if (attributesList) attributesList.innerHTML = '';

        // Hide Static Chips (Reset to Start State)
        const staticChips = document.getElementById('static-chips-container');
        if (staticChips) staticChips.style.display = 'none';

        resultImg.src = dataURL;
        currentScreenshotData = dataURL; // Update global state

        // FORCE VIEW SWITCH to "Reflektionsdialog"
        // Reset Segment Buttons
        const segments = document.querySelectorAll('.segment-btn');
        segments.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.target === 'view-reflection') {
                btn.classList.add('active');
            }
        });

        // Reset Views
        const views = document.querySelectorAll('.panel-view');
        views.forEach(view => {
            view.classList.remove('active-view');
            if (view.id === 'view-reflection') {
                view.classList.add('active-view');
            }
        });

        // Hide Right Panel for Reflection View
        const rPanel = document.getElementById('right-panel');
        if (rPanel) rPanel.style.visibility = 'hidden';
    }

    // Set background image
    if (bgDataURL && modalBgImage) {
        modalBgImage.src = bgDataURL;
        modalBgImage.style.filter = `blur(${currentBlurRadius}px) brightness(0.9)`;
        modalBgImage.style.webkitFilter = `blur(${currentBlurRadius}px) brightness(0.9)`;
        modalBgImage.style.opacity = '0';
        modalBgImage.style.display = 'block';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalBgImage.style.opacity = '1';
            });
        });
    }

    screenshotModal.style.display = 'flex'; // Use flex to center
    isModalOpen = true;
    setIgnoreMouseEvents(false); // Enable interaction for the modal
    ipcRenderer.send('set-vibrancy', null);

    // Auto-scroll logic
    if (screenshotsContainer) {
        setTimeout(() => {
            screenshotsContainer.scrollTop = screenshotsContainer.scrollHeight;
        }, 50);
    }
}

function hideScreenshotModal() {
    screenshotModal.style.display = 'none';
    isModalOpen = false;
    // Restore click-through state
    setIgnoreMouseEvents(true, true);
    ipcRenderer.send('set-vibrancy', null);

    // Does NOT clear screenshots
}

function deleteAndCloseModal() {
    // Force clear chat UI state
    const _sContent = document.getElementById("start-state-content");
    const _cMsgs = document.getElementById("reflection-chat-messages");
    const _pSwitch = document.getElementById("panel-step-switch");
    const _rHeader = document.getElementById("reflection-header");
    const _mInput = document.getElementById("main-chat-input-wrapper");
    const _rTopic = document.getElementById("reflection-topic-text");

    if (_sContent) _sContent.style.display = "flex";
    if (_pSwitch) _pSwitch.style.visibility = "hidden"; // Reset switch visibility
    if (_rHeader) _rHeader.style.display = "none";      // Reset header
    if (_mInput) _mInput.style.display = "none";        // Reset input wrapper

    const staticChips = document.getElementById('static-chips-container');
    if (staticChips) staticChips.style.display = 'none';

    // Clear Attributes List
    const attributesList = document.getElementById('attributes-list');
    if (attributesList) attributesList.innerHTML = '';

    if (_rTopic) _rTopic.innerText = "";                // Clear topic

    if (_cMsgs) {
        Array.from(_cMsgs.children).forEach(child => {
            if (child.id !== "start-state-content") _cMsgs.removeChild(child);
        });
    }
    screenshotModal.style.display = 'none';
    resultImg.src = '';
    currentScreenshotData = null; // Clear state

    // Clear combined screenshots (keep Spacer and first resultImg)
    if (screenshotsContainer) {
        // We need to keep the spacer (first child) and the screenshot-wrapper (second child)
        // Actually screenshot-wrapper contains resultImg. 
        // Initial structure: spacer, screenshot-wrapper.
        // Any extra combined screenshots are appended after.
        while (screenshotsContainer.children.length > 2) {
            screenshotsContainer.removeChild(screenshotsContainer.lastChild);
        }
    }

    // Clear Annotations
    const markers = document.querySelectorAll('.annotation-marker');
    markers.forEach(marker => marker.remove());

    // Clear Pending Queue
    pendingAnnotationsQueue.length = 0;
    if (typeof updatePendingUI === 'function') {
        updatePendingUI();
    }

    if (modalBgImage) {
        modalBgImage.style.opacity = '0';
        setTimeout(() => {
            if (screenshotModal.style.display === 'none') {
                modalBgImage.style.display = 'none';
            }
        }, 400);
    }

    isModalOpen = false;
    setIgnoreMouseEvents(true, true);
    ipcRenderer.send('set-vibrancy', null);
}

// --- Smooth Scroll Helper (Faster than native) ---
function fastScrollTo(container, targetY, duration = 300) {
    const startY = container.scrollTop;
    const diff = targetY - startY;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);

        container.scrollTop = startY + (diff * ease);

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

// --- Global Annotation State --
const pendingAnnotationsQueue = [];
let updatePendingUI = () => { }; // Placeholder until DOM loaded

document.addEventListener("DOMContentLoaded", () => {
    // --- Annotation Logic (Fresh Implementation) ---
    const _scrWrapper = document.getElementById("screenshot-wrapper");
    const annotationInputContainer = document.getElementById("annotation-input-box");
    const annotationInput = document.getElementById("annotation-text");
    const annotationSubmitBtn = document.getElementById("annotation-submit-btn");

    // --- Dev Tools Logic ---
    const openDevToolsBtn = document.getElementById('open-devtools-btn');
    if (openDevToolsBtn) {
        openDevToolsBtn.addEventListener('click', () => {
            console.log("Opening DevTools...");
            ipcRenderer.send('open-devtools');
        });
    }

    const openInspectorBtn = document.getElementById('open-inspector-btn');
    if (openInspectorBtn) {
        openInspectorBtn.addEventListener('click', () => {
            ipcRenderer.send('open-devtools');
        });
    }

    // --- Dev Tools Logic ---
    const blurSlider = document.getElementById('blur-slider');
    const blurVal = document.getElementById('blur-val');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    if (blurSlider && blurVal) {
        blurSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            blurVal.innerText = val + "px";
            ipcRenderer.send('update-blur', val);
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }

    // State
    let pendingX = 0;
    let pendingY = 0;

    if (_scrWrapper) {
        // Ensure wrapper has positioning context
        _scrWrapper.style.position = 'relative';
        _scrWrapper.style.display = 'inline-block';

        _scrWrapper.addEventListener("click", (e) => {
            // Restriction: Only allow annotations if we are in the Reflection View (Index 0)
            if (getCenteredScreenshotIndex() !== 0) return;

            const mainWrapper = document.getElementById("main-chat-input-wrapper");
            // Check if we are in "annotation mode" (panel visible)
            // Or if we just want it always active when modal is open? 
            // User flow: Click screenshot -> Add comment. This implies modal IS open.
            // The mainWrapper check might strictly require the side panel to be open.
            if (!mainWrapper || mainWrapper.style.display === "none") return;

            // Ignore clicks on existing markers
            if (e.target.closest(".annotation-marker")) return;

            // Calculate Position relative to the wrapper
            if (e.target.tagName === 'IMG') {
                pendingX = e.offsetX;
                pendingY = e.offsetY;
            } else {
                // Fallback if clicked on wrapper (padding areas)
                const rect = _scrWrapper.getBoundingClientRect();
                pendingX = e.clientX - rect.left;
                pendingY = e.clientY - rect.top;
            }

            console.log(`Annotation Click: ${pendingX}, ${pendingY}`);
            ipcRenderer.send('log', `Annotation Click Request at: ${pendingX}, ${pendingY}`);

            // Show Input Box at Mouse Position (Absolute on screen)
            if (annotationInputContainer) {
                // Ensure it's visible
                annotationInputContainer.style.display = "flex";

                // Position logic:
                // The box has `transform: translateY(-100%); margin-top: -10px;` (Added in HTML)
                // This means the "bottom" of the box is at `top`.
                // The arrow is at `left: 12px`.
                // We want that arrow tip to be at `e.clientX`.
                // So we should shift the box `left` by `12px + 6px (half arrow)` approx.
                // Let's shift left by 15px.

                annotationInputContainer.style.left = (e.clientX - 15) + "px";
                annotationInputContainer.style.top = e.clientY + "px";

                if (annotationInput) {
                    annotationInput.value = "";
                    setTimeout(() => annotationInput.focus(), 50);
                }
            }
        });
    }

    const pendingContainer = document.getElementById("pending-annotations-container");
    const pendingPlaceholder = document.getElementById("pending-placeholder");

    // Assign to Global (defined earlier)
    updatePendingUI = () => {
        const container = document.getElementById("pending-annotations-container");
        const placeholder = document.getElementById("pending-placeholder");
        if (!container) return;

        // Clear only chips, keep placeholder
        // Actually, we can just clear innerHTML and re-append placeholder if needed,
        // or safer: select chips and remove them.
        // Let's clear innerHTML and re-add placeholder if empty, or manage placeholder visibility.

        // Simpler approach: Clear all, re-add placeholder if empty, add chips if not.
        container.innerHTML = "";

        if (pendingAnnotationsQueue.length === 0) {
            // Show placeholder
            if (placeholder) {
                placeholder.style.display = "block";
                container.appendChild(placeholder);
            } else {
                // Re-create if missing (unlikely if we just cleared, wait. 
                // Using .innerHTML = "" destroys the placeholder element if it was a child!)
                // Better approach: Don't destroy placeholder.

                // create placeholder if doesn't exist in DOM (it was destroyed)
                const newPlaceholder = document.createElement("div");
                newPlaceholder.id = "pending-placeholder";
                newPlaceholder.style.cssText = "font-size: 13px; color: var(--text-muted); font-style: italic; padding-left: 5px; word-break: break-word;";
                newPlaceholder.innerText = "Klicke auf eine Stelle auf dem Bild, um eine Antwort zu verfassen.";
                container.appendChild(newPlaceholder);
            }
        } else {
            // Add Chips
            pendingAnnotationsQueue.forEach((item) => {
                const chip = document.createElement("div");
                chip.className = "annotation-chip";
                chip.innerText = item.text;
                if (item.color) {
                    chip.style.background = item.color.replace('0.8', '0.25'); // Approx lighter bg
                    chip.style.borderColor = item.color.replace('0.8', '0.6'); // Approx border
                    chip.style.color = item.color.replace('0.8', '1'); // 100% Opacity Text
                }

                // Close Button (X)
                const closeBtn = document.createElement("div");
                closeBtn.className = "chip-close-btn";
                closeBtn.innerText = "✕";

                // DELETION LOGIC
                closeBtn.addEventListener("click", (e) => {
                    e.stopPropagation(); // Prevent bubbling if needed

                    // 1. Remove from Queue
                    const index = pendingAnnotationsQueue.indexOf(item);
                    if (index > -1) {
                        pendingAnnotationsQueue.splice(index, 1);
                    }

                    // 2. Remove Marker from DOM
                    // We need to find the marker with the same ID/Index or data
                    // Markers have innerText equal to their 'id' (count) usually, but safer to track via ID.
                    // The queue item has 'id'.
                    const markerToDelete = Array.from(document.querySelectorAll('.annotation-marker'))
                        .find(m => m.innerText == item.id);

                    if (markerToDelete) {
                        markerToDelete.remove();
                    }

                    // 3. Refresh UI
                    updatePendingUI();
                });

                chip.appendChild(closeBtn);
                container.appendChild(chip);
            });
        }

        // ALWAYS show container to keep button right-aligned
        container.style.display = "flex";

        const chatWrapper = document.getElementById("main-chat-input-wrapper");
        if (chatWrapper) {
            // Keep rounded corners consistent or adjust if needed. 
            // Previous code changed radius. Let's keep it consistent "text field" look.
            // If we want it to look like an input, we usually don't change radius dynamically 
            // unless it expands downwards.
            chatWrapper.style.borderRadius = "26px";
        }

        // TOGGLE STATIC CHIPS VISIBILITY BASED ON QUEUE
        const staticChips = document.querySelectorAll('.static-chip');
        if (pendingAnnotationsQueue.length > 0) {
            // Hide inactive chips
            staticChips.forEach(chip => {
                if (!chip.classList.contains('active')) {
                    chip.style.display = 'none';
                }
            });
        } else {
            // Show all chips (restricted by parent visibility)
            staticChips.forEach(chip => {
                chip.style.display = 'flex';
            });
        }
    };

    function addMarker() {
        if (!annotationInput) return;
        const text = annotationInput.value.trim();

        if (!text) {
            if (annotationInputContainer) annotationInputContainer.style.display = "none";
            return;
        }

        const count = document.querySelectorAll(".annotation-marker").length + 1;
        const marker = document.createElement("div");
        marker.className = "annotation-marker";
        marker.innerText = count;
        marker.style.background = currentAnnotationColor; // Apply selected color to marker

        // ABSOLUTE POSITIONING RELATIVE TO WRAPPER
        marker.style.position = 'absolute';
        marker.style.left = pendingX + "px";
        marker.style.top = pendingY + "px";
        marker.style.zIndex = '100';
        marker.style.cursor = 'help';

        // Tooltip Logic
        marker.addEventListener('mouseenter', () => {
            const tooltip = document.getElementById("annotation-tooltip");
            if (tooltip) {
                tooltip.innerText = text;
                const rect = marker.getBoundingClientRect();
                tooltip.style.left = (rect.left + rect.width / 2) + "px";
                tooltip.style.top = (rect.top - 30) + "px";
                tooltip.style.transform = "translateX(-50%)";
                tooltip.style.display = 'block';
            }
        });

        marker.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById("annotation-tooltip");
            if (tooltip) tooltip.style.display = 'none';
        });

        ipcRenderer.send('log', `Adding marker #${count} at ${pendingX},${pendingY}`);
        if (_scrWrapper) _scrWrapper.appendChild(marker);

        // Calculate Normalized Position (%)
        let xPct = 0, yPct = 0;
        if (_scrWrapper && _scrWrapper.offsetWidth > 0 && _scrWrapper.offsetHeight > 0) {
            xPct = Math.round((pendingX / _scrWrapper.offsetWidth) * 100);
            yPct = Math.round((pendingY / _scrWrapper.offsetHeight) * 100);
        }

        // Add to Queue with Color & Position
        pendingAnnotationsQueue.push({
            id: count,
            text: text,
            color: currentAnnotationColor,
            x: xPct,
            y: yPct
        });
        updatePendingUI();

        // Add to Attributes List (Layer Panel)
        addAttributeItem(text, currentAnnotationColor);

        if (annotationInputContainer) annotationInputContainer.style.display = "none";
    }

    // Helper to Add Attribute Item
    function addAttributeItem(text, color) {
        const list = document.getElementById('attributes-list');
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'attribute-item';

        // Circle
        const circle = document.createElement('div');
        circle.className = 'attr-circle';
        circle.style.background = color; // Uses rgba string directly

        // Text
        const span = document.createElement('span');
        span.className = 'attr-text';
        span.innerText = text;

        item.appendChild(circle);
        item.appendChild(span);

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'attr-checkbox';

        // Handle Checkbox Selection
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
            updateRightPanel();
        });

        // Also allow clicking the row to toggle (optional, but requested behavior specific to checkbox was "checkbox selects")
        // But usually row click might be useful. The user specifically asked for "checkbox at the end".
        // Let's stick to checkbox for activation as requested.

        item.appendChild(checkbox);
        list.appendChild(item);
    }

    // --- Right Panel Logic (Attribute Cards) ---
    function updateRightPanel() {
        const selectedItems = document.querySelectorAll('.attribute-item.selected');
        const count = selectedItems.length;

        const header = document.getElementById('right-panel-header');
        const content = document.getElementById('right-panel-content');

        if (header) {
            header.innerText = count === 0
                ? "Kein Attribut ausgewählt"
                : `${count} Attribut${count !== 1 ? 'e' : ''} ausgewählt`;
        }

        if (content) {
            if (count === 0) {
                // Show Empty State
                content.innerHTML = `
                    <span class="material-icons" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;">layers</span>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">Wähle links Attribute aus,<br>um sie hier kombinieren zu können.</p>
                `;
                content.style.justifyContent = 'center';
                content.style.alignItems = 'center';
            } else {
                content.innerHTML = '';
                content.style.justifyContent = 'flex-start'; // Align top
                content.style.alignItems = 'stretch';

                const listContainer = document.createElement('div');
                listContainer.style.cssText = "width: 100%; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-bottom: 20px;"; // Padding for scroll

                selectedItems.forEach((item, index) => {
                    const text = item.querySelector('.attr-text').innerText;
                    const circle = item.querySelector('.attr-circle');
                    const color = circle ? circle.style.background : '#fff';
                    const itemId = `card-${index}`; // Simple ID based on selection order

                    // Card Container
                    const card = document.createElement('div');
                    card.className = 'attribute-card';

                    // Header
                    const headerDiv = document.createElement('div');
                    headerDiv.className = 'card-header';

                    const dot = document.createElement('div');
                    dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 5px ${color}; flex-shrink: 0;`;

                    const titleSpan = document.createElement('span');
                    titleSpan.style.cssText = "font-size: 13px; color: var(--text-primary); font-weight: 500; word-break: break-all;";
                    titleSpan.innerText = text;
                    titleSpan.className = 'card-title-text';

                    headerDiv.appendChild(dot);
                    headerDiv.appendChild(titleSpan);

                    // Actions
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'card-actions';

                    const invertBtn = document.createElement('button');
                    invertBtn.className = 'card-btn';
                    invertBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">swap_horiz</span> Invertieren';

                    const expandBtn = document.createElement('button');
                    expandBtn.className = 'card-btn';
                    expandBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">expand_more</span> Erweitern';

                    actionsDiv.appendChild(invertBtn);
                    actionsDiv.appendChild(expandBtn);

                    // Expand Area
                    const inputArea = document.createElement('div');
                    inputArea.className = 'card-input-area';
                    const inputField = document.createElement('input');
                    inputField.type = 'text';
                    inputField.className = 'card-input';
                    inputField.placeholder = 'Weitere Anmerkung...';
                    inputArea.appendChild(inputField);

                    // --- Logic ---

                    // EXPAND Logic
                    expandBtn.addEventListener('click', () => {
                        if (inputArea.style.display === 'block') {
                            inputArea.style.display = 'none';
                            expandBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">expand_more</span> Erweitern';
                        } else {
                            inputArea.style.display = 'block';
                            expandBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">expand_less</span> Einklappen';
                            setTimeout(() => inputField.focus(), 100);
                        }
                    });

                    // INVERT Logic (Demo Mode)
                    let isInverted = false;

                    invertBtn.addEventListener('click', () => {
                        isInverted = !isInverted;

                        if (isInverted) {
                            // Apply Inversion
                            const lowerText = text.toLowerCase();
                            let invertedText = "Gegenteil";

                            if (lowerText.includes("hell")) invertedText = "Dunkel";
                            else if (lowerText.includes("dunkel")) invertedText = "Hell";
                            else if (lowerText.includes("groß")) invertedText = "Klein";
                            else if (lowerText.includes("klein")) invertedText = "Groß";
                            else if (lowerText.includes("fröhlich")) invertedText = "Traurig";
                            else if (lowerText.includes("rund")) invertedText = "Eckig";
                            else invertedText = "Nicht " + text;

                            // Visual Update
                            titleSpan.innerHTML = `${text} <span class="material-icons" style="font-size: 12px; margin: 0 4px; color: #888;">arrow_forward</span> <span style="color: #FF9500; font-weight: 700;">${invertedText}</span>`;

                            // Button State: Active
                            invertBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">undo</span> Rückgängig';
                            invertBtn.style.background = 'rgba(255, 149, 0, 0.2)'; // Orange tint
                            invertBtn.style.borderColor = 'rgba(255, 149, 0, 0.5)';
                            invertBtn.style.color = '#FF9500';
                        } else {
                            // Revert Inversion
                            titleSpan.innerText = text; // Reset text

                            // Button State: Default
                            invertBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">swap_horiz</span> Invertieren';
                            invertBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                            invertBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            invertBtn.style.color = 'rgba(255, 255, 255, 0.8)';
                        }
                    });

                    card.appendChild(headerDiv);
                    card.appendChild(actionsDiv);
                    card.appendChild(inputArea);
                    listContainer.appendChild(card);
                });

                content.appendChild(listContainer);
            }
        }
    }

    if (annotationSubmitBtn) {
        annotationSubmitBtn.addEventListener("click", addMarker);
    }

    if (annotationInput) {
        annotationInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") addMarker();
            if (e.key === "Escape") {
                if (annotationInputContainer) annotationInputContainer.style.display = "none";
            }
        });
    }

    // --- Combine Attributes / Generate Button ---
    const generateBtn = document.getElementById('generate-paste-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            const screenshotsContainer = document.getElementById('screenshots-container');
            const resultImg = document.getElementById('result-img');

            if (screenshotsContainer && resultImg) {
                // Count existing version blocks to determine next version
                const existingBlocks = document.querySelectorAll('.version-2-block');
                const nextVersion = existingBlocks.length + 2; // Start at 2 (0 blocks = Version 2)

                const block = document.createElement('div');
                block.className = 'version-2-block';
                block.innerText = `Version ${nextVersion}`;

                // Match dimensions of the screenshot
                const rect = resultImg.getBoundingClientRect();

                // Ensure we have valid dimensions
                if (rect.width > 0 && rect.height > 0) {
                    block.style.width = rect.width + 'px';
                    block.style.height = rect.height + 'px';
                } else {
                    // Fallback if image isn't rendered/visible yet for some reason
                    // Try formatted style or natural dimensions
                    block.style.width = (resultImg.naturalWidth || 600) + 'px';
                    block.style.height = (resultImg.naturalHeight || 400) + 'px';
                }

                screenshotsContainer.appendChild(block);

                // Scroll to make it visible (optional, but requested "pushes screenshot up")
                // Adding content below naturally pushes up if scrolled to bottom.
                // Using 'center' because the container has large padding and snap-align: center
                setTimeout(() => {
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100); // Small delay to ensure layout update
            }
        });
    }

    const finishBtn = document.getElementById("finish-comments-btn");

    // Helper to call Google Gemini API
    async function callGemini(comments, apiKey) {
        if (!apiKey) {
            addChatMessage("Error: No API Key provided in settings.", false);
            return;
        }

        let systemPrompt = "You are a helpful design assistant named 'SKY'. The user is showing you a screenshot of their work and adding specific comments/annotations. Your goal is to reflect on these comments, offer insights, design critiques, or helpful suggestions. Be concise, friendly, and professional.";

        // Add Custom Instructions (Global)
        const customInstructions = localStorage.getItem('sky_custom_instructions');
        if (customInstructions) {
            systemPrompt += `\n\n[GLOBAL USER INSTRUCTIONS]:\n${customInstructions}`;
        }

        // Add Category-Specific Persona
        let categoryPrompt = "";
        if (currentAnnotationCategory === 'Funktionen') {
            categoryPrompt = localStorage.getItem('sky_prompt_func');
        } else if (currentAnnotationCategory === 'Emotionen') {
            categoryPrompt = localStorage.getItem('sky_prompt_emo');
        } else if (currentAnnotationCategory === 'Symbole') {
            categoryPrompt = localStorage.getItem('sky_prompt_sym');
        }

        if (categoryPrompt) {
            systemPrompt += `\n\n[CONTEXT SPECIFIC (${currentAnnotationCategory.toUpperCase()}) INSTRUCTIONS]:\n${categoryPrompt}`;
        } else {
            // Fallback defaults if empty?
            if (currentAnnotationCategory === 'Funktionen') {
                systemPrompt += `\n\n[CONTEXT]: The user is focusing on FUNCTIONALITY. Ask about usability, logic, and user flow.`;
            } else if (currentAnnotationCategory === 'Emotionen') {
                systemPrompt += `\n\n[CONTEXT]: The user is focusing on EMOTIONS. Ask about how the design feels, the atmosphere, and user sentiment.`;
            } else if (currentAnnotationCategory === 'Symbole') {
                systemPrompt += `\n\n[CONTEXT]: The user is focusing on SYMBOLS/MEANING. Ask about semiotics, associations, and what the visual elements represent.`;
            }
        }

        let userContent = "Here are my annotations on the attached screenshot:\n\n";
        comments.forEach(c => {
            const posStr = (c.x !== undefined && c.y !== undefined)
                ? `(at X:${c.x}%, Y:${c.y}%)`
                : "";
            userContent += `Annotation #${c.id} ${posStr}: ${c.text}\n`;
        });

        const contents = {
            parts: [
                { text: systemPrompt + "\n\n" + userContent }
            ]
        };

        // Add Image if available (Gemini Multimodal)
        if (currentScreenshotData) {
            // Strip data header "data:image/png;base64,"
            const base64Data = currentScreenshotData.replace(/^data:image\/\w+;base64,/, "");
            const mimeType = currentScreenshotData.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)[0] || "image/png";

            contents.parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                }
            });
        }

        // Show loading bubble using standard UI function
        const loadingMsg = addChatMessage("...", false);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
            ipcRenderer.send('log', `[AI] Calling URL: ${url}`);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [contents]
                })
            });

            ipcRenderer.send('log', `[AI] Response Status: ${response.status}`);

            if (!response.ok) {
                const err = await response.json();
                ipcRenderer.send('log', `[AI] Error Body: ${JSON.stringify(err)}`);
                throw new Error(err.error?.message || `API Error ${response.status}`);
            }

            const data = await response.json();
            ipcRenderer.send('log', `[AI] Success Body: ${JSON.stringify(data)}`);

            // Parse Gemini Response
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";

            // Update loading message
            if (loadingMsg) {
                loadingMsg.remove();
            }
            addChatMessage(aiText, false);

        } catch (error) {
            console.error("AI Error:", error);
            ipcRenderer.send('log', `[AI] Exception: ${error.message}`);

            if (loadingMsg) {
                loadingMsg.remove();
            }
            addChatMessage(`Error: ${error.message}`, false);
        }
    }

    if (finishBtn) {
        finishBtn.addEventListener("click", () => {
            if (pendingAnnotationsQueue.length === 0) {
                addChatMessage("Bitte füge zuerst Kommentare hinzu.", false);
                return;
            }

            // 1. Batch send user messages
            const currentComments = [...pendingAnnotationsQueue]; // Copy for passing to AI
            pendingAnnotationsQueue.forEach(item => {
                addChatMessage(item.text, true, item.color);
            });

            // Clear Queue UI
            pendingAnnotationsQueue.length = 0;
            updatePendingUI();

            // 2. Check AI Mode
            const isAIMode = localStorage.getItem('sky_ai_mode') === 'true';
            const apiKey = localStorage.getItem('sky_api_key');

            if (isAIMode) {
                // Call Google Gemini
                callGemini(currentComments, apiKey);
            } else {
                // Demo Mode
                setTimeout(() => {
                    addChatMessage("Spannende Punkte! Ich habe deine Reflektion gespeichert. (Demo Modus)", false);
                }, 500);
            }
        });
    }
});