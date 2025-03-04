// content.js - Fixed version
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
  productImage: [
    // First look for product main images
    'img.product-image', 
    '.product-image img', 
    '.product-featured-image', 
    '#product-image',
    // Fallback to any large image on the page
    'img[width="500"]',
    'img[width="600"]',
    'img[width="800"]',
    // Last resort, grab the largest image
    'img'
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
  if (message.action === 'extractProductInfo') {
    console.log('Extracting product info...');
    
    const productInfo = {
      title: document.title || '',
      price: '',
      brand: '',
      imageUrl: '',
      description: '',
      url: window.location.href,
      timestamp: new Date().toISOString(),
      extractionMethod: 'none' // Track how we got the data
    };
    
    try {
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
      
      // Advanced image detection
      console.log('Beginning image detection...');
      let productImage = null;
      
      // Method 1: Check specific selectors
      for (const selector of selectors.productImage) {
        const element = document.querySelector(selector);
        if (element && element.src && element.src.startsWith('http') && 
            !element.src.includes('icon') && element.naturalWidth > 100) {
          productImage = element;
          productInfo.extractionMethod = 'selector';
          console.log('Found image using selector:', selector);
          break;
        }
      }
      
      // Method 2: Find images in product containers
      if (!productImage) {
        console.log('Trying product containers...');
        const productContainers = [
          '.product-main',
          '.product-image-container',
          '.product-gallery',
          '.product-media',
          '.pdp-image',
          '[data-testid="product-image"]',
          '.gallery-image'
        ];
        
        for (const containerSelector of productContainers) {
          const container = document.querySelector(containerSelector);
          if (container) {
            const img = container.querySelector('img');
            if (img && img.src && img.src.startsWith('http') && img.naturalWidth > 100) {
              productImage = img;
              productInfo.extractionMethod = 'container';
              console.log('Found image in container:', containerSelector);
              break;
            }
          }
        }
      }
      
      // Method 3: Look for structured data (JSON-LD)
      if (!productImage) {
        console.log('Trying JSON-LD...');
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent);
            console.log('Found JSON-LD data:', data);
            
            const findImage = (obj) => {
              if (!obj) return null;
              if (obj.image) return obj.image;
              if (Array.isArray(obj)) {
                for (const item of obj) {
                  const result = findImage(item);
                  if (result) return result;
                }
              } else if (typeof obj === 'object') {
                for (const key in obj) {
                  const result = findImage(obj[key]);
                  if (result) return result;
                }
              }
              return null;
            };
            
            const imageUrl = findImage(data);
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
              productInfo.imageUrl = imageUrl;
              productInfo.extractionMethod = 'json-ld';
              console.log('Found image in JSON-LD:', imageUrl);
              break;
            }
          } catch (e) {
            console.error('Error parsing JSON-LD script:', e);
          }
        }
      }
      
      // Method 4: Check meta tags (Open Graph or Twitter cards)
      if (!productInfo.imageUrl) {
        console.log('Trying meta tags...');
        const metaImage = document.querySelector('meta[property="og:image"]') || 
                          document.querySelector('meta[name="twitter:image"]');
        if (metaImage && metaImage.content && metaImage.content.startsWith('http')) {
          productInfo.imageUrl = metaImage.content;
          productInfo.extractionMethod = 'meta';
          console.log('Found image in meta tag:', productInfo.imageUrl);
        }
      }
      
      // Method 5: Last resort - find the largest image on the page
      if (!productInfo.imageUrl && !productImage) {
        console.log('Trying largest image approach...');
        const images = Array.from(document.querySelectorAll('img'));
        console.log(`Found ${images.length} images on page`);
        
        let largestImage = null;
        let largestArea = 0;
        
        for (const img of images) {
          // Skip tiny, non-http, or data/icon/logo images
          if (!img.src || !img.src.startsWith('http') || 
              img.src.includes('icon') || img.src.includes('logo') ||
              img.width < 100 || img.height < 100) {
            continue;
          }
          
          const area = img.width * img.height;
          console.log(`Image ${img.src} - size: ${img.width}x${img.height}, area: ${area}`);
          
          if (area > largestArea) {
            largestArea = area;
            largestImage = img;
          }
        }
        
        if (largestImage) {
          productImage = largestImage;
          productInfo.extractionMethod = 'largest';
          console.log('Using largest image:', largestImage.src, `${largestImage.width}x${largestImage.height}`);
        }
      }
      
      // Set the image URL if we found a valid image element
      if (productImage && productImage.src) {
        productInfo.imageUrl = productImage.src;
        
        // Some sites use data-src for lazy loading
        if (!productInfo.imageUrl || productInfo.imageUrl.includes('data:image')) {
          const altSrc = productImage.getAttribute('data-src') || 
                        productImage.getAttribute('data-lazy-src') ||
                        productImage.getAttribute('data-original');
                        
          if (altSrc && altSrc.startsWith('http')) {
            productInfo.imageUrl = altSrc;
            productInfo.extractionMethod += '-lazy';
          }
        }
      }
      
      console.log('Final product info:', productInfo);
      
    } catch (error) {
      console.error('Error during extraction:', error);
      productInfo.error = error.message;
    }
    
    sendResponse(productInfo);
  }
  return true; // Indicate async response
});