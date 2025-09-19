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
            this.setupForms();
            this.setupEventListeners();
            this.setupDragDrop();
            this.setupKeyboardShortcuts();
            
            // Load initial data
            try {
                await this.loadConfig();
                await this.loadTasks();
            } catch (error) {
                this.handleError(error, 'initialization');
            }
            
            // Start polling if needed
            if (this.hasActiveTasks()) {
                this.startPolling();
            }
            
            // Setup performance monitoring
            setInterval(() => this.monitorPerformance(), 30000); // Every 30 seconds
            
            console.log('YouTube Tools Pro initialized with enhanced features');
            console.log('Current tool:', this.currentTool);
            console.log('Config loaded:', !!this.config);
            console.log('Tasks loaded:', this.tasks.size);
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
            
            // Enhanced URL validation
            if (!formData.urls) {
                this.showAlert('Please enter at least one YouTube URL', 'danger');
                return;
            }
            
            // Validate URLs
            const urlList = this.parseUrls(formData.urls);
            const invalidUrls = urlList.filter(url => !this.isValidYouTubeUrl(url));
            
            if (invalidUrls.length > 0) {
                this.showAlert(`Invalid YouTube URLs found: ${invalidUrls.length} URL(s)`, 'danger');
                return;
            }
            
            try {
                this.setLoading(e.target.querySelector('button[type="submit"]'), true);
                
                const response = await this.apiCall('/download', 'POST', formData);
                
                this.showAlert(`Started ${response.tasks_created || urlList.length} download(s)`, 'success');
                document.getElementById('downloadUrls').value = '';
                
                await this.loadTasks();
                this.startPolling();
                
            } catch (error) {
                this.handleError(error, 'download submit');
            } finally {
                this.setLoading(e.target.querySelector('button[type="submit"]'), false);
            }
        }
        
        async handleTranscriptionSubmit(e) {
            e.preventDefault();
            
            const source = document.querySelector('input[name="transcriptionSource"]:checked').value;
            const model = document.getElementById('transcriptionModel').value;
            const language = document.getElementById('transcriptionLanguage').value;
            const format = document.getElementById('transcriptionFormat').value;
            
            let formData = {
                model,
                language,
                output_format: format
            };
            
            if (source === 'url') {
                const urls = document.getElementById('transcriptionUrls').value.trim();
                if (!urls) {
                    this.showAlert('Please enter at least one YouTube URL', 'danger');
                    return;
                }
                
                const urlList = this.parseUrls(urls);
                const invalidUrls = urlList.filter(url => !this.isValidYouTubeUrl(url));
                
                if (invalidUrls.length > 0) {
                    this.showAlert(`Invalid YouTube URLs found: ${invalidUrls.length} URL(s)`, 'danger');
                    return;
                }
                
                formData.urls = urls;
                formData.source = 'url';
            } else {
                const fileInput = document.getElementById('transcriptionFiles');
                if (!fileInput.files.length) {
                    this.showAlert('Please select at least one audio/video file', 'danger');
                    return;
                }
                
                // For file uploads, we'll need to handle this differently
                this.showAlert('File upload transcription coming soon!', 'info');
                return;
            }
            
            try {
                this.setLoading(e.target.querySelector('button[type="submit"]'), true);
                
                const response = await this.apiCall('/transcribe', 'POST', formData);
                
                this.showAlert(`Started ${response.tasks_created} transcription(s)`, 'success');
                if (source === 'url') {
                    document.getElementById('transcriptionUrls').value = '';
                }
                
                await this.loadTasks();
                this.startPolling();
                
            } catch (error) {
                this.handleError(error, 'transcription submit');
            } finally {
                this.setLoading(e.target.querySelector('button[type="submit"]'), false);
            }
        }
        
        async handleConversionSubmit(e) {
            e.preventDefault();
            
            const fileInput = document.getElementById('conversionFiles');
            if (!fileInput.files.length) {
                this.showAlert('Please select at least one file to convert', 'danger');
                return;
            }
            
            const fromFormat = document.getElementById('convertFromFormat').value;
            const toFormat = document.getElementById('convertToFormat').value;
            const quality = document.getElementById('conversionQuality').value;
            const bitrate = document.getElementById('conversionBitrate').value;
            const preserveMetadata = document.getElementById('preserveMetadata').checked;
            
            if (toFormat === fromFormat && fromFormat !== 'auto') {
                this.showAlert('Source and target formats cannot be the same', 'warning');
                return;
            }
            
            // For now, show coming soon message as file upload handling needs backend support
            this.showAlert('File conversion feature coming soon!', 'info');
            
            // TODO: Implement file upload and conversion
            // const formData = new FormData();
            // Array.from(fileInput.files).forEach((file, index) => {
            //     formData.append(`files[${index}]`, file);
            // });
            // formData.append('from_format', fromFormat);
            // formData.append('to_format', toFormat);
            // formData.append('quality', quality);
            // formData.append('bitrate', bitrate);
            // formData.append('preserve_metadata', preserveMetadata);
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
            const mode = document.querySelector('input[name="batchMode"]:checked').value;
            const inputMethod = document.querySelector('input[name="batchInput"]:checked').value;
            const concurrency = document.getElementById('batchConcurrency').value;
            const autoRetry = document.getElementById('batchRetry').checked;
            const notifications = document.getElementById('batchNotify').checked;
            
            let inputData = '';
            
            switch (inputMethod) {
                case 'text':
                    inputData = document.querySelector('#batchTextInput textarea').value.trim();
                    break;
                case 'playlist':
                    inputData = document.querySelector('#batchPlaylistInput input').value.trim();
                    break;
                case 'file':
                    this.showAlert('File upload batch processing coming soon!', 'info');
                    return;
            }
            
            if (!inputData) {
                this.showAlert('Please provide input data for batch processing', 'danger');
                return;
            }
            
            const formData = {
                mode,
                input_method: inputMethod,
                input_data: inputData,
                concurrency: parseInt(concurrency),
                auto_retry: autoRetry,
                notifications: notifications
            };
            
            // Add format-specific options based on mode
            if (mode === 'download') {
                formData.format = document.getElementById('downloadFormat')?.value || 'mp3';
                formData.quality = document.getElementById('downloadQuality')?.value || 'high';
            } else if (mode === 'transcribe') {
                formData.model = document.getElementById('transcriptionModel')?.value || 'base';
                formData.language = document.getElementById('transcriptionLanguage')?.value || 'auto';
                formData.output_format = document.getElementById('transcriptionFormat')?.value || 'txt';
            }
            
            try {
                this.setLoading(document.getElementById('startBatchProcess'), true);
                
                const response = await this.apiCall('/batch', 'POST', formData);
                
                this.showAlert(`Started batch ${mode} with ${response.tasks_created} tasks`, 'success');
                
                // Clear input
                if (inputMethod === 'text') {
                    document.querySelector('#batchTextInput textarea').value = '';
                } else if (inputMethod === 'playlist') {
                    document.querySelector('#batchPlaylistInput input').value = '';
                }
                
                await this.loadTasks();
                this.startPolling();
                
            } catch (error) {
                this.handleError(error, 'batch process');
            } finally {
                this.setLoading(document.getElementById('startBatchProcess'), false);
            }
        }
        
        
        // ====== Utility Methods ======
        parseUrls(urlString) {
            return urlString
                .split(/[\n,]/)  // Split by newlines or commas
                .map(url => url.trim())
                .filter(url => url.length > 0);
        }
        
        isValidYouTubeUrl(url) {
            const patterns = [
                /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/playlist\?list=|youtube\.com\/shorts\/).+$/,
                /^https?:\/\/(www\.)?m\.youtube\.com\/.+$/
            ];
            return patterns.some(pattern => pattern.test(url));
        }
        
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        formatDuration(seconds) {
            if (!seconds || seconds < 0) return '--:--';
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hrs > 0) {
                return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
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
                if (icon) {
                    // Restore original icons based on element
                    if (element.id === 'startBatchProcess') {
                        icon.className = 'bi bi-play-fill';
                    } else if (element.type === 'submit') {
                        // Restore download/transcribe/convert icons
                        const form = element.closest('form');
                        if (form?.id === 'downloadForm') {
                            icon.className = 'bi bi-download';
                        } else if (form?.id === 'transcriptionForm') {
                            icon.className = 'bi bi-mic';
                        } else if (form?.id === 'conversionForm') {
                            icon.className = 'bi bi-arrow-left-right';
                        }
                    }
                }
            }
        }
        
        // ====== Drag & Drop Support ======
        setupDragDrop() {
            // Setup drag and drop for URL inputs
            const urlTextareas = document.querySelectorAll('#downloadUrls, #transcriptionUrls');
            const batchTextarea = document.querySelector('#batchTextInput textarea');
            
            [...urlTextareas, batchTextarea].forEach(element => {
                if (!element) return;
                
                element.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    element.classList.add('drag-over');
                });
                
                element.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    element.classList.remove('drag-over');
                });
                
                element.addEventListener('drop', (e) => {
                    e.preventDefault();
                    element.classList.remove('drag-over');
                    
                    const data = e.dataTransfer.getData('text');
                    if (data && this.isValidYouTubeUrl(data)) {
                        if (element.value.trim()) {
                            element.value += '\n' + data;
                        } else {
                            element.value = data;
                        }
                        this.showAlert('URL added successfully', 'success');
                    } else {
                        this.showAlert('Invalid YouTube URL', 'warning');
                    }
                });
            });
        }
        
        // ====== Keyboard Shortcuts ======
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Number keys to switch tools
                if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
                    e.preventDefault();
                    const tools = ['downloader', 'transcriber', 'converter', 'batch'];
                    const toolIndex = parseInt(e.key) - 1;
                    if (tools[toolIndex]) {
                        this.switchTool(tools[toolIndex]);
                    }
                }
                
                // Ctrl/Cmd + Enter to submit current form
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    const activeSection = document.querySelector('.tool-section.active');
                    const form = activeSection?.querySelector('form');
                    const submitButton = form?.querySelector('button[type="submit"]');
                    if (submitButton && !submitButton.disabled) {
                        submitButton.click();
                    }
                }
                
                // Escape to clear current form
                if (e.key === 'Escape') {
                    const activeSection = document.querySelector('.tool-section.active');
                    const form = activeSection?.querySelector('form');
                    if (form && document.activeElement?.tagName === 'TEXTAREA') {
                        document.activeElement.value = '';
                        this.showAlert('Input cleared', 'info');
                    }
                }
            });
        }
        
        // ====== Enhanced Error Handling ======
        handleError(error, context = '') {
            console.error(`Error in ${context}:`, error);
            
            let message = 'An unexpected error occurred';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                message = 'Network connection failed. Please check your connection.';
            } else if (error.message) {
                message = error.message;
            }
            
            this.showAlert(message, 'danger');
        }
        
        // ====== Performance Monitoring ======
        monitorPerformance() {
            // Monitor memory usage
            if (performance.memory) {
                const memInfo = performance.memory;
                if (memInfo.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
                    console.warn('High memory usage detected:', memInfo);
                }
            }
            
            // Monitor task queue size
            if (this.tasks.size > 100) {
                console.warn('Large number of tasks in queue:', this.tasks.size);
                this.showAlert('Consider clearing completed tasks for better performance', 'info');
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
