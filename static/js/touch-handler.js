/**
 * Touch event handler for mobile devices
 */

class TouchHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.currentCard = null;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.swipeThreshold = 50;
        this.longPressTimer = null;
        this.longPressDuration = 500;
        
        if (this.isTouchDevice) {
            document.body.classList.add('touch-device');
            this.init();
        }
    }
    
    init() {
        // Prevent default touch behaviors
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Add orientation change listener
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        // Check initial orientation
        this.checkOrientation();
        
        // Initialize touch events for cards
        this.initCardTouch();
    }
    
    initCardTouch() {
        // Use event delegation for dynamically added cards
        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.card-item');
            if (card && !card.classList.contains('disabled')) {
                this.handleCardTouchStart(e, card);
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            const card = e.target.closest('.card-item');
            if (card && card === this.currentCard) {
                this.handleCardTouchEnd(e, card);
            }
        }, { passive: false });
    }
    
    handleCardTouchStart(e, card) {
        e.preventDefault();
        this.currentCard = card;
        card.classList.add('touching');
        
        // Store touch position
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        
        // Start long press timer for card info
        this.longPressTimer = setTimeout(() => {
            this.showCardInfo(card);
        }, this.longPressDuration);
    }
    
    handleCardTouchEnd(e, card) {
        e.preventDefault();
        
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        card.classList.remove('touching');
        
        // Check if it was a tap (not a swipe)
        const deltaX = Math.abs(this.touchEndX - this.touchStartX);
        const deltaY = Math.abs(this.touchEndY - this.touchStartY);
        
        if (deltaX < 10 && deltaY < 10) {
            // Trigger card play
            this.playCard(card);
        } else if (deltaY > this.swipeThreshold) {
            // Swipe up to play card (alternative gesture)
            if (this.touchStartY > this.touchEndY) {
                this.playCard(card);
            }
        }
        
        this.currentCard = null;
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }
    
    handleTouchMove(e) {
        // Prevent scrolling while touching cards
        if (this.currentCard) {
            e.preventDefault();
        }
        
        this.touchEndX = e.touches[0].clientX;
        this.touchEndY = e.touches[0].clientY;
    }
    
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].clientX;
        this.touchEndY = e.changedTouches[0].clientY;
        
        // Handle swipe gestures for navigation
        this.handleSwipe();
    }
    
    handleSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        
        // Only process significant swipes
        if (Math.abs(deltaX) < this.swipeThreshold && Math.abs(deltaY) < this.swipeThreshold) {
            return;
        }
        
        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                // Swipe right - could be used for navigation
                this.onSwipeRight();
            } else {
                // Swipe left - could be used for navigation
                this.onSwipeLeft();
            }
        }
    }
    
    onSwipeLeft() {
        // Could be used to show chat or emotes
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer && chatContainer.style.display === 'none') {
            chatContainer.style.display = 'block';
        }
    }
    
    onSwipeRight() {
        // Could be used to hide chat
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer && chatContainer.style.display === 'block') {
            chatContainer.style.display = 'none';
        }
    }
    
    playCard(card) {
        // Trigger click event for compatibility with existing code
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        card.dispatchEvent(clickEvent);
    }
    
    showCardInfo(card) {
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Show card details (could be expanded)
        console.log('Long press on card:', card);
    }
    
    handleOrientationChange() {
        setTimeout(() => {
            this.checkOrientation();
        }, 100);
    }
    
    checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (isPortrait && window.innerWidth <= 768) {
            this.showLandscapeMessage();
        } else {
            this.hideLandscapeMessage();
        }
    }
    
    showLandscapeMessage() {
        let message = document.getElementById('landscape-message');
        if (!message) {
            message = document.createElement('div');
            message.id = 'landscape-message';
            message.className = 'landscape-message';
            message.innerHTML = `
                <i class="fas fa-mobile-alt"></i>
                <h2>Bitte drehe dein Gerät</h2>
                <p>Tschau Sepp spielt sich am besten im Querformat!</p>
                <small>Drehe dein Gerät um 90°</small>
            `;
            document.body.appendChild(message);
        }
        message.style.display = 'flex';
    }
    
    hideLandscapeMessage() {
        const message = document.getElementById('landscape-message');
        if (message) {
            message.style.display = 'none';
        }
    }
    
    // Utility function to detect iOS
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    // Utility function to detect Android
    isAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    // Handle viewport height changes (for mobile browsers with hiding address bars)
    handleViewportChange() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
}

// Initialize touch handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.touchHandler = new TouchHandler();
    
    // Handle viewport changes
    window.addEventListener('resize', () => {
        if (window.touchHandler) {
            window.touchHandler.handleViewportChange();
        }
    });
    
    // Initial viewport setup
    if (window.touchHandler) {
        window.touchHandler.handleViewportChange();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchHandler;
}