// src/fullpage.js - Entry point for the fullpage view
// This file is processed by the bundler and imported by fullpage.html

// State management
const state = {
  wardrobe: [],
  outfits: [],
  currentTab: 'wardrobe-tab',
  filteredCategory: 'all',
  searchQuery: '',
  itemSelectionType: null,
  selectedOutfitItems: {
    tops: null,
    bottoms: null,
    shoes: null,
    outerwear: null
  },
  // AI outfit generator state
  aiOutfitGenerator: {
    isGenerating: false,
    lastResult: null,
    selectedCategories: ['tops', 'bottoms', 'shoes'],
    occasion: 'casual',
    weather: 'neutral',
    style: 'everyday',
    apiKey: ''
  }
};

// DOM elements
let elements = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Virtual Closet Full Page loaded');
  
  // Load AI outfit service script
  loadAIService();
  
  // Get DOM elements
  cacheDOM();
  
  // Load data
  loadWardrobe();
  loadOutfits();
  loadAISettings();
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for messages from background script
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'wardrobeUpdated') {
        console.log('Received wardrobe update notification');
        state.wardrobe = message.wardrobe;
        renderWardrobe();
      }
    });
  }
});

// Load the AI outfit service script
function loadAIService() {
  if (chrome && chrome.runtime) {
    const scriptUrl = chrome.runtime.getURL('ai-outfit-service.js');
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onload = () => {
      console.log('AI outfit service loaded');
    };
    document.head.appendChild(script);
  }
}

// Cache DOM elements for better performance
function cacheDOM() {
  elements = {
    // Navigation
    tabs: {
      wardrobe: document.getElementById('wardrobe-tab'),
      outfit: document.getElementById('outfit-tab'),
      add: document.getElementById('add-tab')
    },
    views: {
      wardrobe: document.getElementById('wardrobe-view'),
      outfits: document.getElementById('outfits-view'),
      add: document.getElementById('add-view')
    },
    
    // Wardrobe
    wardrobeContainer: document.getElementById('wardrobe-container'),
    searchInput: document.getElementById('search-wardrobe'),
    categoryFilter: document.getElementById('category-filter'),
    
    // Outfits
    outfitsContainer: document.getElementById('outfits-container'),
    createOutfitBtn: document.getElementById('create-outfit-btn'),
    outfitCreator: document.getElementById('outfit-creator')
  };
  
  // Create AI outfit generator UI if it doesn't exist
  createAIOutfitUI();
}

function createAIOutfitUI() {
  // Only create the UI if we're in fullpage mode
  const isFullPage = document.body.clientWidth > 500; // Popup is typically smaller
  
  if (!isFullPage) {
    console.log('AI outfit generator is only available in full page mode');
    return;
  }
  
  // First check if the outfits header exists
  const outfitsHeader = document.querySelector('.outfits-header');
  if (!outfitsHeader) return;
  
  // Add AI generate button next to "Create New Outfit"
  const aiGenerateButton = document.createElement('button');
  aiGenerateButton.id = 'ai-generate-outfit-btn';
  aiGenerateButton.className = 'primary-button';
  aiGenerateButton.innerHTML = 'AI Generate Outfit';
  
  // Insert after create outfit button
  outfitsHeader.appendChild(aiGenerateButton);
  
  // Create the AI outfit generator panel with simplified UI
  const aiOutfitPanel = document.createElement('div');
  aiOutfitPanel.id = 'ai-outfit-generator';
  aiOutfitPanel.className = 'hidden';
  aiOutfitPanel.innerHTML = `
    <div class="outfit-creator-header">
      <h3>AI Outfit Generator</h3>
      <button id="close-ai-generator" class="icon-button">×</button>
    </div>
    
    <div class="ai-generator-content">
      <div class="form-group">
        <label for="ai-prompt">Describe the outfit you want</label>
        <textarea id="ai-prompt" placeholder="Example: Create a business casual outfit for a rainy day that looks professional but comfortable" rows="4"></textarea>
        <small class="prompt-hint">Be as specific as you'd like about occasion, weather, style, or any other preferences.</small>
      </div>
      
      <div class="form-actions">
        <button id="generate-ai-outfit" class="primary-button">Generate Outfit</button>
        <button id="cancel-ai-outfit" class="secondary-button">Cancel</button>
      </div>
      
      <div id="ai-generator-result" class="hidden">
        <h4>Generated Outfit</h4>
        <div class="ai-outfit-preview">
          <!-- Will be populated with outfit items -->
        </div>
        <p class="ai-outfit-reasoning"></p>
        
        <div class="form-group">
          <label for="ai-outfit-name">Outfit Name</label>
          <input type="text" id="ai-outfit-name" placeholder="Enter a name for this outfit">
        </div>
        
        <div class="form-actions">
          <button id="save-ai-outfit" class="primary-button">Save This Outfit</button>
          <button id="regenerate-outfit" class="secondary-button">Regenerate</button>
        </div>
      </div>
      
      <div id="ai-generator-error" class="message error hidden">
        <!-- Error message will appear here -->
      </div>
      
      <div id="ai-generator-loading" class="hidden">
        <div class="loading-spinner"></div>
        <p>Generating your perfect outfit...</p>
      </div>
    </div>
  `;
  
  // Add to the outfits section
  const outfitsView = document.getElementById('outfits-view');
  if (outfitsView) {
    outfitsView.appendChild(aiOutfitPanel);
  
    // Update the elements object
    elements.aiGenerateBtn = aiGenerateButton;
    elements.aiOutfitPanel = aiOutfitPanel;
    elements.aiPrompt = aiOutfitPanel.querySelector('#ai-prompt');
    elements.generateAIOutfitBtn = aiOutfitPanel.querySelector('#generate-ai-outfit');
    elements.cancelAIOutfitBtn = aiOutfitPanel.querySelector('#cancel-ai-outfit');
    elements.closeAIGeneratorBtn = aiOutfitPanel.querySelector('#close-ai-generator');
    elements.aiGeneratorResult = aiOutfitPanel.querySelector('#ai-generator-result');
    elements.aiOutfitPreview = aiOutfitPanel.querySelector('.ai-outfit-preview');
    elements.aiOutfitReasoning = aiOutfitPanel.querySelector('.ai-outfit-reasoning');
    elements.aiOutfitName = aiOutfitPanel.querySelector('#ai-outfit-name');
    elements.saveAIOutfitBtn = aiOutfitPanel.querySelector('#save-ai-outfit');
    elements.regenerateOutfitBtn = aiOutfitPanel.querySelector('#regenerate-outfit');
    elements.aiGeneratorError = aiOutfitPanel.querySelector('#ai-generator-error');
    elements.aiGeneratorLoading = aiOutfitPanel.querySelector('#ai-generator-loading');
    
    // Add custom stylesheet for AI generator and vertical outfit display
    const style = document.createElement('style');
    style.textContent = `
      #ai-outfit-generator {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-top: 2rem;
        padding: 1.5rem;
      }
      
      #ai-prompt {
        width: 100%;
        padding: 1rem;
        font-size: 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        resize: vertical;
        min-height: 100px;
        font-family: inherit;
      }
      
      .prompt-hint {
        color: #6a737d;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        display: block;
      }
      
      .ai-outfit-preview {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background-color: #f6f8fa;
        border-radius: 8px;
        max-width: 300px;
        margin: 1rem auto;
      }
      
      .outfit-items-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        max-width: 300px;
        margin: 0 auto;
      }
      
      /* Order the items specifically for mannequin display */
      .ai-outfit-item[data-category="outerwear"],
      .outfit-item-thumbnail[data-category="outerwear"] {
        order: 1;
      }
      
      .ai-outfit-item[data-category="tops"],
      .outfit-item-thumbnail[data-category="tops"] {
        order: 2;
      }
      
      .ai-outfit-item[data-category="dresses"],
      .outfit-item-thumbnail[data-category="dresses"] {
        order: 3;
      }
      
      .ai-outfit-item[data-category="bottoms"],
      .outfit-item-thumbnail[data-category="bottoms"] {
        order: 4;
      }
      
      .ai-outfit-item[data-category="shoes"],
      .outfit-item-thumbnail[data-category="shoes"] {
        order: 5;
      }
      
      .ai-outfit-item[data-category="accessories"],
      .outfit-item-thumbnail[data-category="accessories"] {
        order: 6;
      }
      
      /* Make item thumbnails larger for better visibility */
      .outfit-item-thumbnail,
      .ai-outfit-item-image {
        height: 180px;
        width: 100%;
      }
      
      .ai-outfit-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid #e1e4e8;
        border-radius: 8px;
        overflow: hidden;
        padding-bottom: 0.5rem;
        background: white;
      }
      
      .ai-outfit-item-image {
        width: 100%;
        height: 180px;
        overflow: hidden;
      }
      
      .ai-outfit-item-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .ai-outfit-item-title {
        font-size: 0.875rem;
        font-weight: 500;
        text-align: center;
        padding: 0 0.5rem;
      }
      
      .ai-outfit-reasoning {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #f0f7ff;
        border-radius: 8px;
        font-style: italic;
      }
      
      .loading-spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 4px solid #4a6fa5;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 1rem auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      #ai-generator-loading {
        text-align: center;
        padding: 2rem;
      }
    `;
    document.head.appendChild(style);
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Tab navigation
  elements.tabs.wardrobe.addEventListener('click', () => switchTab('wardrobe-tab', 'wardrobe-view'));
  elements.tabs.outfit.addEventListener('click', () => switchTab('outfit-tab', 'outfits-view'));
  elements.tabs.add.addEventListener('click', () => switchTab('add-tab', 'add-view'));
  
  // Wardrobe filters
  elements.searchInput.addEventListener('input', handleSearch);
  elements.categoryFilter.addEventListener('change', handleCategoryFilter);
  
  // Outfit creation
  elements.createOutfitBtn.addEventListener('click', startOutfitCreation);
  
  // AI outfit generation
  if (elements.aiGenerateBtn) {
    console.log('Setting up AI Generate button event listener');
    elements.aiGenerateBtn.addEventListener('click', showAIOutfitGenerator);
  }
  
  if (elements.closeAIGeneratorBtn) {
    elements.closeAIGeneratorBtn.addEventListener('click', hideAIOutfitGenerator);
  }
  
  if (elements.cancelAIOutfitBtn) {
    elements.cancelAIOutfitBtn.addEventListener('click', hideAIOutfitGenerator);
  }
  
  if (elements.generateAIOutfitBtn) {
    elements.generateAIOutfitBtn.addEventListener('click', generateAIOutfit);
  }
  
  if (elements.saveAIOutfitBtn) {
    elements.saveAIOutfitBtn.addEventListener('click', saveAIOutfit);
  }
  
  if (elements.regenerateOutfitBtn) {
    elements.regenerateOutfitBtn.addEventListener('click', regenerateAIOutfit);
  }
}

// Load wardrobe data from Chrome storage
function loadWardrobe() {
  elements.wardrobeContainer.innerHTML = '<div class="loading">Loading your wardrobe...</div>';
  
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
      if (response && response.success) {
        state.wardrobe = response.wardrobe;
        renderWardrobe();
      } else {
        elements.wardrobeContainer.innerHTML = '<div class="empty-state">Failed to load your wardrobe. Please try again.</div>';
      }
    });
  } else {
    // For development or testing outside extension
    console.warn('Chrome runtime not available. Using empty wardrobe.');
    state.wardrobe = [];
    renderWardrobe();
  }
}

// Load outfits data from Chrome storage
function loadOutfits() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['outfits'], (data) => {
      state.outfits = data.outfits || [];
      renderOutfits();
    });
  } else {
    // For development or testing outside extension
    state.outfits = [];
    renderOutfits();
  }
}

// Load AI settings from Chrome storage
function loadAISettings() {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['openai_api_key', 'ai_outfit_settings'], (data) => {
      if (data.openai_api_key) {
        state.aiOutfitGenerator.apiKey = data.openai_api_key;
        
        // Show a masked version in the UI
        if (elements.apiKeyInput) {
          elements.apiKeyInput.value = '•'.repeat(16);
        }
      }
      
      if (data.ai_outfit_settings) {
        Object.assign(state.aiOutfitGenerator, data.ai_outfit_settings);
      }
    });
  }
}

// Switch between tabs
function switchTab(tabId, viewId) {
  // Update active tab
  document.querySelectorAll('.main-nav button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  
  // Update view
  document.querySelectorAll('main > section').forEach(section => {
    section.classList.add('hidden');
  });
  document.getElementById(viewId).classList.remove('hidden');
  
  // Update state
  state.currentTab = tabId;
}

// Search functionality
function handleSearch(e) {
  state.searchQuery = e.target.value.toLowerCase();
  renderWardrobe();
}

// Category filter
function handleCategoryFilter(e) {
  state.filteredCategory = e.target.value;
  renderWardrobe();
}

// Render wardrobe items
function renderWardrobe() {
  if (state.wardrobe.length === 0) {
    elements.wardrobeContainer.innerHTML = `
      <div class="empty-state">
        <p>Your wardrobe is empty. Add items by right-clicking on clothing images while browsing.</p>
      </div>
    `;
    return;
  }
  
  // Filter items
  let filteredItems = state.wardrobe;
  
  // Apply category filter
  if (state.filteredCategory !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === state.filteredCategory);
  }
  
  // Apply search filter
  if (state.searchQuery) {
    filteredItems = filteredItems.filter(item => {
      const searchText = `${item.title || ''} ${item.brand || ''} ${item.description || ''}`.toLowerCase();
      return searchText.includes(state.searchQuery);
    });
  }
  
  // Generate HTML
  if (filteredItems.length === 0) {
    elements.wardrobeContainer.innerHTML = `
      <div class="empty-state">
        <p>No items match your filters. Try adjusting your search criteria.</p>
      </div>
    `;
    return;
  }
  
  const itemsHTML = filteredItems.map(item => `
    <div class="item-card" data-id="${item.addedAt}">
      <div class="item-image">
        <img src="${item.imageUrl}" alt="${item.title || 'Product image'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' font-family=\\'Arial\\' font-size=\\'12\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' fill=\\'%23999\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
      </div>
      <div class="item-details">
        <h3>${item.title || 'Unknown Product'}</h3>
        ${item.brand ? `<p class="item-brand">${item.brand}</p>` : ''}
        ${item.price ? `<p class="item-price">${item.price}</p>` : ''}
        <p class="item-category">Category: ${item.category || 'Uncategorized'}</p>
      </div>
    </div>
  `).join('');
  
  elements.wardrobeContainer.innerHTML = itemsHTML;
  
  // Add click event listeners
  document.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => openItemModal(card.dataset.id));
  });
}

// Render outfits
// Render outfits
function renderOutfits() {
  if (!elements.outfitsContainer) return;
  
  if (state.outfits.length === 0) {
    elements.outfitsContainer.innerHTML = `
      <div class="empty-state">
        <p>You haven't created any outfits yet. Start by clicking "Create New Outfit".</p>
      </div>
    `;
    return;
  }
  
  // Render outfit cards
  const outfitsHTML = state.outfits.map(outfit => {
    // Get the outfit items that exist
    const outfitItems = Object.entries(outfit.items)
      .filter(([_, item]) => item !== null)
      .map(([type, item]) => `
        <div class="outfit-item-thumbnail" data-category="${type}">
          <img src="${item.imageUrl}" alt="${type}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' font-family=\\'Arial\\' font-size=\\'12\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' fill=\\'%23999\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
        </div>
      `).join('');
    
    return `
      <div class="outfit-card" data-id="${outfit.id}">
        <div class="outfit-name">
          <h3>${outfit.name}</h3>
        </div>
        <div class="outfit-items-grid">
          ${outfitItems}
        </div>
        <div class="outfit-footer">
          <span class="outfit-created-date">${new Date(outfit.createdAt).toLocaleDateString()}</span>
          <button class="icon-button delete-outfit" data-id="${outfit.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  elements.outfitsContainer.innerHTML = outfitsHTML;
  
  // Add delete button listeners
  document.querySelectorAll('.delete-outfit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteOutfit(btn.dataset.id);
    });
  });
}
  
  // Render outfit cards
  const outfitsHTML = state.outfits.map(outfit => {
    // Get the outfit items that exist
    const outfitItems = Object.entries(outfit.items)
      .filter(([_, item]) => item !== null)
      .map(([type, item]) => `
        <div class="outfit-item-thumbnail">
          <img src="${item.imageUrl}" alt="${type}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' font-family=\\'Arial\\' font-size=\\'12\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' fill=\\'%23999\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
        </div>
      `).join('');
    
    return `
      <div class="outfit-card" data-id="${outfit.id}">
        <div class="outfit-name">
          <h3>${outfit.name}</h3>
        </div>
        <div class="outfit-items-grid">
          ${outfitItems}
        </div>
        <div class="outfit-footer">
          <span class="outfit-occasion">${outfit.occasion || 'Casual'}</span>
          <button class="icon-button delete-outfit" data-id="${outfit.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  elements.outfitsContainer.innerHTML = outfitsHTML;
  
  // Add delete button listeners
  document.querySelectorAll('.delete-outfit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteOutfit(btn.dataset.id);
    });
  });

// Show the AI outfit generator panel
function showAIOutfitGenerator() {
  if (elements.aiOutfitPanel) {
    elements.aiOutfitPanel.classList.remove('hidden');
    
    // Hide result section if previously shown
    elements.aiGeneratorResult.classList.add('hidden');
    elements.aiGeneratorError.classList.add('hidden');
    elements.aiGeneratorLoading.classList.add('hidden');
    
    // Update UI with current state values
    elements.aiOccasion.value = state.aiOutfitGenerator.occasion;
    elements.aiWeather.value = state.aiOutfitGenerator.weather;
    elements.aiStyle.value = state.aiOutfitGenerator.style;
    
    // Update checkboxes
    elements.aiCategoryCheckboxes.forEach(checkbox => {
      checkbox.checked = state.aiOutfitGenerator.selectedCategories.includes(checkbox.value);
    });
  }
}

// Hide the AI outfit generator panel
function hideAIOutfitGenerator() {
  if (elements.aiOutfitPanel) {
    elements.aiOutfitPanel.classList.add('hidden');
  }
}

// Save API key
function saveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  
  if (!apiKey) {
    showAIError('Please enter a valid API key');
    return;
  }
  
  // Only save if it's not the masked placeholder
  if (!apiKey.match(/^•+$/)) {
    state.aiOutfitGenerator.apiKey = apiKey;
    
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ 
        action: 'setOpenAIKey', 
        apiKey: apiKey 
      }, (response) => {
        if (response && response.success) {
          elements.apiKeyInput.value = '•'.repeat(16);
          showAISuccess('API key saved successfully');
        } else {
          showAIError('Failed to save API key');
        }
      });
    }
  }
}

// Generate an AI outfit
function generateAIOutfit() {
  // Get the user's prompt
  const userPrompt = elements.aiPrompt.value.trim();
  
  if (!userPrompt) {
    showAIError('Please enter a description for your outfit');
    return;
  }
  
  // Show loading state
  elements.aiGeneratorResult.classList.add('hidden');
  elements.aiGeneratorError.classList.add('hidden');
  elements.aiGeneratorLoading.classList.remove('hidden');
  elements.generateAIOutfitBtn.disabled = true;
  
  // Make the API request
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'generateOutfit',
      options: {
        userPrompt: userPrompt
      },
      wardrobe: state.wardrobe
    }, (response) => {
      console.log('AI outfit generation response:', response);
      elements.generateAIOutfitBtn.disabled = false;
      elements.aiGeneratorLoading.classList.add('hidden');
      
      if (response && response.success) {
        // Store the result
        state.aiOutfitGenerator.lastResult = response.outfit;
        
        // Display the result
        displayAIOutfit(response.outfit);
      } else {
        showAIError(response?.message || 'Failed to generate outfit');
      }
    });
  } else {
    // For development outside extension
    console.warn('Chrome runtime not available. Cannot generate outfit.');
    elements.generateAIOutfitBtn.disabled = false;
    elements.aiGeneratorLoading.classList.add('hidden');
    showAIError('Chrome extension API not available');
  }
}

// Regenerate an AI outfit
function regenerateAIOutfit() {
  // Just call generate again
  generateAIOutfit();
}

// Display an AI-generated outfit
// Display an AI-generated outfit
function displayAIOutfit(outfit) {
  if (!outfit || !outfit.items) {
    showAIError('No valid outfit generated');
    return;
  }
  
  // Create HTML for outfit items
  const itemsHTML = Object.entries(outfit.items)
    .map(([category, item]) => `
      <div class="ai-outfit-item" data-category="${category}">
        <div class="ai-outfit-item-image">
          <img src="${item.imageUrl}" alt="${item.title || category}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' fill=\\'%23f0f0f0\\'/%3E%3Ctext x=\\'50\\' y=\\'50\\' font-family=\\'Arial\\' font-size=\\'12\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' fill=\\'%23999\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
        </div>
        <div class="ai-outfit-item-title">
          ${category.charAt(0).toUpperCase() + category.slice(1)}: ${item.title || 'Item'}
        </div>
      </div>
    `).join('');
  
  // Update the UI
  elements.aiOutfitPreview.innerHTML = itemsHTML;
  elements.aiOutfitReasoning.textContent = outfit.reasoning || 'These items complement each other well.';
  
  // Suggest an outfit name based on the prompt or reasoning
  const nameInput = document.getElementById('ai-outfit-name');
  if (nameInput) {
    // Get a name from the reasoning if possible
    let suggestedName = '';
    const reasoning = outfit.reasoning || '';
    
    // Try to extract a descriptive phrase from reasoning
    if (reasoning.includes('for') && reasoning.indexOf('for') < 50) {
      const forPhrase = reasoning.substring(reasoning.indexOf('for'));
      const endOfPhrase = Math.min(
        forPhrase.indexOf('.') > 0 ? forPhrase.indexOf('.') : 50,
        forPhrase.indexOf(',') > 0 ? forPhrase.indexOf(',') : 50,
        50
      );
      suggestedName = 'Outfit ' + forPhrase.substring(0, endOfPhrase);
    } else {
      // Generic name with date
      const date = new Date();
      suggestedName = `AI Outfit - ${date.toLocaleDateString()}`;
    }
    
    nameInput.value = suggestedName;
  }
  
  elements.aiGeneratorResult.classList.remove('hidden');
}

// Show an error in the AI generator
function showAIError(message) {
  elements.aiGeneratorError.textContent = message;
  elements.aiGeneratorError.classList.remove('hidden');
  
  // Hide after 5 seconds
  setTimeout(() => {
    elements.aiGeneratorError.classList.add('hidden');
  }, 5000);
}

// Show a success message in the AI generator
function showAISuccess(message) {
  elements.aiGeneratorError.textContent = message;
  elements.aiGeneratorError.className = 'message success';
  elements.aiGeneratorError.classList.remove('hidden');
  
  // Hide after a few seconds
  setTimeout(() => {
    elements.aiGeneratorError.classList.add('hidden');
    elements.aiGeneratorError.className = 'message error hidden';
  }, 3000);
}

// Save the AI-generated outfit
function saveAIOutfit() {
  const outfit = state.aiOutfitGenerator.lastResult;

  if (!outfit || !outfit.items) {
    showAIError('No valid outfit to save');
    return;
  }
  
  // Get the custom name from the input field
  const nameInput = document.getElementById('ai-outfit-name');
  const outfitName = nameInput.value.trim() || `AI Generated Outfit`;
  
  // Create outfit object without a specific occasion
  const newOutfit = {
    id: Date.now().toString(),
    name: outfitName,
    items: outfit.items,
    reasoning: outfit.reasoning,
    createdAt: new Date().toISOString(),
    isAIGenerated: true
  };
  
  // Save to storage
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['outfits'], (data) => {
      const outfits = data.outfits || [];
      
      // Add new outfit
      outfits.push(newOutfit);
      
      // Save updated outfits
      chrome.storage.local.set({ outfits }, () => {
        state.outfits = outfits;
        renderOutfits();
        hideAIOutfitGenerator();
        
        // Show a notification
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '/vite.svg',
            title: 'Virtual Closet',
            message: 'AI-generated outfit saved to your collection!'
          });
        }
      });
    });
  } else {
    // For development outside extension
    state.outfits.push(newOutfit);
    renderOutfits();
    hideAIOutfitGenerator();
  }
}

// Start outfit creation
function startOutfitCreation() {
  // Check if our element exists
  if (!elements.outfitCreator) {
    console.warn('Outfit creator element not found');
    return;
  }
  
  // Reset selection
  state.selectedOutfitItems = {
    tops: null,
    bottoms: null,
    shoes: null,
    outerwear: null
  };
  
  // Show creator
  elements.outfitCreator.classList.remove('hidden');
}

// Delete an outfit
function deleteOutfit(outfitId) {
  if (confirm('Are you sure you want to delete this outfit?')) {
    state.outfits = state.outfits.filter(outfit => outfit.id !== outfitId);
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['outfits'], (data) => {
        const outfits = (data.outfits || []).filter(outfit => outfit.id !== outfitId);
        
        chrome.storage.local.set({ outfits }, () => {
          renderOutfits();
        });
      });
    } else {
      renderOutfits();
    }
  }
}

// Delete an item from wardrobe
function handleDeleteItem(itemId) {
  if (confirm('Are you sure you want to remove this item from your wardrobe?')) {
    const updatedWardrobe = state.wardrobe.filter(item => item.addedAt !== itemId);
    
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateWardrobe',
        wardrobe: updatedWardrobe
      }, (response) => {
        if (response && response.success) {
          state.wardrobe = updatedWardrobe;
          renderWardrobe();
          
          // Close modal
          const modal = document.getElementById('item-modal');
          if (modal) {
            modal.classList.add('hidden');
          }
        }
      });
    } else {
      // For development outside extension
      state.wardrobe = updatedWardrobe;
      renderWardrobe();
      
      // Close modal
      const modal = document.getElementById('item-modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    }
  }
}

// Open item detail modal
function openItemModal(itemId) {
  const item = state.wardrobe.find(item => item.addedAt === itemId);
  
  if (!item) return;
  
  // Create modal if it doesn't exist
  let modalElement = document.getElementById('item-modal');
  if (!modalElement) {
    modalElement = document.createElement('div');
    modalElement.id = 'item-modal';
    modalElement.className = 'modal';
    
    modalElement.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modal-title">Item Details</h3>
          <button id="close-modal" class="close-button">×</button>
        </div>
        
        <div class="modal-body">
          <div class="item-image-container">
            <img id="modal-image" src="" alt="Item Image">
          </div>
          
          <div class="item-details">
            <div class="detail-row">
              <span class="detail-label">Brand:</span>
              <span id="modal-brand" class="detail-value">-</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span id="modal-price" class="detail-value">-</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Category:</span>
              <span id="modal-category" class="detail-value">-</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Added:</span>
              <span id="modal-date" class="detail-value">-</span>
            </div>
            
            <div class="detail-row full-width">
              <span class="detail-label">Description:</span>
              <p id="modal-description" class="detail-value">-</p>
            </div>
            
            <div class="detail-row full-width" id="detailed-description-container">
              <span class="detail-label">Detailed Information:</span>
              <pre id="modal-detailed-description" class="detail-value" style="white-space: pre-wrap; font-family: inherit;">-</pre>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <a id="modal-product-link" href="#" target="_blank" class="secondary-button">View Original</a>
          <button id="modal-delete" class="danger-button">Remove from Wardrobe</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modalElement);
    
    // Add event listeners
    document.getElementById('close-modal').addEventListener('click', () => {
      modalElement.classList.add('hidden');
    });
    
    document.getElementById('modal-delete').addEventListener('click', () => {
      const itemId = document.getElementById('modal-delete').dataset.itemId;
      if (itemId) {
        handleDeleteItem(itemId);
      }
    });
  }
  
  // Populate modal
  document.getElementById('modal-title').textContent = item.title || 'Unknown Product';
  document.getElementById('modal-image').src = item.imageUrl;
  document.getElementById('modal-brand').textContent = item.brand || '-';
  document.getElementById('modal-price').textContent = item.price || '-';
  document.getElementById('modal-category').textContent = item.category || 'Uncategorized';
  
  // Format date
  const date = new Date(item.addedAt);
  document.getElementById('modal-date').textContent = date.toLocaleDateString();
  
  // Set description
  document.getElementById('modal-description').textContent = item.description || 'No description available.';
  
  // Set detailed description if available
  const detailedContainer = document.getElementById('detailed-description-container');
  const detailedDescription = document.getElementById('modal-detailed-description');
  
  if (item.detailedDescription) {
    detailedDescription.textContent = item.detailedDescription;
    detailedContainer.style.display = 'block';
  } else {
    detailedContainer.style.display = 'none';
  }
  
  // Set the product link
  const productLink = document.getElementById('modal-product-link');
  if (item.url) {
    productLink.href = item.url;
    productLink.style.display = 'inline-block';
  } else {
    productLink.style.display = 'none';
  }
  
  // Store item ID for delete action
  document.getElementById('modal-delete').dataset.itemId = itemId;
  
  // Show modal
  modalElement.classList.remove('hidden');
}

export default {
  // Export key functions for testing or external use
  loadWardrobe,
  renderWardrobe,
  switchTab
};