import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './App.css';

const VirtualClosetFullPage = () => {
  // State for the application
  const [currentTab, setCurrentTab] = useState('wardrobe-tab');
  const [wardrobe, setWardrobe] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCategory, setFilteredCategory] = useState('all');
  const [showOutfitCreator, setShowOutfitCreator] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState({
    tops: null,
    bottoms: null,
    shoes: null,
    outerwear: null
  });
  const [outfitDetails, setOutfitDetails] = useState({
    name: '',
    occasion: 'casual',
    notes: ''
  });
  const [showItemSelectionPanel, setShowItemSelectionPanel] = useState(false);
  const [currentItemType, setCurrentItemType] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Load wardrobe and outfits data on component mount
  useEffect(() => {
    loadWardrobe();
    loadOutfits();
  }, []);
  
  // Load wardrobe data from Chrome storage
  const loadWardrobe = () => {
    setIsLoading(true);
    
    // Check if we're in a Chrome extension environment
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
        if (response && response.success) {
          setWardrobe(response.wardrobe || []);
        } else {
          console.error('Failed to load wardrobe data');
        }
        setIsLoading(false);
      });
    } else {
      // Mock data for development outside of Chrome extension
      console.warn('Chrome runtime not available. Using mock data.');
      setWardrobe([]);
      setIsLoading(false);
    }
  };
  
  // Load outfits data from Chrome storage
  const loadOutfits = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['outfits'], (data) => {
        setOutfits(data.outfits || []);
      });
    }
  };
  
  // Handle tab switching
  const handleTabClick = (tabId) => {
    setCurrentTab(tabId);
  };
  
  // Handle search input
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle category filter change
  const handleCategoryFilter = (e) => {
    setFilteredCategory(e.target.value);
  };
  
  // Filter wardrobe items based on search and category
  const getFilteredItems = () => {
    let filtered = wardrobe;
    
    // Apply category filter
    if (filteredCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filteredCategory);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchText = `${item.title || ''} ${item.brand || ''} ${item.description || ''}`.toLowerCase();
        return searchText.includes(query);
      });
    }
    
    return filtered;
  };
  
  // Start outfit creation process
  const startOutfitCreation = () => {
    setSelectedOutfitItems({
      tops: null,
      bottoms: null,
      shoes: null,
      outerwear: null
    });
    
    setOutfitDetails({
      name: '',
      occasion: 'casual',
      notes: ''
    });
    
    setShowOutfitCreator(true);
  };
  
  // Close outfit creator
  const closeOutfitCreator = () => {
    setShowOutfitCreator(false);
  };
  
  // Open item selection panel for outfit creation
  const openItemSelection = (itemType) => {
    setCurrentItemType(itemType);
    setShowItemSelectionPanel(true);
  };
  
  // Close item selection panel
  const closeItemSelectionPanel = () => {
    setShowItemSelectionPanel(false);
  };
  
  // Select an item for the outfit
  const selectOutfitItem = (item) => {
    setSelectedOutfitItems(prev => ({
      ...prev,
      [currentItemType]: item
    }));
    
    setShowItemSelectionPanel(false);
  };
  
  // Handle outfit details changes
  const handleOutfitDetailChange = (e) => {
    const { name, value } = e.target;
    setOutfitDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save a new outfit
  const saveOutfit = () => {
    const newOutfit = {
      id: Date.now().toString(),
      name: outfitDetails.name || 'Unnamed Outfit',
      occasion: outfitDetails.occasion,
      notes: outfitDetails.notes,
      items: selectedOutfitItems,
      createdAt: new Date().toISOString()
    };
    
    const updatedOutfits = [...outfits, newOutfit];
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ outfits: updatedOutfits }, () => {
        setOutfits(updatedOutfits);
        setShowOutfitCreator(false);
      });
    } else {
      setOutfits(updatedOutfits);
      setShowOutfitCreator(false);
    }
  };
  
  // Delete an outfit
  const deleteOutfit = (outfitId) => {
    if (window.confirm('Are you sure you want to delete this outfit?')) {
      const updatedOutfits = outfits.filter(outfit => outfit.id !== outfitId);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ outfits: updatedOutfits }, () => {
          setOutfits(updatedOutfits);
        });
      } else {
        setOutfits(updatedOutfits);
      }
    }
  };
  
  // Open item detail modal
  const openItemModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };
  
  // Close item detail modal
  const closeItemModal = () => {
    setShowModal(false);
  };
  
  // Delete an item from wardrobe
  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item from your wardrobe?')) {
      const updatedWardrobe = wardrobe.filter(item => item.addedAt !== itemId);
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'updateWardrobe',
          wardrobe: updatedWardrobe
        }, (response) => {
          if (response && response.success) {
            setWardrobe(updatedWardrobe);
            setShowModal(false);
          }
        });
      } else {
        setWardrobe(updatedWardrobe);
        setShowModal(false);
      }
    }
  };
  
  // Check if save outfit button should be enabled
  const canSaveOutfit = () => {
    return selectedOutfitItems.tops && selectedOutfitItems.bottoms && selectedOutfitItems.shoes;
  };
  
  // Get wardrobe items by category
  const getItemsByCategory = (category) => {
    return wardrobe.filter(item => item.category === category);
  };
  };
  
  // Render wardrobe view
  const renderWardrobeView = () => {
    const filteredItems = getFilteredItems();
    
    if (isLoading) {
      return <div className="loading">Loading your wardrobe...</div>;
    }
    
    if (wardrobe.length === 0) {
      return (
        <div className="empty-state">
          <p>Your wardrobe is empty. Add items by right-clicking on clothing images while browsing.</p>
        </div>
      );
    }
    
    if (filteredItems.length === 0) {
      return (
        <div className="empty-state">
          <p>No items match your search or filter criteria. Try adjusting your search terms.</p>
        </div>
      );
    }
    
    return (
      <div className="items-grid-container">
        {filteredItems.map(item => (
          <div className="item-card" key={item.addedAt} onClick={() => openItemModal(item)}>
            <div className="item-image">
              <img 
                src={item.imageUrl} 
                alt={item.title || 'Product'} 
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <div className="item-details">
              <h3>{item.title || 'Unknown Product'}</h3>
              {item.brand && <p className="item-brand">{item.brand}</p>}
              {item.price && <p className="item-price">{item.price}</p>}
              <p className="item-category">Category: {item.category || 'Uncategorized'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render outfits view
  const renderOutfitsView = () => {
    if (outfits.length === 0) {
      return (
        <div className="empty-state">
          <p>You haven't created any outfits yet. Start by clicking "Create New Outfit".</p>
        </div>
      );
    }
    
    return (
      <div className="outfits-grid">
        {outfits.map(outfit => {
          const outfitItems = Object.entries(outfit.items)
            .filter(([_, item]) => item !== null)
            .map(([type, item]) => (
              <div className="outfit-item-thumbnail" key={type}>
                <img 
                  src={item.imageUrl} 
                  alt={type} 
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
          ));
          
          return (
            <div className="outfit-card" key={outfit.id}>
              <div className="outfit-name">
                <h3>{outfit.name}</h3>
              </div>
              <div className="outfit-items-grid">
                {outfitItems}
              </div>
              <div className="outfit-footer">
                <span className="outfit-occasion">{outfit.occasion}</span>
                <button 
                  className="icon-button delete-outfit" 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteOutfit(outfit.id);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Render add items view
  const renderAddView = () => {
    return (
      <div className="add-container">
        <h2>Add to Your Wardrobe</h2>
        <p>To add items to your wardrobe, simply use the right-click method:</p>
        
        <div className="add-method-card">
          <h3>Right-Click on Images</h3>
          <p>When browsing shopping websites, right-click on any clothing image and select "Add to Virtual Closet" from the context menu.</p>
        </div>
      </div>
    );
  };
  
  // Render outfit creation UI
  const renderOutfitCreator = () => {
    if (!showOutfitCreator) return null;
    
    return (
      <div id="outfit-creator" className={showOutfitCreator ? '' : 'hidden'}>
        <div className="outfit-creator-header">
          <h3>Create New Outfit</h3>
          <button id="close-creator" className="icon-button" onClick={closeOutfitCreator}>×</button>
        </div>
        
        <div className="outfit-builder">
          <div className="outfit-items">
            {['tops', 'bottoms', 'shoes', 'outerwear'].map(itemType => {
              const selectedItem = selectedOutfitItems[itemType];
              const isOptional = itemType === 'outerwear';
              
              return (
                <div 
                  className="outfit-item-slot" 
                  key={itemType} 
                  data-type={itemType}
                  onClick={() => openItemSelection(itemType)}
                >
                  <div className="slot-label">{itemType.charAt(0).toUpperCase() + itemType.slice(1)} {isOptional && '(Optional)'}</div>
                  <div className={`slot-content ${!selectedItem ? 'empty' : ''}`}>
                    {selectedItem ? (
                      <img src={selectedItem.imageUrl} alt={selectedItem.title || itemType} />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="outfit-details">
            <div className="form-group">
              <label htmlFor="outfit-name">Outfit Name</label>
              <input 
                type="text" 
                id="outfit-name" 
                name="name"
                value={outfitDetails.name}
                onChange={handleOutfitDetailChange}
                placeholder="e.g., Casual Friday" 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="outfit-occasion">Occasion</label>
              <select 
                id="outfit-occasion" 
                name="occasion"
                value={outfitDetails.occasion}
                onChange={handleOutfitDetailChange}
              >
                <option value="casual">Casual</option>
                <option value="work">Work</option>
                <option value="formal">Formal</option>
                <option value="sport">Sport</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="outfit-notes">Notes</label>
              <textarea 
                id="outfit-notes" 
                name="notes"
                value={outfitDetails.notes}
                onChange={handleOutfitDetailChange}
                placeholder="Any notes about this outfit..." 
              />
            </div>
            
            <div className="form-actions">
              <button 
                id="save-outfit"
                className="primary-button" 
                disabled={!canSaveOutfit()}
                onClick={saveOutfit}
              >
                Save Outfit
              </button>
              <button 
                id="cancel-outfit"
                className="secondary-button" 
                onClick={closeOutfitCreator}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render item selection panel for outfit creation
  const renderItemSelectionPanel = () => {
    if (!showItemSelectionPanel || !currentItemType) return null;
    
    const itemsOfType = getItemsByCategory(currentItemType);
    
    return (
      <div className={`item-selection-panel ${!showItemSelectionPanel ? 'hidden' : ''}`}>
        <div className="panel-header">
          <h4>Select <span className="item-type-label">{currentItemType.charAt(0).toUpperCase() + currentItemType.slice(1)}</span></h4>
          <button className="close-panel" onClick={closeItemSelectionPanel}>×</button>
        </div>
        <div className="item-selection-grid">
          {itemsOfType.length === 0 ? (
            <div className="empty-state">
              <p>You don't have any {currentItemType} in your wardrobe yet. Add some first!</p>
            </div>
          ) : (
            itemsOfType.map(item => (
              <div 
                className="selection-item" 
                key={item.addedAt}
                onClick={() => selectOutfitItem(item)}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.title || currentItemType}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
                <p>{item.title || 'Unnamed item'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };
  
  // Render item detail modal
  const renderItemModal = () => {
    if (!showModal || !selectedItem) return null;
    
    const formattedDate = selectedItem.addedAt 
      ? new Date(selectedItem.addedAt).toLocaleDateString() 
      : 'Unknown';
    
    return (
      <div id="item-modal" className={`modal ${!showModal ? 'hidden' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3 id="modal-title">{selectedItem.title || 'Item Details'}</h3>
            <button id="close-modal" className="close-button" onClick={closeItemModal}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="item-image-container">
              <img 
                id="modal-image" 
                src={selectedItem.imageUrl} 
                alt="Item Image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            
            <div className="item-details">
              <div className="detail-row">
                <span className="detail-label">Brand:</span>
                <span id="modal-brand" className="detail-value">{selectedItem.brand || '-'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span id="modal-price" className="detail-value">{selectedItem.price || '-'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Category:</span>
                <span id="modal-category" className="detail-value">{selectedItem.category || 'Uncategorized'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Added:</span>
                <span id="modal-date" className="detail-value">{formattedDate}</span>
              </div>
              
              <div className="detail-row full-width">
                <span className="detail-label">Description:</span>
                <p id="modal-description" className="detail-value">{selectedItem.description || 'No description available.'}</p>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            {selectedItem.url && (
              <a 
                id="modal-product-link"
                href={selectedItem.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="secondary-button"
              >
                View Original
              </a>
            )}
            <button 
              id="modal-delete"
              className="danger-button"
              onClick={() => handleDeleteItem(selectedItem.addedAt)}
            >
              Remove from Wardrobe
            </button>
          </div>
        </div>
      </div>
    );
  }