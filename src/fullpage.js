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
  }// src/fullpage.js - Entry point for the fullpage view
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
    }
  };
  
  // DOM elements
  let elements = {};
  
  // Initialize the application
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Virtual Closet Full Page loaded');
    
    // Get DOM elements
    cacheDOM();
    
    // Load data
    loadWardrobe();
    loadOutfits();
    
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
            <span class="outfit-occasion">${outfit.occasion}</span>
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
  
  export default {
    // Export key functions for testing or external use
    loadWardrobe,
    renderWardrobe,
    switchTab
  };