// Handle manual image selection
const handleManualImageSelection = async () => {
  setScrapeStatus('loading');
  setMessage(null);
  
  try {
    // Check if chrome is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setScrapeStatus('error');
      setMessage({ 
        type: 'error', 
        text: 'Extension API not available. Are you running in development mode?' 
      });
      return;
    }
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        setScrapeStatus('error');
        setMessage({ type: 'error', text: 'No active tab found' });
        return;
      }
      
      const activeTab = tabs[0];
      
      // Inject the image selector content script
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['image-selector.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error injecting script:', chrome.runtime.lastError);
          setScrapeStatus('error');
          setMessage({ 
            type: 'error', 
            text: 'Failed to inject image selector: ' + chrome.runtime.lastError.message 
          });
          return;
        }
        
        // Start image selection mode
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: 'startImageSelection' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error:', chrome.runtime.lastError);
              setScrapeStatus('error');
              setMessage({ 
                type: 'error', 
                text: 'Failed to start image selection mode.'
              });
              return;
            }
            
            if (response && response.cancelled) {
              setScrapeStatus(null);
              setMessage(null);
              return;
            }
            
            if (response && response.imageUrl) {
              // Create a product info object from the selected image
              const productInfo = {
                title: response.title || activeTab.title || 'Unknown Product',
                imageUrl: response.imageUrl,
                url: activeTab.url,
                description: response.alt || '',
                timestamp: new Date().toISOString(),
                extractionMethod: 'manual-selection'
              };
              
              // Save to storage using the background script
              chrome.runtime.sendMessage({
                action: 'saveProductInfo',
                productInfo
              }, (saveResponse) => {
                if (chrome.runtime.lastError) {
                  console.error('Error saving:', chrome.runtime.lastError);
                  setScrapeStatus('error');
                  setMessage({ 
                    type: 'error', 
                    text: 'Failed to save selected image.'
                  });
                  return;
                }
                
                setScrapeStatus('success');
                setMessage({ 
                  type: 'success', 
                  text: 'Image added to your wardrobe!'
                });
                
                // Refresh wardrobe
                loadWardrobe();
              });
            } else {
              setScrapeStatus('error');
              setMessage({ 
                type: 'error', 
                text: 'No image was selected.'
              });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error('Selection error:', error);
    setScrapeStatus('error');
    setMessage({ 
      type: 'error', 
      text: 'Failed to start image selection: ' + error.message 
    });
  }
};import { useState, useEffect } from 'react';
import './App.css';

function App() {
const [tab, setTab] = useState('wardrobe'); // 'wardrobe', 'outfits', 'add'
const [wardrobe, setWardrobe] = useState([]);
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState(null);
const [scrapeStatus, setScrapeStatus] = useState(null);
const [debugMode, setDebugMode] = useState(false);

// Load wardrobe data on component mount
useEffect(() => {
  loadWardrobe();
}, []);

// Load wardrobe from Chrome storage
const loadWardrobe = async () => {
  setLoading(true);
  try {
    // Check if chrome.storage is available (in extension environment)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('wardrobe', (data) => {
        console.log('Loaded wardrobe data:', data.wardrobe);
        setWardrobe(data.wardrobe || []);
        setLoading(false);
      });
    } else {
      console.warn('Chrome storage not available. Using mock data.');
      // Mock data for development outside extension
      setWardrobe([]);
      setLoading(false);
    }
  } catch (error) {
    console.error('Error loading wardrobe:', error);
    setMessage({ type: 'error', text: 'Failed to load your wardrobe.' });
    setLoading(false);
  }
};

// Delete an item from the wardrobe
const handleDeleteItem = (timestamp) => {
  if (confirm('Are you sure you want to remove this item from your wardrobe?')) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('wardrobe', (data) => {
        const updatedWardrobe = (data.wardrobe || []).filter(
          item => item.addedAt !== timestamp
        );
        
        chrome.storage.local.set({ wardrobe: updatedWardrobe }, () => {
          setWardrobe(updatedWardrobe);
          setMessage({ type: 'success', text: 'Item removed from your wardrobe.' });
          
          // Clear message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        });
      });
    }
  }
};

// Handle scraping the current page
const handleScrapeCurrentPage = async () => {
  setScrapeStatus('loading');
  setMessage(null);
  
  try {
    // Check if chrome is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setScrapeStatus('error');
      setMessage({ 
        type: 'error', 
        text: 'Extension API not available. Are you running in development mode?' 
      });
      return;
    }
    
    // Send message to background script
    chrome.runtime.sendMessage({ 
      action: 'scrapeCurrentPage' 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setScrapeStatus('error');
        setMessage({ 
          type: 'error', 
          text: 'Failed to communicate with the extension: ' + chrome.runtime.lastError.message 
        });
        return;
      }
      
      if (response && response.error) {
        setScrapeStatus('error');
        setMessage({ type: 'error', text: response.error });
      } else if (response && response.success) {
        setScrapeStatus('success');
        setMessage({ 
          type: 'success', 
          text: response.message || 'Item added to your wardrobe!' 
        });
        
        console.log('Product added to wardrobe:', response.product);
        
        // Refresh wardrobe
        loadWardrobe();
      } else {
        setScrapeStatus('error');
        setMessage({ 
          type: 'error', 
          text: 'Unknown response from extension' 
        });
      }
    });
  } catch (error) {
    console.error('Scraping error:', error);
    setScrapeStatus('error');
    setMessage({ 
      type: 'error', 
      text: 'Failed to extract product information: ' + error.message 
    });
  }
};

// Render item card
const renderItemCard = (item) => (
  <div className="item-card" key={item.addedAt}>
    {item.imageUrl && (
      <div className="item-image">
        <img 
          src={item.imageUrl} 
          alt={item.title || 'Product image'} 
          onError={(e) => {
            console.error('Image failed to load:', item.imageUrl);
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
          }}
        />
      </div>
    )}
    <div className="item-details">
      <h3>{item.title || 'Unknown Product'}</h3>
      {item.brand && <p className="item-brand">{item.brand}</p>}
      {item.price && <p className="item-price">{item.price}</p>}
      <p className="item-category">Category: {item.category || 'Uncategorized'}</p>
      <button 
        className="delete-button"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteItem(item.addedAt);
        }}
      >
        Remove
      </button>
    </div>
  </div>
);

// Render wardrobe tab
const renderWardrobe = () => {
  if (loading) return <div className="loading">Loading your wardrobe...</div>;
  
  if (wardrobe.length === 0) {
    return (
      <div className="empty-state">
        <p>Your wardrobe is empty. Add items by clicking "Add to Wardrobe" while viewing product pages.</p>
      </div>
    );
  }
  
  // Debug view
  if (debugMode) {
    return (
      <div className="debug-view">
        <h2>Debug View</h2>
        <button onClick={() => setDebugMode(false)}>Hide Debug Info</button>
        <button onClick={() => {
          if (confirm('Clear all wardrobe data?')) {
            chrome.storage.local.set({ wardrobe: [] }, () => {
              setWardrobe([]);
              setMessage({ type: 'success', text: 'Wardrobe data cleared.' });
            });
          }
        }}>Clear All Data</button>
        
        <pre className="debug-data">
          {JSON.stringify(wardrobe, null, 2)}
        </pre>
      </div>
    );
  }
  
  // Group items by category
  const groupedItems = wardrobe.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});
  
  return (
    <div className="wardrobe-container">
      <div className="controls">
        <button className="debug-button" onClick={() => setDebugMode(true)}>
          Debug Mode
        </button>
        <button className="refresh-button" onClick={loadWardrobe}>
          Refresh Data
        </button>
      </div>
    
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="category-section">
          <h2 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h2>
          <div className="items-grid">
            {items.map(renderItemCard)}
          </div>
        </div>
      ))}
    </div>
  );
};

// Render add tab
const renderAddTab = () => (
  <div className="add-tab">
    <h2>Add to Your Wardrobe</h2>
    <p>Navigate to a product page on any shopping website, then click one of the buttons below:</p>
    
    <div className="button-group">
      <button 
        className={`scrape-button ${scrapeStatus === 'loading' ? 'loading' : ''}`}
        onClick={handleScrapeCurrentPage}
        disabled={scrapeStatus === 'loading'}
      >
        {scrapeStatus === 'loading' ? 'Adding to Wardrobe...' : 'Auto-Detect Item'}
      </button>
      
      <button 
        className="select-image-button"
        onClick={handleManualImageSelection}
        disabled={scrapeStatus === 'loading'}
      >
        Select Image Manually
      </button>
    </div>
    
    {message && (
      <div className={`message ${message.type}`}>
        {message.text}
      </div>
    )}
  </div>
);

// Render outfits tab (placeholder for now)
const renderOutfits = () => (
  <div className="outfits-tab">
    <h2>Your Outfits</h2>
    <p>This feature is coming soon! You'll be able to create and save outfits here.</p>
  </div>
);

return (
  <div className="app">
    <header className="header">
      <h1>Virtual Closet</h1>
    </header>
    
    <main className="main-content">
      {tab === 'wardrobe' && renderWardrobe()}
      {tab === 'outfits' && renderOutfits()}
      {tab === 'add' && renderAddTab()}
    </main>
    
    <nav className="navigation">
      <button 
        className={tab === 'wardrobe' ? 'active' : ''} 
        onClick={() => setTab('wardrobe')}
      >
        My Wardrobe
      </button>
      <button 
        className={tab === 'outfits' ? 'active' : ''} 
        onClick={() => setTab('outfits')}
      >
        Outfits
      </button>
      <button 
        className={tab === 'add' ? 'active' : ''} 
        onClick={() => setTab('add')}
      >
        Add Item
      </button>
    </nav>
  </div>
);
}

export default App;
