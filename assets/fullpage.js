// Main JavaScript for Virtual Closet Full Page

// State management
let state = {
    wardrobe: [],
    outfits: [],
    currentTab: 'wardrobe-tab',
    filteredCategory: 'all',
    searchQuery: '',
    currentActiveView: 'wardrobe-view',
    itemSelectionType: null,
    selectedOutfitItems: {
      tops: null,
      bottoms: null,
      shoes: null,
      outerwear: null
    }
  };
  
  // DOM elements
  const elements = {
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
    outfitCreator: document.getElementById('outfit-creator'),
    closeCreatorBtn: document.getElementById('close-creator'),
    outfitSlots: document.querySelectorAll('.outfit-item-slot'),
    saveOutfitBtn: document.getElementById('save-outfit'),
    cancelOutfitBtn: document.getElementById('cancel-outfit'),
    itemSelectionPanel: document.querySelector('.item-selection-panel'),
    closeSelectionPanelBtn: document.querySelector('.close-panel'),
    itemSelectionGrid: document.querySelector('.item-selection-grid'),
    itemTypeLabel: document.querySelector('.item-type-label'),
    outfitNameInput: document.getElementById('outfit-name'),
    outfitOccasionSelect: document.getElementById('outfit-occasion'),
    outfitNotesTextarea: document.getElementById('outfit-notes'),
    
    // Add Item
    addMessage: document.getElementById('add-message'),
    
    // Item Detail Modal
    itemModal: document.getElementById('item-modal'),
    closeModalBtn: document.getElementById('close-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalImage: document.getElementById('modal-image'),
    modalBrand: document.getElementById('modal-brand'),
    modalPrice: document.getElementById('modal-price'),
    modalCategory: document.getElementById('modal-category'),
    modalDate: document.getElementById('modal-date'),
    modalDescription: document.getElementById('modal-description'),
    modalProductLink: document.getElementById('modal-product-link'),
    modalDelete: document.getElementById('modal-delete')
  };
  
  // Initialize the application
  document.addEventListener('DOMContentLoaded', () => {
    // Load data
    loadWardrobe();
    loadOutfits();
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'wardrobeUpdated') {
        console.log('Received wardrobe update notification');
        state.wardrobe = message.wardrobe;
        renderWardrobe();
      }
    });
  });
  
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
    elements.closeCreatorBtn.addEventListener('click', closeOutfitCreator);
    elements.cancelOutfitBtn.addEventListener('click', closeOutfitCreator);
    elements.saveOutfitBtn.addEventListener('click', saveOutfit);
    elements.closeSelectionPanelBtn.addEventListener('click', closeItemSelectionPanel);
    
    // Outfit item slots
    elements.outfitSlots.forEach(slot => {
      slot.addEventListener('click', () => openItemSelection(slot.dataset.type));
    });
    
    // Modal
    elements.closeModalBtn.addEventListener('click', closeItemModal);
    elements.modalDelete.addEventListener('click', handleDeleteItem);
  }
  
  // Load wardrobe data from Chrome storage
  function loadWardrobe() {
    elements.wardrobeContainer.innerHTML = '<div class="loading">Loading your wardrobe...</div>';
    
    chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
      if (response && response.success) {
        state.wardrobe = response.wardrobe;
        renderWardrobe();
      } else {
        elements.wardrobeContainer.innerHTML = '<div class="empty-state">Failed to load your wardrobe. Please try again.</div>';
      }
    });
  }
  
  // Load outfits data from Chrome storage
  function loadOutfits() {
    chrome.storage.local.get(['outfits'], (data) => {
      state.outfits = data.outfits || [];
      renderOutfits();
    });
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
    state.currentActiveView = viewId;
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
        const searchText = `${item.title} ${item.brand} ${item.description}`.toLowerCase();
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
  
  // Open item detail modal
  function openItemModal(itemId) {
    const item = state.wardrobe.find(item => item.addedAt === itemId);
    
    if (!item) return;
    
    // Populate modal
    elements.modalTitle.textContent = item.title || 'Unknown Product';
    elements.modalImage.src = item.imageUrl;
    elements.modalBrand.textContent = item.brand || '-';
    elements.modalPrice.textContent = item.price || '-';
    elements.modalCategory.textContent = item.category || 'Uncategorized';
    
    // Format date
    const date = new Date(item.addedAt);
    elements.modalDate.textContent = date.toLocaleDateString();
    
    elements.modalDescription.textContent = item.description || 'No description available.';
    elements.modalProductLink.href = item.url || '#';
    
    // Store item ID for delete action
    elements.modalDelete.dataset.itemId = itemId;
    
    // Show modal
    elements.itemModal.classList.remove('hidden');
  }
  
  // Close item detail modal
  function closeItemModal() {
    elements.itemModal.classList.add('hidden');
  }
  
  // Handle deleting an item
  function handleDeleteItem() {
    const itemId = elements.modalDelete.dataset.itemId;
    
    if (confirm('Are you sure you want to remove this item from your wardrobe?')) {
      const updatedWardrobe = state.wardrobe.filter(item => item.addedAt !== itemId);
      
      chrome.runtime.sendMessage({
        action: 'updateWardrobe',
        wardrobe: updatedWardrobe
      }, (response) => {
        if (response && response.success) {
          state.wardrobe = updatedWardrobe;
          renderWardrobe();
          closeItemModal();
        }
      });
    }
  }
  
  // Start outfit creation
  function startOutfitCreation() {
    // Reset selection
    state.selectedOutfitItems = {
      tops: null,
      bottoms: null,
      shoes: null,
      outerwear: null
    };
    
    // Reset form
    elements.outfitNameInput.value = '';
    elements.outfitOccasionSelect.value = 'casual';
    elements.outfitNotesTextarea.value = '';
    elements.saveOutfitBtn.disabled = true;
    
    // Reset slot displays
    elements.outfitSlots.forEach(slot => {
      const contentEl = slot.querySelector('.slot-content');
      contentEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      `;
      contentEl.classList.add('empty');
    });
    
    // Show creator
    elements.outfitCreator.classList.remove('hidden');
  }
  
  // Close outfit creator
  function closeOutfitCreator() {
    elements.outfitCreator.classList.add('hidden');
  }
  
  // Open item selection panel
  function openItemSelection(itemType) {
    state.itemSelectionType = itemType;
    elements.itemTypeLabel.textContent = itemType.charAt(0).toUpperCase() + itemType.slice(1);
    
    // Filter items by type
    const itemsOfType = state.wardrobe.filter(item => item.category === itemType);
    
    if (itemsOfType.length === 0) {
      elements.itemSelectionGrid.innerHTML = `
        <div class="empty-state">
          <p>You don't have any ${itemType} in your wardrobe yet. Add some first!</p>
        </div>
      `;
    } else {
      const itemsHTML = itemsOfType.map(item => `
        <div class="selection-item" data-id="${item.addedAt}">
          <img src="${item.imageUrl}" alt="${item.title || itemType}">
          <p>${item.title || 'Unnamed item'}</p>
        </div>
      `).join('');
      
      elements.itemSelectionGrid.innerHTML = itemsHTML;
      
      // Add click event listeners
      document.querySelectorAll('.selection-item').forEach(item => {
        item.addEventListener('click', () => selectOutfitItem(item.dataset.id));
      });
    }
    
    elements.itemSelectionPanel.classList.remove('hidden');
  }
  
  // Close item selection panel
  function closeItemSelectionPanel() {
    elements.itemSelectionPanel.classList.add('hidden');
  }
  
  // Select an item for outfit
  function selectOutfitItem(itemId) {
    const item = state.wardrobe.find(item => item.addedAt === itemId);
    if (!item) return;
    
    // Update state
    state.selectedOutfitItems[state.itemSelectionType] = item;
    
    // Update UI
    const slot = document.querySelector(`.outfit-item-slot[data-type="${state.itemSelectionType}"]`);
    const contentEl = slot.querySelector('.slot-content');
    
    contentEl.innerHTML = `<img src="${item.imageUrl}" alt="${item.title || state.itemSelectionType}">`;
    contentEl.classList.remove('empty');
    
    // Close panel
    closeItemSelectionPanel();
    
    // Check if we can enable save button (need at least tops, bottoms, and shoes)
    if (state.selectedOutfitItems.tops && state.selectedOutfitItems.bottoms && state.selectedOutfitItems.shoes) {
      elements.saveOutfitBtn.disabled = false;
    }
  }
  
  // Save outfit
  function saveOutfit() {
    const name = elements.outfitNameInput.value.trim() || 'Unnamed Outfit';
    const occasion = elements.outfitOccasionSelect.value;
    const notes = elements.outfitNotesTextarea.value.trim();
    
    const newOutfit = {
      id: Date.now().toString(),
      name,
      occasion,
      notes,
      items: state.selectedOutfitItems,
      createdAt: new Date().toISOString()
    };
    
    // Add to outfits array
    state.outfits.push(newOutfit);
    
    // Save to storage
    chrome.storage.local.get(['outfits'], (data) => {
      const outfits = data.outfits || [];
      outfits.push(newOutfit);
      
      chrome.storage.local.set({ outfits }, () => {
        renderOutfits();
        closeOutfitCreator();
      });
    });
  }
  
  // Render outfits
  function renderOutfits() {
    if (state.outfits.length === 0) {
      elements.outfitsContainer.innerHTML = `
        <div class="empty-state">
          <p>You haven't created any outfits yet. Start by clicking "Create New Outfit".</p>
        </div>
      `;
      return;
    }
    
    const outfitsHTML = state.outfits.map(outfit => {
      // Get the outfit items that exist
      const outfitItems = Object.entries(outfit.items)
        .filter(([_, item]) => item !== null)
        .map(([type, item]) => `
          <div class="outfit-item-thumbnail">
            <img src="${item.imageUrl}" alt="${type}">
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
  
  // Delete outfit
  function deleteOutfit(outfitId) {
    if (confirm('Are you sure you want to delete this outfit?')) {
      state.outfits = state.outfits.filter(outfit => outfit.id !== outfitId);
      
      chrome.storage.local.get(['outfits'], (data) => {
        const outfits = (data.outfits || []).filter(outfit => outfit.id !== outfitId);
        
        chrome.storage.local.set({ outfits }, () => {
          renderOutfits();
        });
      });
    }
  }
  
  // Show message in add tab
  function showAddMessage(type, text) {
    if (!type || !text) {
      elements.addMessage.classList.add('hidden');
      return;
    }
    
    elements.addMessage.textContent = text;
    elements.addMessage.className = `message ${type}`;
    elements.addMessage.classList.remove('hidden');
  }