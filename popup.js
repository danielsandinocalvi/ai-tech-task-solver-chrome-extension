document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const optionsLink = document.getElementById('optionsLink');

    // Handle analyze button click
    analyzeBtn.addEventListener('click', async function() {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showStatus('No active tab found', 'error');
                return;
            }

            // Disable button and show progress
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
            showStatus('Taking screenshot...', 'processing');
            showProgress(20);

            // Send message to content script to take screenshot
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'takeScreenshot' 
            });

            if (response && response.success) {
                showStatus('Sending to AI...', 'processing');
                showProgress(60);

                // Send screenshot to background script for AI analysis
                const aiResponse = await chrome.runtime.sendMessage({
                    action: 'analyzeScreenshot',
                    screenshot: response.screenshot
                });

                if (aiResponse && aiResponse.success) {
                    showStatus('Analysis complete! Check console.', 'success');
                    showProgress(100);
                    
                    // Log result to the page's console
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'logResult',
                        result: aiResponse.result
                    });
                } else {
                    showStatus(aiResponse?.error || 'AI analysis failed', 'error');
                }
            } else {
                showStatus(response?.error || 'Screenshot failed', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            // Re-enable button
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze the page';
            hideProgress();
        }
    });

    // Handle options link click
    optionsLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // Helper functions
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
    }

    function showProgress(percent) {
        progress.style.display = 'block';
        progressBar.style.width = percent + '%';
    }

    function hideProgress() {
        setTimeout(() => {
            progress.style.display = 'none';
            progressBar.style.width = '0%';
        }, 1000);
    }

    // Check if extension is configured
    chrome.storage.sync.get(['openaiApiKey', 'claudeApiKey', 'aiProvider'], function(result) {
        const isOpenAI = result.aiProvider === 'openai';
        const isAnthropic = result.aiProvider === 'claude' || !result.aiProvider; // Default to Claude
        
        const hasRequiredKey = (isOpenAI && result.openaiApiKey) || (isAnthropic && result.claudeApiKey);
        
        if (!hasRequiredKey) {
            const providerName = isOpenAI ? 'OpenAI' : 'Claude';
            showStatus(`Please configure ${providerName} API key in options`, 'error');
            analyzeBtn.disabled = true;
        }
    });
});