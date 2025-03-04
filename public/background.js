// background.js with AI Vision integration
console.log('Virtual Closet background script loaded');

// Configure your OpenAI API key here - in a production extension, 
// this would be better stored securely or retrieved from a server
// NOTE: This key would be visible to users who inspect the extension code
const OPENAI_API_KEY = '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'; // Replace with your actual key

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
      
      // First try to extract product info using content script
      chrome.tabs.sendMessage(
        activeTab.id, 
        { action: 'extractProductInfo' }, 
        async (response) => {
          // Handle errors communicating with content script
          if (chrome.runtime.lastError) {
            console.error('Error communicating with content script:', chrome.runtime.lastError);
            // Take a screenshot as fallback when content script fails
            takeScreenshotAndProcess(activeTab, sendResponse);
            return;
          }
          
          // If no image was found, try screenshot as fallback
          if (!response || !response.imageUrl) {
            // Take a screenshot of the visible tab
            takeScreenshotAndProcess(activeTab, sendResponse, response);
          } else {
            console.log('Received product info from content script:', response);
            processProductInfo(response, sendResponse);
          }
        }
      );
    });
    
    return true; // Indicates we will respond asynchronously
  }
  
  // Handle saving manually selected product info
  if (message.action === 'saveProductInfo') {
    console.log('Saving manually selected product info:', message.productInfo);
    processProductInfo(message.productInfo, sendResponse);
    return true; // Indicates we will respond asynchronously
  }
});

/**
 * Takes a screenshot and processes it to extract product image
 * @param {Object} tab - The active tab
 * @param {Function} sendResponse - Function to send response back to popup
 * @param {Object} existingInfo - Any info already collected about the product
 */
function takeScreenshotAndProcess(tab, sendResponse, existingInfo = null) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, async function(dataUrl) {
    if (chrome.runtime.lastError) {
      console.error('Screenshot failed:', chrome.runtime.lastError);
      sendResponse({ error: 'Failed to capture product information' });
      return;
    }
    
    try {
      // Option 1: Use the full screenshot
      const screenshotResponse = {
        ...(existingInfo || {}),
        title: existingInfo?.title || tab.title || 'Unknown Product',
        imageUrl: dataUrl,
        url: tab.url,
        timestamp: new Date().toISOString(),
        extractionMethod: 'screenshot'
      }; 
      processProductInfo(screenshotResponse, sendResponse);
    } catch (error) {
      console.error('Error processing screenshot:', error);
      sendResponse({ 
        error: 'Error processing screenshot: ' + error.message 
      });
    }
  });
}

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
  
  