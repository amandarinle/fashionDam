// image-selector.js
// This script gets injected when the user wants to manually select an image

let selectionMode = false;
let highlightedElement = null;
let originalBorder = '';

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startImageSelection') {
    selectionMode = true;
    
    // Show instructions to the user
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'virtual-closet-selector-instructions';
    instructionsDiv.style.position = 'fixed';
    instructionsDiv.style.top = '0';
    instructionsDiv.style.left = '0';
    instructionsDiv.style.width = '100%';
    instructionsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    instructionsDiv.style.color = 'white';
    instructionsDiv.style.padding = '12px';
    instructionsDiv.style.zIndex = '999999';
    instructionsDiv.style.textAlign = 'center';
    instructionsDiv.style.fontSize = '16px';
    instructionsDiv.innerHTML = 'Click on the product image you want to add to your Virtual Closet. <button id="cancel-selection">Cancel</button>';
    
    document.body.appendChild(instructionsDiv);
    
    document.getElementById('cancel-selection').addEventListener('click', () => {
      cancelSelection();
      sendResponse({ cancelled: true });
    });
    
    // Add hover effect to all images
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
      if (img.width > 100 && img.height > 100) {
        img.setAttribute('data-vc-selectable', 'true');
        
        img.addEventListener('mouseenter', () => {
          if (selectionMode) {
            if (highlightedElement) {
              highlightedElement.style.border = originalBorder;
            }
            originalBorder = img.style.border;
            img.style.border = '3px solid #4a6fa5';
            img.style.cursor = 'pointer';
            highlightedElement = img;
          }
        });
        
        img.addEventListener('mouseleave', () => {
          if (selectionMode && img === highlightedElement) {
            img.style.border = originalBorder;
          }
        });
        
        img.addEventListener('click', (e) => {
          if (selectionMode) {
            e.preventDefault();
            e.stopPropagation();
            
            const selectedImageData = {
              imageUrl: img.src,
              width: img.width,
              height: img.height,
              alt: img.alt || '',
              title: document.title || '',
              url: window.location.href
            };
            
            // Clean up the selection mode
            cancelSelection();
            
            // Send the image data back
            sendResponse(selectedImageData);
          }
        });
      }
    });
    
    return true; // Indicate async response
  }
});

function cancelSelection() {
  selectionMode = false;
  
  // Remove instructions
  const instructions = document.getElementById('virtual-closet-selector-instructions');
  if (instructions) {
    instructions.remove();
  }
  
  // Reset any highlighted element
  if (highlightedElement) {
    highlightedElement.style.border = originalBorder;
    highlightedElement = null;
  }
  
  // Remove hover effects
  const selectableImages = document.querySelectorAll('[data-vc-selectable="true"]');
  selectableImages.forEach(img => {
    img.removeAttribute('data-vc-selectable');
  });
}