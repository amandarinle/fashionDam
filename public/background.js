// background.js 
console.log('Virtual Closet background script loaded');

// Create context menu and browser action when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for right-clicking on images
  chrome.contextMenus.create({
    id: "addToVirtualCloset",
    title: "Add to Virtual Closet",
    contexts: ["image"]
  });
  
  // Create browser action button
  chrome.action.onClicked.addListener(() => {
    // When the extension icon is clicked (not the popup), open the full page
    openFullPage();
  });
});

// Function to open the extension as a full page
function openFullPage() {
  // Make sure we use the correct path with extension:// protocol
  const fullPageURL = chrome.runtime.getURL('fullpage.html');
  console.log('Attempting to open fullpage URL:', fullPageURL);
  
  // Check if the fullpage is already open
  chrome.tabs.query({url: fullPageURL}, (tabs) => {
    if (tabs.length > 0) {
      // If already open, just focus that tab
      chrome.tabs.update(tabs[0].id, {active: true});
    } else {
      // Otherwise, open a new tab with our full page
      chrome.tabs.create({url: fullPageURL});
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToVirtualCloset") {
    console.log("Context menu item clicked");
    
    // Get the image URL that was right-clicked
    const imageUrl = info.srcUrl;
    
    if (imageUrl) {
      // Try to extract product info from the page
      chrome.tabs.sendMessage(
        tab.id, 
        { 
          action: 'extractProductInfoForImage',
          imageUrl: imageUrl  
        }, 
        (response) => {
          // Handle errors communicating with content script
          if (chrome.runtime.lastError) {
            console.error('Error communicating with content script:', chrome.runtime.lastError);
            // Create fallback product info with just the image
            const fallbackResponse = {
              title: tab.title || 'Unknown Product',
              imageUrl: imageUrl,
              url: tab.url,
              timestamp: new Date().toISOString()
            };
            processProductInfo(fallbackResponse);
            return;
          }
          
          if (response) {
            // Make sure we're using the right-clicked image
            response.imageUrl = imageUrl;
            processProductInfo(response);
          } else {
            // Fallback if no response
            const fallbackResponse = {
              title: tab.title || 'Unknown Product',
              imageUrl: imageUrl,
              url: tab.url,
              timestamp: new Date().toISOString()
            };
            processProductInfo(fallbackResponse);
          }
        }
      );
    }
  }
});

// Listen for messages from the popup or fullpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openFullPage') {
    // Open the full page view
    openFullPage();
    sendResponse({ success: true });
  } else if (message.action === 'getWardrobe') {
    // Get wardrobe data for fullpage or popup
    chrome.storage.local.get('wardrobe', (data) => {
      sendResponse({ 
        success: true,
        wardrobe: data.wardrobe || []
      });
    });
    return true; // Will respond asynchronously
  } else if (message.action === 'updateWardrobe') {
    // Save updated wardrobe data from fullpage
    if (message.wardrobe) {
      chrome.storage.local.set({ wardrobe: message.wardrobe }, () => {
        sendResponse({ success: true });
      });
      return true; // Will respond asynchronously
    }
  }
});

/**
 * Process and store product information
 * @param {Object} response - The product info to process
 * @param {Function} sendResponse - Optional function to send response back to popup
 */
function processProductInfo(response, sendResponse = null) {
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
        // Show a notification to the user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/vite.svg',
          title: 'Virtual Closet',
          message: 'Item added to your wardrobe!'
        });
        
        if (sendResponse) {
          sendResponse({ 
            success: true, 
            message: 'Product added to your virtual wardrobe',
            product: productWithCategory
          });
        }
        
        // Broadcast update to any open instances of the extension
        chrome.runtime.sendMessage({
          action: 'wardrobeUpdated',
          wardrobe: wardrobe
        });
      });
    });
  } else if (sendResponse) {
    sendResponse({ 
      error: 'Could not detect product information on this page.' 
    });
  }
}
  
  