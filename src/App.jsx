import { useState, useEffect } from 'react';
import './App.css';

function App() {
const [tab, setTab] = useState('wardrobe'); // 'wardrobe', 'outfits', 'add'
const [wardrobe, setWardrobe] = useState([]);
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState(null);
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

// Open the full page view
const openFullPage = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'openFullPage' });
  } else {
    setMessage({ type: 'error', text: 'Full page view is only available in the extension.' });
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
        <p>Your wardrobe is empty. Add items by right-clicking on clothing images while browsing.</p>
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
        <button className="full-page-button" onClick={openFullPage}>
          Open Full Page View
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
    <p>To add clothing items to your wardrobe, simply right-click on any clothing image while browsing and select "Add to Virtual Closet" from the context menu.</p>
    
    <div className="add-method">
      <img src="right-click-demo.png" alt="Right Click Demo" className="demo-image" />
      <p>Browse your favorite clothing websites and use the right-click menu to quickly add items.</p>
    </div>
    
    <button 
      className="full-page-button"
      onClick={openFullPage}
    >
      Open Full Page View
    </button>
    
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
    <button className="full-page-button" onClick={openFullPage}>
      Open Full Page View
    </button>
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