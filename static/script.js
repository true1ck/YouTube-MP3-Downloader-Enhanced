document.addEventListener('DOMContentLoaded', () => {
    // ====== State Management ======
    class ModularApp {
        constructor() {
            this.currentTool = 'downloader';
            this.tasks = new Map();
            this.config = null;
            this.polling = false;
            this.pollTimer = null;
            
            this.init();
        }
        
        async init() {
            this.setupToolSwitching();
            this.setupThemeToggle();
            this.setupForms();
            this.setupEventListeners();
            
            // Load initial data
            await this.loadConfig();
            await this.loadTasks();
            
            // Start polling if needed
            if (this.hasActiveTasks()) {
                this.startPolling();
            }
            
            console.log('YouTube Tools Pro initialized');
        }
        
        // ====== Tool Management ======
        setupToolSwitching() {
            const toolCards = document.querySelectorAll('.tool-card');
            const toolSections = document.querySelectorAll('.tool-section');
            
            toolCards.forEach(card => {
                card.addEventListener('click', () => {
                    const tool = card.dataset.tool;
                    this.switchTool(tool);
                });
                
                // Keyboard navigation
                card.setAttribute('tabindex', '0');
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const tool = card.dataset.tool;
                        this.switchTool(tool);
                    }
                });
            });
        }
        
        switchTool(toolName) {
            // Update active states
            document.querySelectorAll('.tool-card').forEach(card => {
                card.classList.remove('active');
            });
            
            document.querySelectorAll('.tool-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Activate selected tool
            const activeCard = document.querySelector(`[data-tool="${toolName}"]`);
            const activeSection = document.getElementById(`${toolName}-section`);
            
            if (activeCard && activeSection) {
                activeCard.classList.add('active');
                activeSection.classList.add('active');
                this.currentTool = toolName;
                
                // Update URL without page reload
                const url = new URL(window.location);
                url.searchParams.set('tool', toolName);
                window.history.replaceState(null, '', url);
                
                // Tool-specific initialization
                this.initializeTool(toolName);
            }
        }
        
        initializeTool(toolName) {
            switch (toolName) {
                case 'downloader':
                    this.updateQualityOptions();
                    break;
                case 'transcriber':
                    this.setupTranscriberInputs();
                    break;
                case 'converter':
                    this.setupConverterInputs();
                    break;
                case 'batch':
                    this.setupBatchInputs();
                    break;
            }
        }
        
        // ====== Configuration ======
        async loadConfig() {
            try {
                const response = await this.apiCall('/config');
                this.config = response;
                this.updateQualityOptions();
                this.updateTranscriptionAvailability();
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }
        
        updateQualityOptions() {
            const formatSelect = document.getElementById('downloadFormat');
            const qualitySelect = document.getElementById('downloadQuality');
            
            if (!formatSelect || !qualitySelect || !this.config) return;
            
            const format = formatSelect.value;
            qualitySelect.innerHTML = '';
            
            const qualities = format === 'mp3' ? 
                this.config.audio_quality_options : 
                this.config.video_quality_options;
            
            if (Array.isArray(qualities)) {
                qualities.forEach(quality => {
                    const option = document.createElement('option');
                    option.value = quality;
                    option.textContent = quality.charAt(0).toUpperCase() + quality.slice(1);
                    qualitySelect.appendChild(option);
                });
            } else {
                Object.entries(qualities).forEach(([key, value]) => {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)} (${value})`;
                    qualitySelect.appendChild(option);
                });
            }
        }
        
        updateTranscriptionAvailability() {
            const transcriptionCheckbox = document.getElementById('downloadTranscription');
            if (transcriptionCheckbox) {
                transcriptionCheckbox.disabled = !this.config?.transcription_enabled;
            }
        }
        
        // ====== Form Setup ======
        setupForms() {
            // Download form
            const downloadForm = document.getElementById('downloadForm');
            if (downloadForm) {
                downloadForm.addEventListener('submit', (e) => this.handleDownloadSubmit(e));
            }
            
            // Format change handler
            const formatSelect = document.getElementById('downloadFormat');
            if (formatSelect) {
                formatSelect.addEventListener('change', () => this.updateQualityOptions());
            }
            
            // Transcription form
            const transcriptionForm = document.getElementById('transcriptionForm');
            if (transcriptionForm) {
                transcriptionForm.addEventListener('submit', (e) => this.handleTranscriptionSubmit(e));
            }
            
            // Conversion form
            const conversionForm = document.getElementById('conversionForm');
            if (conversionForm) {
                conversionForm.addEventListener('submit', (e) => this.handleConversionSubmit(e));
            }
        }
        
        setupTranscriberInputs() {
            const sourceRadios = document.querySelectorAll('input[name="transcriptionSource"]');
            const urlInput = document.getElementById('urlInput');
            const fileInput = document.getElementById('fileInput');
            
            sourceRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (radio.value === 'url') {
                        urlInput.classList.remove('d-none');
                        fileInput.classList.add('d-none');
                    } else {
                        urlInput.classList.add('d-none');
                        fileInput.classList.remove('d-none');
                    }
                });
            });
        }
        
        setupConverterInputs() {
            // File input handling for converter
            const fileInput = document.getElementById('conversionFiles');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    console.log('Selected files for conversion:', files.map(f => f.name));
                });
            }
        }
        
        setupBatchInputs() {
            // Batch input method switching
            const inputRadios = document.querySelectorAll('input[name="batchInput"]');
            const textInput = document.getElementById('batchTextInput');
            const fileInput = document.getElementById('batchFileInput');
            const playlistInput = document.getElementById('batchPlaylistInput');
            
            inputRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    textInput.classList.add('d-none');
                    fileInput.classList.add('d-none');
                    playlistInput.classList.add('d-none');
                    
                    switch (radio.value) {
                        case 'text':
                            textInput.classList.remove('d-none');
                            break;
                        case 'file':
                            fileInput.classList.remove('d-none');
                            break;
                        case 'playlist':
                            playlistInput.classList.remove('d-none');
                            break;
                    }
                });
            });
            
            // Concurrency slider
            const concurrencySlider = document.getElementById('batchConcurrency');
            const concurrencyValue = document.getElementById('concurrencyValue');
            
            if (concurrencySlider && concurrencyValue) {
                concurrencySlider.addEventListener('input', (e) => {
                    concurrencyValue.textContent = e.target.value;
                });
            }
        }
        
        // ====== Form Handlers ======
        async handleDownloadSubmit(e) {
            e.preventDefault();
            
            const formData = {
                urls: document.getElementById('downloadUrls').value.trim(),
                format: document.getElementById('downloadFormat').value,
                quality: document.getElementById('downloadQuality').value,
                transcription: document.getElementById('downloadTranscription').checked
            };
            
            if (!formData.urls) {
                this.showAlert('Please enter at least one YouTube URL', 'danger');
                return;
            }
            
            try {
                this.setLoading(e.target.querySelector('button[type="submit"]'), true);
                
                const response = await this.apiCall('/download', 'POST', formData);
                
                this.showAlert(`Started ${response.tasks_created} download(s)`, 'success');
                document.getElementById('downloadUrls').value = '';
                
                await this.loadTasks();
                this.startPolling();
                
            } catch (error) {
                this.showAlert(error.message || 'Failed to start downloads', 'danger');
            } finally {
                this.setLoading(e.target.querySelector('button[type="submit"]'), false);
            }
        }
        
        async handleTranscriptionSubmit(e) {
            e.preventDefault();
            this.showAlert('Transcription feature coming soon!', 'info');
        }
        
        async handleConversionSubmit(e) {
            e.preventDefault();
            this.showAlert('Format conversion feature coming soon!', 'info');
        }
        
        // ====== Task Management ======
        async loadTasks() {
            try {
                const response = await this.apiCall('/tasks');
                this.updateTasks(response.tasks || []);
                this.updateStatistics();
            } catch (error) {
                console.error('Failed to load tasks:', error);
            }
        }
        
        updateTasks(tasks) {
            this.tasks.clear();
            tasks.forEach(task => this.tasks.set(task.id, task));
            this.renderTasks();
        }
        
        renderTasks() {
            const taskList = document.getElementById('globalTaskList');
            const emptyQueue = document.getElementById('emptyQueue');
            const queueCount = document.getElementById('queueCount');
            
            const tasks = Array.from(this.tasks.values());
            
            if (tasks.length === 0) {
                if (taskList) taskList.innerHTML = '';
                if (emptyQueue) emptyQueue.classList.remove('d-none');
            } else {
                if (emptyQueue) emptyQueue.classList.add('d-none');
                if (taskList) {
                    taskList.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
                }
            }
            
            if (queueCount) {
                queueCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
            }
        }
        
        renderTaskItem(task) {
            const statusClass = `status-${task.status.toLowerCase().replace(' ', '-')}`;
            const isActive = ['downloading', 'converting', 'transcribing'].includes(task.status.toLowerCase());
            
            const progressBar = isActive ? `
                <div class="progress mt-2" style="height: 4px;">
                    <div class="progress-bar" style="width: ${task.progress || 0}%"></div>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <small class="text-muted">${task.progress || 0}%</small>
                    <small class="text-muted">${task.speed || ''}</small>
                    <small class="text-muted">${task.eta || ''}</small>
                </div>
            ` : '';
            
            const actions = this.renderTaskActions(task);
            
            return `
                <div class="task-item" data-task-id="${task.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="badge ${statusClass}">${task.status}</span>
                                <span class="badge bg-secondary">${task.format?.toUpperCase() || 'TASK'}</span>
                            </div>
                            <h6 class="mb-1 text-truncate">${task.title || task.url || 'Processing...'}</h6>
                            ${task.error_message ? `<small class="text-danger">${task.error_message}</small>` : ''}
                            ${progressBar}
                        </div>
                        <div class="task-actions ms-3">
                            ${actions}
                        </div>
                    </div>
                </div>
            `;
        }
        
        renderTaskActions(task) {
            const actions = [];
            
            if (task.status === 'Completed' && task.filename) {
                actions.push(`
                    <a href="/download/${encodeURIComponent(task.filename)}" 
                       class="btn btn-sm btn-success" title="Download">
                        <i class="bi bi-download"></i>
                    </a>
                `);
            }
            
            if (task.status === 'Failed') {
                actions.push(`
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="app.retryTask('${task.id}')" title="Retry">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                `);
            }
            
            actions.push(`
                <button class="btn btn-sm btn-outline-secondary" 
                        onclick="app.removeTask('${task.id}')" title="Remove">
                    <i class="bi bi-trash"></i>
                </button>
            `);
            
            return actions.join('');
        }
        
        updateStatistics() {
            const tasks = Array.from(this.tasks.values());
            const stats = {
                total: tasks.length,
                active: tasks.filter(t => ['downloading', 'converting', 'transcribing'].includes(t.status.toLowerCase())).length,
                completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
                failed: tasks.filter(t => t.status.toLowerCase() === 'failed').length
            };
            
            // Update global stats
            const globalStats = document.getElementById('globalStats');
            if (globalStats) {
                const statusText = stats.active > 0 ? 
                    `${stats.active} active` : 
                    `${stats.total} total`;
                globalStats.textContent = statusText;
            }
            
            // Update tool-specific stats
            this.updateToolStats(stats);
        }
        
        updateToolStats(stats) {
            // Update download stats
            const activeDownloads = document.getElementById('activeDownloads');
            const completedDownloads = document.getElementById('completedDownloads');
            const failedDownloads = document.getElementById('failedDownloads');
            
            if (activeDownloads) activeDownloads.textContent = stats.active;
            if (completedDownloads) completedDownloads.textContent = stats.completed;
            if (failedDownloads) failedDownloads.textContent = stats.failed;
        }
        
        // ====== Polling ======
        startPolling() {
            if (this.polling) return;
            
            this.polling = true;
            this.pollTimer = setInterval(() => this.pollProgress(), 2000);
        }
        
        stopPolling() {
            if (!this.polling) return;
            
            this.polling = false;
            if (this.pollTimer) {
                clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }
        
        async pollProgress() {
            if (!this.polling) return;
            
            try {
                const response = await this.apiCall('/progress');
                const updates = response.updates || [];
                
                let hasUpdates = false;
                updates.forEach(update => {
                    if (update.type === 'status_update' && update.task) {
                        this.tasks.set(update.task.id, update.task);
                        hasUpdates = true;
                    }
                });
                
                if (hasUpdates) {
                    this.renderTasks();
                    this.updateStatistics();
                }
                
                // Stop polling if no active tasks
                if (!this.hasActiveTasks()) {
                    this.stopPolling();
                }
                
            } catch (error) {
                console.error('Polling error:', error);
            }
        }
        
        hasActiveTasks() {
            return Array.from(this.tasks.values()).some(task => 
                ['queued', 'downloading', 'converting', 'transcribing'].includes(task.status.toLowerCase())
            );
        }
        
        // ====== Task Actions ======
        async retryTask(taskId) {
            try {
                await this.apiCall(`/tasks/${taskId}/retry`, 'POST');
                this.showAlert('Task retry started', 'success');
                await this.loadTasks();
                this.startPolling();
            } catch (error) {
                this.showAlert('Failed to retry task', 'danger');
            }
        }
        
        async removeTask(taskId) {
            try {
                await this.apiCall(`/tasks/${taskId}/remove`, 'DELETE');
                this.tasks.delete(taskId);
                this.renderTasks();
                this.updateStatistics();
            } catch (error) {
                this.showAlert('Failed to remove task', 'danger');
            }
        }
        
        // ====== Event Listeners ======
        setupEventListeners() {
            // Queue controls
            const refreshQueue = document.getElementById('refreshQueue');
            const clearCompleted = document.getElementById('clearCompleted');
            const clearDownloadQueue = document.getElementById('clearDownloadQueue');
            
            if (refreshQueue) {
                refreshQueue.addEventListener('click', () => this.loadTasks());
            }
            
            if (clearCompleted) {
                clearCompleted.addEventListener('click', () => this.clearCompleted());
            }
            
            if (clearDownloadQueue) {
                clearDownloadQueue.addEventListener('click', () => this.clearQueue());
            }
            
            // Batch process
            const startBatchProcess = document.getElementById('startBatchProcess');
            if (startBatchProcess) {
                startBatchProcess.addEventListener('click', () => this.startBatchProcess());
            }
        }
        
        async clearCompleted() {
            try {
                await this.apiCall('/clear', 'POST');
                await this.loadTasks();
                this.showAlert('Completed tasks cleared', 'success');
            } catch (error) {
                this.showAlert('Failed to clear completed tasks', 'danger');
            }
        }
        
        async clearQueue() {
            if (!confirm('Clear all queued tasks?')) return;
            
            try {
                const queuedTasks = Array.from(this.tasks.values())
                    .filter(task => task.status.toLowerCase() === 'queued');
                
                for (const task of queuedTasks) {
                    await this.apiCall(`/tasks/${task.id}/cancel`, 'POST');
                }
                
                await this.loadTasks();
                this.showAlert('Queue cleared', 'success');
            } catch (error) {
                this.showAlert('Failed to clear queue', 'danger');
            }
        }
        
        async startBatchProcess() {
            this.showAlert('Batch processing feature coming soon!', 'info');
        }
        
        // ====== Theme Toggle ======
        setupThemeToggle() {
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    const root = document.documentElement;
                    const currentTheme = root.getAttribute('data-bs-theme') || 'light';
                    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                    
                    root.setAttribute('data-bs-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                    
                    // Update icon
                    const icon = themeToggle.querySelector('i');
                    if (icon) {
                        icon.className = newTheme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
                    }
                });
            }
            
            // Set initial theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-bs-theme', savedTheme);
            
            const icon = themeToggle?.querySelector('i');
            if (icon) {
                icon.className = savedTheme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
            }
        }
        
        // ====== Utility Methods ======
        async apiCall(endpoint, method = 'GET', data = null) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`/api${endpoint}`, options);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Network error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            return response.json();
        }
        
        showAlert(message, type = 'info') {
            // Create and show bootstrap alert
            const alertContainer = document.createElement('div');
            alertContainer.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
            alertContainer.style.cssText = 'top: 20px; right: 20px; z-index: 2000; max-width: 400px;';
            
            alertContainer.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            document.body.appendChild(alertContainer);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertContainer.parentNode) {
                    alertContainer.remove();
                }
            }, 5000);
        }
        
        setLoading(element, loading = true) {
            if (!element) return;
            
            if (loading) {
                element.disabled = true;
                element.classList.add('loading');
                
                const icon = element.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-hourglass-split';
                }
            } else {
                element.disabled = false;
                element.classList.remove('loading');
                
                const icon = element.querySelector('i');
                if (icon && element.id === 'startBatchProcess') {
                    icon.className = 'bi bi-play-fill';
                }
            }
        }
    }
    
    // ====== Initialize App ======
    window.app = new ModularApp();
    
    // Check URL for initial tool
    const urlParams = new URLSearchParams(window.location.search);
    const initialTool = urlParams.get('tool');
    if (initialTool && ['downloader', 'transcriber', 'converter', 'batch'].includes(initialTool)) {
        window.app.switchTool(initialTool);
    }
});
