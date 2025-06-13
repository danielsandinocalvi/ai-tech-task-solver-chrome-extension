// Options page script for AI Tech Task Solver Chrome Extension

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('optionsForm');
    const status = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');

    // Form elements
    const openaiApiKey = document.getElementById('openaiApiKey');
    const openaiModel = document.getElementById('openaiModel');
    const claudeApiKey = document.getElementById('claudeApiKey');
    const claudeModel = document.getElementById('claudeModel');
    const aiProvider = document.getElementById('aiProvider');
    const outputLanguage = document.getElementById('outputLanguage');
    const maxTokens = document.getElementById('maxTokens');

    // Default configurations
    const DEFAULT_CONFIG = {
        openaiApiKey: '',
        openaiModel: 'gpt-4.1-2025-04-14',
        claudeApiKey: '',
        claudeModel: 'claude-sonnet-4-20250514',
        aiProvider: 'claude',
        outputLanguage: 'JavaScript',
        maxTokens: 1500
    };

    // Load saved options
    function loadOptions() {
        chrome.storage.sync.get([
            'openaiApiKey',
            'openaiModel',
            'claudeApiKey',
            'claudeModel',
            'aiProvider',
            'outputLanguage',
            'maxTokens'
        ], function(result) {
            openaiApiKey.value = result.openaiApiKey || DEFAULT_CONFIG.openaiApiKey;
            openaiModel.value = result.openaiModel || DEFAULT_CONFIG.openaiModel;
            claudeApiKey.value = result.claudeApiKey || DEFAULT_CONFIG.claudeApiKey;
            claudeModel.value = result.claudeModel || DEFAULT_CONFIG.claudeModel;
            aiProvider.value = result.aiProvider || DEFAULT_CONFIG.aiProvider;
            outputLanguage.value = result.outputLanguage || DEFAULT_CONFIG.outputLanguage;
            maxTokens.value = result.maxTokens || DEFAULT_CONFIG.maxTokens;
        });
    }

    // Save options
    function saveOptions() {
        const options = {
            openaiApiKey: openaiApiKey.value.trim(),
            openaiModel: openaiModel.value.trim(),
            claudeApiKey: claudeApiKey.value.trim(),
            claudeModel: claudeModel.value.trim(),
            aiProvider: aiProvider.value,
            outputLanguage: outputLanguage.value,
            maxTokens: parseInt(maxTokens.value)
        };

        // Validate required fields based on selected provider
        if (options.aiProvider === 'openai') {
            if (!options.openaiApiKey) {
                showStatus('OpenAI API Key is required when using OpenAI', 'error');
                return;
            }
            if (!options.openaiModel) {
                showStatus('OpenAI Model is required when using OpenAI', 'error');
                return;
            }
        } else if (options.aiProvider === 'claude') {
            if (!options.claudeApiKey) {
                showStatus('Claude API Key is required when using Claude', 'error');
                return;
            }
            if (!options.claudeModel) {
                showStatus('Claude Model is required when using Claude', 'error');
                return;
            }
        }

        if (options.maxTokens < 100 || options.maxTokens > 4000) {
            showStatus('Max tokens must be between 100 and 4000', 'error');
            return;
        }

        // Save to Chrome storage
        chrome.storage.sync.set(options, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('Settings saved successfully!', 'success');
            }
        });
    }

    // Reset to defaults
    function resetOptions() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will clear your API keys.')) {
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) {
                    showStatus('Error resetting settings: ' + chrome.runtime.lastError.message, 'error');
                } else {
                    loadOptions();
                    showStatus('Settings reset to defaults', 'success');
                }
            });
        }
    }

    // Show status message
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';

        // Hide status after 5 seconds
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }

    // Event listeners
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveOptions();
    });

    resetBtn.addEventListener('click', resetOptions);

    // Validate max tokens input
    maxTokens.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (value < 100) {
            this.value = 100;
        } else if (value > 4000) {
            this.value = 4000;
        }
    });

    // Load options on page load
    loadOptions();

    // Add some helpful information
    console.log('AI Tech Task Solver Options Page Loaded');
    console.log('Supported APIs: OpenAI GPT-4 Vision, Anthropic Claude');
});
