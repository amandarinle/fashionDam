// background.js - Fixed version
console.log('Virtual Closet background script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'scrapeCurrentPage') {
    console.log('Received request to scrape current page');
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('No active tab found');
        sendResponse({ error: 'No active tab found' });
        return;
      }
      
      const activeTab = tabs[0];
      
      // Try to extract product info using content script first
      chrome.tabs.sendMessage(
        activeTab.id, 
        { action: 'extractProductInfo' }, 
        (response) => {
          // Handle errors communicating with content script
          if (chrome.runtime.lastError) {
            console.error('Error communicating with content script:', chrome.runtime.lastError);
            // Take a screenshot as fallback when content script fails
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
              const fallbackResponse = {
                title: activeTab.title || 'Unknown Product',
                imageUrl: dataUrl,
                url: activeTab.url,
                timestamp: new Date().toISOString()
              };
              processProductInfo(fallbackResponse, sendResponse);
            });
            return;
          }
          
          // If no image was found, try screenshot as fallback
          if (!response || !response.imageUrl) {
            // Take a screenshot of the visible tab
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
              if (chrome.runtime.lastError) {
                console.error('Screenshot failed:', chrome.runtime.lastError);
                sendResponse({ error: 'Failed to capture product information' });
              } else if (response) {
                console.log('Using screenshot as product image');
                response.imageUrl = dataUrl;
                processProductInfo(response, sendResponse);
              } else {
                const screenshotResponse = {
                  title: activeTab.title || 'Unknown Product',
                  imageUrl: dataUrl,
                  url: activeTab.url,
                  timestamp: new Date().toISOString()
                };
                processProductInfo(screenshotResponse, sendResponse);
              }
            });
          } else {
            console.log('Received product info from content script:', response);
            processProductInfo(response, sendResponse);
          }
        }
      );
    });
    
    return true; // Indicates we will respond asynchronously
  }
});

/**
 * Process and store product information
 * @param {Object} response - The product info to process
 * @param {Function} sendResponse - Function to send response back to popup
 */
function processProductInfo(response, sendResponse) {
  // Save to storage
  if (response && response.imageUrl) {
    // Simple category detection
    let category = 'other';
    const text = (response.title + ' ' + (response.description || '')).toLowerCase();
    
    if (text.includes('shirt') || text.includes('top') || text.includes('tee') || text.includes('sweater')) {
      category = 'tops';
    } else if (text.includes('pant') || text.includes('jean') || text.includes('skirt') || text.includes('short')) {
      category = 'bottoms';
    } else if (text.includes('shoe') || text.includes('boot') || text.includes('sneaker')) {
      category = 'shoes';
    } else if (text.includes('dress')) {
      category = 'dresses';
    } else if (text.includes('jacket') || text.includes('coat')) {
      category = 'outerwear';
    }
    
    // Add category to the product
    const productWithCategory = {
      ...response,
      category,
      addedAt: new Date().toISOString()
    };
    
    // Store in Chrome storage
    chrome.storage.local.get('wardrobe', (data) => {
      const wardrobe = data.wardrobe || [];
      wardrobe.push(productWithCategory);
      
      chrome.storage.local.set({ wardrobe }, () => {
        sendResponse({ 
          success: true, 
          message: 'Product added to your virtual wardrobe',
          product: productWithCategory
        });
      });
    });
  } else {
    sendResponse({ 
      error: 'Could not detect product information on this page.' 
    });
  }
}
  
  