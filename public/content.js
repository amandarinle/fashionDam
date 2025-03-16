// content.js - Focused on reliable price and brand extraction
console.log('Virtual Closet content script loaded');

// Basic selectors for common product information
const selectors = {
  productTitle: [
    'h1', '.product-title', '.product-name', '.pdp-title',
    '[class*="productName"]', '[class*="product-title"]'
  ],
  productPrice: [
    '.price', '.product-price', 'span.price', 'div.price',
    'p.price', '[class*="productPrice"]', '[class*="price"]',
    '.offer-price', '.current-price', '.sale-price', '.pdp-price',
    '.discount-price', '.promo-price', '.special-price',
    '[class*="sale"]', '[class*="discount"]', '[class*="promo"]'
  ],
  productBrand: [
    '.brand', '.product-brand', '.vendor', '.manufacturer',
    '.product-vendor', '.designer', '[class*="Brand"]',
    '[class*="Designer"]', '[class*="Maker"]', 'meta[property="og:brand"]'
  ],
  productDescription: [
    '.product-description', '.description', '#description',
    '[class*="description"]', '[class*="product-detail"]',
    'meta[name="description"]', 'meta[property="og:description"]'
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
    timestamp: new Date().toISOString()
  };
  
  try {
    // Extract product title
    for (const selector of selectors.productTitle) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        productInfo.title = element.textContent.trim();
        console.log('Found title:', productInfo.title);
        break;
      }
    }
    
    // Extract product price
    const priceElements = [];
    for (const selector of selectors.productPrice) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && /[\$\€\£\¥\₹\₩\₣]|\d+\.\d{2}|\d+\,\d{2}/.test(text)) {
          priceElements.push({
            text: text,
            selector: selector,
            element: element
          });
          console.log('Found potential price:', text);
        }
      });
    }
    
    if (priceElements.length > 0) {
      const rawPrice = prioritizePriceSelection(priceElements);
      productInfo.price = formatPrice(rawPrice);
    } else {
      // Try extracting price from any text on the page
      const allTextElements = document.querySelectorAll('p, span, div');
      for (const element of allTextElements) {
        const extractedPrice = extractPriceFromText(element.textContent);
        if (extractedPrice) {
          productInfo.price = formatPrice(extractedPrice);
          console.log('Found price via pattern:', productInfo.price);
          break;
        }
      }
    }
    
    // If we still don't have a price, try structured data
    if (!productInfo.price) {
      extractFromStructuredData(productInfo);
      if (productInfo.price) {
        productInfo.price = formatPrice(productInfo.price);
        console.log('Found price from structured data:', productInfo.price);
      }
    }
    
    // Extract product brand
    for (const selector of selectors.productBrand) {
      const element = document.querySelector(selector);
      if (element) {
        let brandText = "";
        
        if (element.tagName === 'META' && element.content) {
          brandText = element.content.trim();
        } else if (element.textContent.trim()) {
          brandText = element.textContent.trim();
        }
        
        // Validate brand text - should be short and not look like code
        if (brandText && 
            brandText.length < 50 && // Brand names are typically short
            !brandText.includes('{') && // Not JSON/code
            !brandText.includes('window') && // Not JavaScript
            !brandText.includes('function') && // Not code
            !brandText.includes('var ') && // Not JavaScript
            !brandText.startsWith('Skip to') && // Not navigation text
            !/^\s*[\[\{\(]/.test(brandText)) { // Not starting with brackets
          
          productInfo.brand = brandText;
          console.log('Found brand:', productInfo.brand);
          break;
        }
      }
    }
    
    // If no brand found yet, try structured data
    if (!productInfo.brand) {
      extractFromStructuredData(productInfo);
      if (productInfo.brand) {
        console.log('Found brand from structured data:', productInfo.brand);
      }
    }
    
    // If still no brand, try URL
    if (!productInfo.brand) {
      const urlBrands = extractBrandFromUrl(window.location.href);
      if (urlBrands.length > 0) {
        productInfo.brand = urlBrands[0];
        console.log('Found brand from URL:', productInfo.brand);
      }
    }
    
    // Extract product description
    for (const selector of selectors.productDescription) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.tagName === 'META' && element.content) {
          productInfo.description = element.content.trim();
        } else if (element.textContent.trim()) {
          productInfo.description = element.textContent.trim();
        }
        
        if (productInfo.description) {
          console.log('Found description with length:', productInfo.description.length);
          break;
        }
      }
    }
    
    console.log('Final product info:', productInfo);
    return productInfo;
    
  } catch (error) {
    console.error('Error during extraction:', error);
    productInfo.error = error.message;
    return productInfo;
  }
}

/**
 * Format price to consistent $XX.XX format
 * @param {string} priceString - Raw price string
 * @returns {string} Formatted price string
 */
function formatPrice(priceString) {
  if (!priceString) return '';
  
  // Extract currency symbol and numeric value
  const currencyMatch = priceString.match(/[\$\€\£\¥\₹\₩\₣]/);
  const currencySymbol = currencyMatch ? currencyMatch[0] : '$';
  
  // Extract numeric part (handles both dot and comma as decimal separator)
  const numericMatch = priceString.match(/\d+(?:[.,]\d+)*/);
  if (!numericMatch) return '';
  
  let numericPart = numericMatch[0];
  
  // Standardize to dot as decimal separator if comma is used
  if (numericPart.includes(',')) {
    // If it's likely a decimal comma (e.g., 19,99)
    if (numericPart.split(',')[1].length <= 2) {
      numericPart = numericPart.replace(',', '.');
    } 
    // If it's likely a thousands separator (e.g., 1,999)
    else {
      numericPart = numericPart.replace(/,/g, '');
    }
  }
  
  // Convert to a number and format with 2 decimal places
  const price = parseFloat(numericPart);
  if (isNaN(price)) return '';
  
  return `${currencySymbol}${price.toFixed(2)}`;
}

// Improved structured data parsing
function extractFromStructuredData(productInfo) {
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);

      const processObject = (obj) => {
        if (!obj) return;

        if (obj['@type'] === 'Product') {
          if (!productInfo.brand && obj.brand) {
            if (typeof obj.brand === 'string') {
              productInfo.brand = obj.brand.trim();
            } else if (obj.brand.name) {
              productInfo.brand = obj.brand.name.trim();
            }
          }
          
          if (!productInfo.price && obj.offers) {
            if (obj.offers.price) {
              productInfo.price = obj.offers.price + (obj.offers.priceCurrency ? ' ' + obj.offers.priceCurrency : '');
            } else if (Array.isArray(obj.offers) && obj.offers.length > 0 && obj.offers[0].price) {
              productInfo.price = obj.offers[0].price + (obj.offers[0].priceCurrency ? ' ' + obj.offers[0].priceCurrency : '');
            }
          }
          
          if (!productInfo.description && obj.description) {
            productInfo.description = obj.description;
          }
        }

        if (typeof obj === 'object') {
          for (const key in obj) {
            if (typeof obj[key] === 'object') processObject(obj[key]);
          }
        }
      };

      processObject(data);

    } catch (error) {
      console.error('Error parsing JSON-LD:', error);
    }
  });
}

// URL brand extraction for fashion sites
function extractBrandFromUrl(url) {
  const commonFashionKeywords = ['brand', 'designer', 'vendor', 'label'];
  const urlSegments = url.split('/');

  return urlSegments.filter(segment =>
    commonFashionKeywords.some(keyword => segment.toLowerCase().includes(keyword))
  ).map(segment => segment.replace(/[-_]/g, ' '));
}

// Improved regex for price extraction - focuses on getting just the price
function extractPriceFromText(text) {
  // Match common price patterns
  const priceMatches = text.match(/(?:[\$\€\£\¥\₹\₩\₣])\s?\d+(?:[.,]\d+)*/g);
  
  if (!priceMatches || priceMatches.length === 0) return '';
  
  // Take the first match that looks like a proper price (not a product code or dimension)
  for (const match of priceMatches) {
    // Verify it's not followed by units or other text (to avoid things like "$10 shipping" or "$5 off")
    if (!/(?:off|shipping|handling|fee)/.test(match.toLowerCase())) {
      return match.trim();
    }
  }
  
  return priceMatches[0].trim(); // Default to first match if no better candidates
}

// Improved price prioritization logic
function prioritizePriceSelection(prices) {
  if (prices.length === 0) return '';
  
  // First, filter out likely non-prices (like "from $X" or "starting at $X")
  const filteredPrices = prices.filter(p => {
    const text = p.text.toLowerCase();
    return !text.includes('from') && 
           !text.includes('starting') && 
           !text.includes('up to') &&
           !text.includes('as low as');
  });
  
  // If we have filtered prices, use those; otherwise, use original list
  const pricesToConsider = filteredPrices.length > 0 ? filteredPrices : prices;
  
  // Sort by price priority
  const sortedPrices = pricesToConsider.sort((a, b) => {
    const textA = a.text.toLowerCase();
    const textB = b.text.toLowerCase();
    
    // Prefer sale or current prices
    const isSaleA = textA.includes('sale') || textA.includes('now') || textA.includes('current');
    const isSaleB = textB.includes('sale') || textB.includes('now') || textB.includes('current');
    
    // Deprioritize original/regular prices
    const isRegularA = textA.includes('regular') || textA.includes('original') || textA.includes('was');
    const isRegularB = textB.includes('regular') || textB.includes('original') || textB.includes('was');
    
    if (isSaleA && !isSaleB) return -1;
    if (!isSaleA && isSaleB) return 1;
    if (!isRegularA && isRegularB) return -1;
    if (isRegularA && !isRegularB) return 1;
    
    return 0;
  });
  
  return sortedPrices[0]?.text || '';
}

// For debugging purposes only
console.log('Virtual Closet content script ready to extract product information');