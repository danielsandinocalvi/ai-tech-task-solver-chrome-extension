// Background script for AI Tech Task Solver Chrome Extension
// Handles AI API communication

// Default configuration
const DEFAULT_CONFIG = {
    openaiApiKey: '',
    openaiModel: 'gpt-4.1-2025-04-14',
    claudeApiKey: '',
    claudeModel: 'claude-sonnet-4-20250514',
    aiProvider: 'claude',
    outputLanguage: 'JavaScript',
    maxTokens: 1500
};

// Get stored configuration
async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get([
            'openaiApiKey',
            'openaiModel',
            'claudeApiKey',
            'claudeModel',
            'aiProvider',
            'outputLanguage',
            'maxTokens'
        ], (result) => {
            resolve({
                openaiApiKey: result.openaiApiKey || DEFAULT_CONFIG.openaiApiKey,
                openaiModel: result.openaiModel || DEFAULT_CONFIG.openaiModel,
                claudeApiKey: result.claudeApiKey || DEFAULT_CONFIG.claudeApiKey,
                claudeModel: result.claudeModel || DEFAULT_CONFIG.claudeModel,
                aiProvider: result.aiProvider || DEFAULT_CONFIG.aiProvider,
                outputLanguage: result.outputLanguage || DEFAULT_CONFIG.outputLanguage,
                maxTokens: result.maxTokens || DEFAULT_CONFIG.maxTokens
            });
        });
    });
}

// Analyze screenshot using AI
async function analyzeScreenshot(base64Image) {
    try {
        console.log('🔧 Getting AI configuration...');
        const config = await getConfig();

        // Determine which provider to use and validate API key
        const isOpenAI = config.aiProvider === 'openai';
        const isAnthropic = config.aiProvider === 'claude';

        if (isOpenAI && !config.openaiApiKey) {
            throw new Error('OpenAI API key not configured. Please set it in extension options.');
        }
        if (isAnthropic && !config.claudeApiKey) {
            throw new Error('Claude API key not configured. Please set it in extension options.');
        }

        console.log('📝 Preparing AI prompt...');
        const prompt = `Analyze this screenshot. If it is a programming/coding problem, provide: 1) Problem explanation 2) Solution approach 3) Complete working code (${config.outputLanguage}) 4) Time/space complexity. If it is a system design or general task, provide a high-level solution, summary, or design as appropriate.`;

        console.log('🔍 Using API provider:', isAnthropic ? 'Anthropic Claude' : isOpenAI ? 'OpenAI' : 'Unknown');
        console.log('🤖 Using model:', isAnthropic ? config.claudeModel : config.openaiModel);
        console.log('🎯 Max tokens:', config.maxTokens);

        let requestBody, headers, apiUrl;

        if (isAnthropic) {
            // Anthropic Claude API format
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': config.claudeApiKey,
                'Anthropic-Version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            };

            requestBody = {
                model: config.claudeModel,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/png',
                                data: base64Image
                            }
                        }
                    ]
                }],
                max_tokens: config.maxTokens
            };
        } else if (isOpenAI) {
            // OpenAI GPT-4 Vision API format
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.openaiApiKey}`
            };

            requestBody = {
                model: config.openaiModel,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`
                            }
                        }
                    ]
                }],
                max_tokens: config.maxTokens
            };
        } else {
            throw new Error('Invalid AI provider. Please select OpenAI or Claude in extension options.');
        }

        console.log('🌐 Sending request to AI API...');
        console.log('📡 API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        console.log('📨 Received response from AI API');
        console.log('📊 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API Error Response:', errorText);
            throw new Error(`AI API request failed (${response.status}): ${errorText}`);
        }

        console.log('🔄 Parsing AI response...');
        const data = await response.json();

        // Extract response text based on API
        let resultText;
        if (isAnthropic) {
            resultText = data.content?.[0]?.text;
        } else if (isOpenAI) {
            resultText = data.choices?.[0]?.message?.content;
        }

        if (!resultText) {
            console.log('❌ No content in AI response:', data);
            throw new Error('No response content received from AI API');
        }

        console.log('✅ AI analysis completed successfully');
        console.log('📏 Response length:', resultText.length, 'characters');

        return {
            success: true,
            result: resultText
        };

    } catch (error) {
        console.error('❌ AI analysis error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeScreenshot') {
        analyzeScreenshot(request.screenshot.base64)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({
                success: false,
                error: error.message
            }));
        return true; // Keep message channel open for async response
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    try {
        console.log('🚀 AI Tech Task Solver: Extension icon clicked');
        console.log('📄 Current tab:', tab.url);

        // Check if API key is configured
        console.log('🔑 Checking API configuration...');
        const config = await getConfig();
        
        const isOpenAI = config.aiProvider === 'openai';
        const isAnthropic = config.aiProvider === 'claude';
        
        if ((isOpenAI && !config.openaiApiKey) || (isAnthropic && !config.claudeApiKey)) {
            console.log('❌ No API key configured for selected provider');
            // Show notification if API key is not configured
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'AI Tech Task Solver',
                message: `Please configure ${isOpenAI ? 'OpenAI' : 'Claude'} API key in extension options first.`
            });
            chrome.runtime.openOptionsPage();
            return;
        }
        console.log('✅ API key configured, using provider:', config.aiProvider);
        console.log('🤖 Using model:', isAnthropic ? config.claudeModel : config.openaiModel);

        // Show notification that analysis is starting
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'AI Tech Task Solver',
            message: 'Analyzing page... Please wait.'
        });

        // Log to page console that analysis is starting
        await chrome.tabs.sendMessage(tab.id, {
            action: 'logMessage',
            message: '🚀 AI Tech Task Solver: Starting page analysis...'
        });

        // Send message to content script to take screenshot
        console.log('📸 Taking screenshot of current page...');
        await chrome.tabs.sendMessage(tab.id, {
            action: 'logMessage',
            message: '📸 Taking screenshot...'
        });

        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'takeScreenshot'
        });

        if (response && response.success) {
            console.log('✅ Screenshot captured successfully');
            console.log('📊 Screenshot size:', Math.round(response.screenshot.base64.length / 1024), 'KB');
            
            await chrome.tabs.sendMessage(tab.id, {
                action: 'logMessage',
                message: `✅ Screenshot captured (${Math.round(response.screenshot.base64.length / 1024)} KB)`
            });

            // Send screenshot to AI for analysis
            console.log('🤖 Sending screenshot to AI for analysis...');
            await chrome.tabs.sendMessage(tab.id, {
                action: 'logMessage',
                message: '🤖 Sending to AI for analysis...'
            });

            const aiResponse = await analyzeScreenshot(response.screenshot.base64);

            if (aiResponse && aiResponse.success) {
                console.log('✅ AI analysis completed successfully');
                console.log('📝 Response length:', aiResponse.result.length, 'characters');
                
                // Show success notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'AI Tech Task Solver',
                    message: 'Analysis complete! Check browser console for results.'
                });
                
                // Log result to the page's console
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'logResult',
                    result: aiResponse.result
                });
            } else {
                console.log('❌ AI analysis failed:', aiResponse?.error);
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'logMessage',
                    message: '❌ AI analysis failed: ' + (aiResponse?.error || 'Unknown error')
                });
                
                // Show error notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'AI Tech Task Solver - Error',
                    message: aiResponse?.error || 'AI analysis failed'
                });
            }
        } else {
            console.log('❌ Screenshot failed:', response?.error);
            await chrome.tabs.sendMessage(tab.id, {
                action: 'logMessage',
                message: '❌ Screenshot failed: ' + (response?.error || 'Unknown error')
            });
            
            // Show error notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'AI Tech Task Solver - Error',
                message: response?.error || 'Screenshot failed'
            });
        }

    } catch (error) {
        console.error('❌ Extension icon click error:', error);
        
        // Try to log to page console if possible
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'logMessage',
                message: '❌ Extension error: ' + error.message
            });
        } catch (e) {
            // Ignore if we can't send message to tab
        }
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'AI Tech Task Solver - Error',
            message: 'Error: ' + error.message
        });
    }
});

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Tech Task Solver extension installed');
});
