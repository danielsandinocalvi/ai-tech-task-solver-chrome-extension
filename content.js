// Content script for AI Tech Task Solver Chrome Extension
// Handles screenshot capture and result logging

(function() {
    'use strict';

    // Ensure html2canvas is available
    function ensureHtml2Canvas() {
        return new Promise((resolve, reject) => {
            if (window.html2canvas) {
                resolve(window.html2canvas);
                return;
            }
            
            // If not available, it should be injected by the extension
            // Wait a bit and check again
            setTimeout(() => {
                if (window.html2canvas) {
                    resolve(window.html2canvas);
                } else {
                    reject(new Error('html2canvas not available'));
                }
            }, 100);
        });
    }

    // Create full page screenshot
    async function createFullPageScreenshot() {
        try {
            const html2canvas = await ensureHtml2Canvas();
            
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                scale: 1,
                allowTaint: true,
                backgroundColor: '#ffffff',
                removeContainer: true,
                imageTimeout: 15000,
                logging: false
            });

            const dataURL = canvas.toDataURL('image/png', 0.8);
            const base64 = dataURL.split(',')[1];
            
            return {
                success: true,
                screenshot: {
                    dataURL,
                    base64,
                    width: canvas.width,
                    height: canvas.height
                }
            };
        } catch (error) {
            console.error('Screenshot error:', error);
            return {
                success: false,
                error: 'Failed to capture screenshot: ' + error.message
            };
        }
    }

    // Log AI result to console with styling
    function logAIResult(result) {
        console.group('🤖 AI Tech Task Solver - Analysis Result');
        console.log('%c' + result, 'color: #2196F3; font-size: 14px; line-height: 1.5;');
        console.groupEnd();
        
        // Also create a notification-style log
        const timestamp = new Date().toLocaleTimeString();
        console.log(`%c[${timestamp}] AI Analysis Complete`, 'background: #4CAF50; color: white; padding: 2px 8px; border-radius: 3px;');
    }

    // Log progress message to console with styling
    function logProgressMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`%c[${timestamp}] ${message}`, 'background: #2196F3; color: white; padding: 2px 8px; border-radius: 3px; font-weight: bold;');
    }

    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'takeScreenshot') {
            createFullPageScreenshot().then(result => {
                sendResponse(result);
            }).catch(error => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });
            return true; // Keep message channel open for async response
        }
        
        if (request.action === 'logResult') {
            logAIResult(request.result);
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'logMessage') {
            logProgressMessage(request.message);
            sendResponse({ success: true });
            return true;
        }
    });

    // Initialize - let the extension know content script is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('AI Tech Task Solver extension ready');
        });
    } else {
        console.log('AI Tech Task Solver extension ready');
    }
})();
