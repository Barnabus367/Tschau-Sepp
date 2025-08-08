/**
 * Error Recovery and State Management System
 */

class ErrorRecovery {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.connectionLost = false;
        this.lastKnownState = null;
        this.stateBackups = [];
        this.maxBackups = 5;
        this.autoSaveInterval = 10000; // 10 seconds
        this.errorLog = [];
        
        this.init();
    }
    
    init() {
        // Start auto-save timer
        this.startAutoSave();
        
        // Listen for errors
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
        
        // Network status monitoring
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Page visibility for auto-pause
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Restore state if exists
        this.restoreState();
    }
    
    // Auto-save game state periodically
    startAutoSave() {
        setInterval(() => {
            if (window.currentGameState) {
                this.saveState(window.currentGameState);
            }
        }, this.autoSaveInterval);
    }
    
    // Save current game state
    saveState(state) {
        try {
            const backup = {
                timestamp: Date.now(),
                state: JSON.stringify(state),
                roomCode: window.multiplayer?.roomCode,
                playerId: window.multiplayer?.playerId
            };
            
            // Add to backups array
            this.stateBackups.push(backup);
            
            // Limit number of backups
            if (this.stateBackups.length > this.maxBackups) {
                this.stateBackups.shift();
            }
            
            // Save to localStorage
            localStorage.setItem('game_state_backup', JSON.stringify(backup));
            localStorage.setItem('game_state_history', JSON.stringify(this.stateBackups));
            
            console.log('Game state saved');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    // Restore game state from backup
    restoreState() {
        try {
            const backup = localStorage.getItem('game_state_backup');
            if (backup) {
                const data = JSON.parse(backup);
                
                // Check if backup is recent (within 1 hour)
                const age = Date.now() - data.timestamp;
                if (age < 3600000) {
                    this.lastKnownState = JSON.parse(data.state);
                    console.log('Game state restored from backup');
                    return this.lastKnownState;
                }
            }
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
        return null;
    }
    
    // Handle connection errors with retry logic
    async handleConnectionError(error, action, data) {
        console.error('Connection error:', error);
        
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                // Show retry notification
                this.showRetryNotification(i + 1, this.maxRetries);
                
                // Wait before retry
                await this.delay(this.retryDelay * Math.pow(2, i)); // Exponential backoff
                
                // Retry the action
                const result = await action(data);
                
                // Success - hide notification
                this.hideRetryNotification();
                return result;
                
            } catch (retryError) {
                console.error(`Retry ${i + 1} failed:`, retryError);
                
                if (i === this.maxRetries - 1) {
                    // Final retry failed
                    this.handleFatalError(retryError);
                }
            }
        }
    }
    
    // Handle network offline
    handleOffline() {
        console.log('Network connection lost');
        this.connectionLost = true;
        
        // Save current state
        if (window.currentGameState) {
            this.saveState(window.currentGameState);
        }
        
        // Show offline notification
        this.showOfflineNotification();
        
        // Pause game if playing
        if (window.multiplayer?.gameState?.status === 'playing') {
            this.pauseGameLocally();
        }
    }
    
    // Handle network online
    handleOnline() {
        console.log('Network connection restored');
        this.connectionLost = false;
        
        // Hide offline notification
        this.hideOfflineNotification();
        
        // Attempt to reconnect
        this.attemptReconnection();
    }
    
    // Attempt to reconnect to game
    async attemptReconnection() {
        if (!window.multiplayer || !window.multiplayer.roomCode) {
            return;
        }
        
        try {
            // Show reconnecting modal
            this.showReconnectingModal();
            
            // Try to reconnect
            await window.multiplayer.connect();
            
            // Restore game state if needed
            if (this.lastKnownState) {
                console.log('Restoring game state after reconnection');
                // The server should handle state restoration
            }
            
            // Hide modal
            this.hideReconnectingModal();
            
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.handleFatalError(error);
        }
    }
    
    // Handle visibility change (tab switching)
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden - save state
            if (window.currentGameState) {
                this.saveState(window.currentGameState);
            }
        } else {
            // Page is visible again - check connection
            if (this.connectionLost) {
                this.attemptReconnection();
            }
        }
    }
    
    // Handle global JavaScript errors
    handleGlobalError(event) {
        const error = {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error,
            timestamp: Date.now()
        };
        
        this.logError(error);
        
        // Don't prevent default handling for development
        if (window.location.hostname === 'localhost') {
            return;
        }
        
        // Prevent error from showing in production
        event.preventDefault();
        
        // Show user-friendly error message
        this.showErrorNotification('Ein Fehler ist aufgetreten. Das Spiel wird automatisch wiederhergestellt.');
    }
    
    // Handle promise rejections
    handlePromiseRejection(event) {
        const error = {
            message: 'Unhandled promise rejection',
            reason: event.reason,
            timestamp: Date.now()
        };
        
        this.logError(error);
        
        // Handle specific error types
        if (event.reason?.message?.includes('WebSocket')) {
            this.handleConnectionError(event.reason);
        }
    }
    
    // Log errors for debugging
    logError(error) {
        this.errorLog.push(error);
        
        // Limit error log size
        if (this.errorLog.length > 50) {
            this.errorLog.shift();
        }
        
        // Save to localStorage for debugging
        try {
            localStorage.setItem('error_log', JSON.stringify(this.errorLog));
        } catch (e) {
            console.error('Failed to save error log:', e);
        }
    }
    
    // Handle fatal errors
    handleFatalError(error) {
        console.error('Fatal error:', error);
        
        // Save state
        if (window.currentGameState) {
            this.saveState(window.currentGameState);
        }
        
        // Show error modal with recovery options
        this.showFatalErrorModal(error);
    }
    
    // UI Notifications
    showRetryNotification(attempt, maxAttempts) {
        let notification = document.getElementById('retry-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'retry-notification';
            notification.className = 'alert alert-warning position-fixed top-0 start-50 translate-middle-x mt-3';
            notification.style.zIndex = '9999';
            document.body.appendChild(notification);
        }
        
        notification.innerHTML = `
            <i class="fas fa-sync-alt fa-spin me-2"></i>
            Verbindung wird wiederhergestellt... (Versuch ${attempt}/${maxAttempts})
        `;
        notification.style.display = 'block';
    }
    
    hideRetryNotification() {
        const notification = document.getElementById('retry-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }
    
    showOfflineNotification() {
        let notification = document.getElementById('offline-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'alert alert-danger position-fixed bottom-0 start-50 translate-middle-x mb-3';
            notification.style.zIndex = '9999';
            document.body.appendChild(notification);
        }
        
        notification.innerHTML = `
            <i class="fas fa-wifi me-2"></i>
            Keine Internetverbindung. Spiel wurde pausiert.
        `;
        notification.style.display = 'block';
    }
    
    hideOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }
    
    showReconnectingModal() {
        let modal = document.getElementById('reconnecting-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reconnecting-modal';
            modal.className = 'reconnect-modal';
            modal.innerHTML = `
                <div class="reconnect-content">
                    <h3>Verbindung wird wiederhergestellt...</h3>
                    <div class="reconnect-spinner"></div>
                    <p>Bitte warten...</p>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
    }
    
    hideReconnectingModal() {
        const modal = document.getElementById('reconnecting-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        notification.style.zIndex = '9999';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    showFatalErrorModal(error) {
        const modal = document.createElement('div');
        modal.className = 'modal fade show d-block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Ein Fehler ist aufgetreten</h5>
                    </div>
                    <div class="modal-body">
                        <p>Das Spiel konnte nicht fortgesetzt werden.</p>
                        <small class="text-muted">Fehler: ${error.message || 'Unbekannter Fehler'}</small>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="location.reload()">Neu laden</button>
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.errorRecovery.recoverFromBackup()">Wiederherstellen</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Recover from backup
    recoverFromBackup() {
        const state = this.restoreState();
        if (state && window.multiplayer) {
            // Attempt to rejoin with saved state
            console.log('Attempting recovery from backup');
            window.location.reload(); // Simple recovery: reload and auto-reconnect
        }
    }
    
    // Pause game locally during connection issues
    pauseGameLocally() {
        // Visual indication
        const pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        pauseOverlay.className = 'game-paused-overlay';
        pauseOverlay.innerHTML = `
            <div class="game-paused-message">
                <i class="fas fa-pause-circle fa-3x mb-3"></i>
                <h3>Spiel pausiert</h3>
                <p>Warte auf Verbindung...</p>
            </div>
        `;
        
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard && !document.getElementById('pause-overlay')) {
            gameBoard.appendChild(pauseOverlay);
        }
    }
    
    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Get error report for debugging
    getErrorReport() {
        return {
            errors: this.errorLog,
            lastState: this.lastKnownState,
            backups: this.stateBackups.length,
            connectionStatus: !this.connectionLost
        };
    }
}

// Initialize error recovery system
document.addEventListener('DOMContentLoaded', () => {
    window.errorRecovery = new ErrorRecovery();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecovery;
}