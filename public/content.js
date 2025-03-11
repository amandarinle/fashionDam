// content.js
console.log('Virtual Closet content script loaded');

// Basic selectors that work on many e-commerce sites
const selectors = {
  productTitle: [
    'h1', // Most common for product titles
    'h1.product-title', 
    '.product-title',
    '.product-name',
    '.pdp-title'
  ],
  productPrice: [
    '.price', 
    '.product-price', 
    'span.price', 
    'div.price',
    'p.price',
    '.pdp-price'
  ],
  productBrand: [
    '.brand', 
    '.product-brand', 
    'a.brand',
    '.vendor'
  ],
  productDescription: [
    '.product-description', 
    '.description', 
    '#description',
    '.product-details'
  ]
};

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProductInfoForImage') {
    console.log('Extracting product info for specific image:', message.imageUrl);
    sendResponse(extractProductInfoForImage(message.imageUrl));
  }
  return true; // Indicate async response
});

/**
 * Extract product information for a specific image on the page
 * @param {string} targetImageUrl - The URL of the right-clicked image
 * @returns {Object} Product information
 */
function extractProductInfoForImage(targetImageUrl) {
  console.log('Looking for info related to image:', targetImageUrl);
  
  const productInfo = {
    title: document.title || '',
    price: '',
    brand: '',
    imageUrl: targetImageUrl, // We already have the image URL
    description: '',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    extractionMethod: 'right-click'
  };
  
  try {
    // Try to find the closest product container to this image
    const allImages = Array.from(document.querySelectorAll('img'));
    const targetImage = allImages.find(img => img.src === targetImageUrl);
    
    if (targetImage) {
      console.log('Found target image in DOM');
      
      // Look for product info near the image
      let currentElement = targetImage;
      let productContainer = null;
      let searchDepth = 0;
      const MAX_SEARCH_DEPTH = 5; // Don't search too far up the DOM
      
      // Search for a suitable product container up the DOM tree
      while (currentElement && searchDepth < MAX_SEARCH_DEPTH) {
        currentElement = currentElement.parentElement;
        searchDepth++;
        
        if (!currentElement) break;
        
        // Check if this element might be a product container
        const containsPrice = !!currentElement.querySelector('.price, [class*="price"]');
        const containsTitle = !!currentElement.querySelector('h1, h2, h3, [class*="title"], [class*="name"]');
        
        if (containsPrice || containsTitle) {
          productContainer = currentElement;
          break;
        }
        
        // Check some common product container classes
        const classList = currentElement.classList;
        if (classList.contains('product') || 
            classList.contains('item') || 
            classList.contains('card') ||
            currentElement.id.includes('product')) {
          productContainer = currentElement;
          break;
        }
      }
      
      // If we found a container, try to extract info from it
      if (productContainer) {
        console.log('Found potential product container:', productContainer);
        
        // Look for title
        const titleElement = productContainer.querySelector('h1, h2, h3, [class*="title"], [class*="name"]');
        if (titleElement) {
          productInfo.title = titleElement.textContent.trim();
        }
        
        // Look for price
        const priceElement = productContainer.querySelector('.price, [class*="price"]');
        if (priceElement) {
          productInfo.price = priceElement.textContent.trim();
        }
        
        // Look for brand
        const brandElement = productContainer.querySelector('[class*="brand"], [class*="vendor"]');
        if (brandElement) {
          productInfo.brand = brandElement.textContent.trim();
        }
        
        // Look for description
        const descElement = productContainer.querySelector('[class*="desc"], [class*="detail"]');
        if (descElement) {
          productInfo.description = descElement.textContent.trim();
        }
      } else {
        console.log('No product container found, using page-level extraction');
        // Fall back to page-level extraction
        extractBasicProductInfo(productInfo);
      }
    } else {
      console.log('Target image not found in DOM, using page-level extraction');
      // Fall back to page-level extraction
      extractBasicProductInfo(productInfo);
    }
    
    // Also try structured data for additional info
    tryExtractFromStructuredData(productInfo);
    
    console.log('Final product info for image:', productInfo);
    return productInfo;
    
  } catch (error) {
    console.error('Error during image-specific extraction:', error);
    productInfo.error = error.message;
    return productInfo;
  }
}

/**
 * Extract basic product information from the page
 * @param {Object} productInfo - The product info object to update
 */
function extractBasicProductInfo(productInfo) {
  // Extract title
  for (const selector of selectors.productTitle) {
    const element = document.querySelector(selector);
    if (element) {
      productInfo.title = element.textContent.trim();
      break;
    }
  }
  
  // Extract price
  for (const selector of selectors.productPrice) {
    const element = document.querySelector(selector);
    if (element) {
      productInfo.price = element.textContent.trim();
      break;
    }
  }
  
  // Extract brand
  for (const selector of selectors.productBrand) {
    const element = document.querySelector(selector);
    if (element) {
      productInfo.brand = element.textContent.trim();
      break;
    }
  }
  
  // Extract description
  for (const selector of selectors.productDescription) {
    const element = document.querySelector(selector);
    if (element) {
      productInfo.description = element.textContent.trim();
      break;
    }
  }
}

/**
 * Try to extract product info from structured data on the page
 * @param {Object} productInfo - The product info object to update
 */
function tryExtractFromStructuredData(productInfo) {
  // Look for JSON-LD
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      console.log('Found JSON-LD data:', data);
      
      const extractProductData = (obj) => {
        if (!obj) return;
        
        // Look for Product type
        if (obj['@type'] === 'Product') {
          if (!productInfo.title && obj.name) productInfo.title = obj.name;
          if (!productInfo.description && obj.description) productInfo.description = obj.description;
          if (!productInfo.brand && obj.brand && obj.brand.name) productInfo.brand = obj.brand.name;
          
          // Handle offers/price
          if (!productInfo.price && obj.offers) {
            if (obj.offers.price) {
              productInfo.price = obj.offers.price + (obj.offers.priceCurrency ? ' ' + obj.offers.priceCurrency : '');
            }
          }
        }
        
        // Recursively search arrays and objects
        if (Array.isArray(obj)) {
          for (const item of obj) {
            extractProductData(item);
          }
        } else if (typeof obj === 'object') {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              extractProductData(obj[key]);
            }
          }
        }
      };
      
      extractProductData(data);
      
    } catch (e) {
      console.error('Error parsing JSON-LD script:', e);
    }
  }
  
  // Look for Open Graph metadata
  if (!productInfo.title) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) productInfo.title = ogTitle.content;
  }
  
  if (!productInfo.description) {
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) productInfo.description = ogDesc.content;
  }
  
  // Look for meta description as fallback
  if (!productInfo.description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) productInfo.description = metaDesc.content;
  }
}