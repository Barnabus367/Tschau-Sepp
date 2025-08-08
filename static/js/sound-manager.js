/**
 * Sound Manager for Tschau Sepp
 * Handles all game sounds and music
 */

class SoundManager {
    constructor() {
        this.enabled = true;
        this.musicEnabled = true;
        this.volume = 0.7;
        this.musicVolume = 0.3;
        
        // Sound library - using base64 encoded simple sounds
        this.sounds = {
            // Card sounds
            cardPlay: this.createBeep(440, 0.1, 'square'),
            cardDraw: this.createBeep(330, 0.1, 'sine'),
            cardShuffle: this.createNoise(0.2),
            
            // Special card sounds
            special7: this.createBeep(550, 0.2, 'triangle'),
            special8: this.createBeep(660, 0.2, 'sawtooth'),
            specialJack: this.createChord([440, 550, 660], 0.3),
            specialQueen: this.createChord([330, 440, 550], 0.3),
            specialAce: this.createBeep(880, 0.3, 'square'),
            
            // Game events
            yourTurn: this.createChime([523, 659, 784], 0.2),
            tschau: this.createChord([523, 659], 0.3),
            sepp: this.createVictorySound(),
            gameWin: this.createVictorySound(),
            gameLose: this.createLoseSound(),
            
            // UI sounds
            buttonClick: this.createBeep(600, 0.05, 'sine'),
            notification: this.createChime([440, 550], 0.15),
            error: this.createBeep(220, 0.2, 'sawtooth'),
            countdown: this.createBeep(440, 0.1, 'sine'),
            timeWarning: this.createBeep(880, 0.15, 'square'),
            
            // Chat/Emote sounds
            chatMessage: this.createBeep(520, 0.05, 'sine'),
            emoteReceived: this.createChime([660, 784], 0.1)
        };
        
        // Audio context
        this.audioContext = null;
        this.masterGain = null;
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize on first user interaction
        this.initialized = false;
        this.initOnInteraction();
    }
    
    initOnInteraction() {
        const initHandler = () => {
            if (!this.initialized) {
                this.init();
                this.initialized = true;
                document.removeEventListener('click', initHandler);
                document.removeEventListener('touchstart', initHandler);
            }
        };
        
        document.addEventListener('click', initHandler);
        document.addEventListener('touchstart', initHandler);
    }
    
    init() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('Sound system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.enabled = false;
        }
    }
    
    // Create a simple beep sound
    createBeep(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }
    
    // Create a chord (multiple frequencies)
    createChord(frequencies, duration) {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    this.createBeep(freq, duration, 'sine')();
                }, index * 50);
            });
        };
    }
    
    // Create a chime sound
    createChime(frequencies, duration) {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'sine';
                
                const startTime = this.audioContext.currentTime + (index * 0.1);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            });
        };
    }
    
    // Create noise sound (for shuffle)
    createNoise(duration) {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const whiteNoise = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            whiteNoise.buffer = buffer;
            whiteNoise.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            whiteNoise.start(this.audioContext.currentTime);
        };
    }
    
    // Create victory sound
    createVictorySound() {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            const notes = [523, 587, 659, 784, 880, 1047]; // C, D, E, G, A, C
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    this.createBeep(freq, 0.3, 'sine')();
                }, index * 100);
            });
        };
    }
    
    // Create lose sound
    createLoseSound() {
        return () => {
            if (!this.audioContext || !this.enabled) return;
            
            const notes = [440, 415, 392, 370, 349]; // Descending notes
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    this.createBeep(freq, 0.2, 'sawtooth')();
                }, index * 150);
            });
        };
    }
    
    // Play a sound by name
    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            this.sounds[soundName]();
        } catch (error) {
            console.error(`Failed to play sound ${soundName}:`, error);
        }
    }
    
    // Play card sound based on card type
    playCardSound(card) {
        if (!this.enabled) return;
        
        // Special card sounds
        if (card.value === '7') {
            this.play('special7');
        } else if (card.value === '8') {
            this.play('special8');
        } else if (card.value === 'U') { // Jack/Unter
            this.play('specialJack');
        } else if (card.value === 'O' && card.suit === 'rosen') { // Queen of Hearts
            this.play('specialQueen');
        } else if (card.value === 'A') {
            this.play('specialAce');
        } else {
            this.play('cardPlay');
        }
    }
    
    // Play countdown sound with increasing pitch
    playCountdown(secondsRemaining) {
        if (!this.enabled) return;
        
        if (secondsRemaining <= 5) {
            const frequency = 440 + ((5 - secondsRemaining) * 100);
            this.createBeep(frequency, 0.1, 'sine')();
        }
    }
    
    // Toggle sound on/off
    toggleSound() {
        this.enabled = !this.enabled;
        this.saveSettings();
        return this.enabled;
    }
    
    // Set volume (0-1)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        this.saveSettings();
    }
    
    // Save settings to localStorage
    saveSettings() {
        const settings = {
            enabled: this.enabled,
            volume: this.volume,
            musicEnabled: this.musicEnabled,
            musicVolume: this.musicVolume
        };
        localStorage.setItem('sound_settings', JSON.stringify(settings));
    }
    
    // Load settings from localStorage
    loadSettings() {
        try {
            const settings = localStorage.getItem('sound_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.enabled = parsed.enabled !== false;
                this.volume = parsed.volume || 0.7;
                this.musicEnabled = parsed.musicEnabled !== false;
                this.musicVolume = parsed.musicVolume || 0.3;
            }
        } catch (error) {
            console.error('Failed to load sound settings:', error);
        }
    }
    
    // Create sound control UI
    createControlUI() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'sound-controls';
        controlPanel.className = 'sound-controls';
        controlPanel.innerHTML = `
            <button id="sound-toggle" class="btn btn-sm btn-secondary">
                <i class="fas fa-volume-${this.enabled ? 'up' : 'mute'}"></i>
            </button>
            <input type="range" id="volume-slider" min="0" max="100" value="${this.volume * 100}" 
                   class="form-range" style="width: 100px; display: ${this.enabled ? 'inline-block' : 'none'};">
        `;
        
        return controlPanel;
    }
    
    // Attach event listeners for game events
    attachGameListeners() {
        // Listen for game events
        if (window.multiplayer) {
            window.multiplayer.on('game_update', (data) => {
                if (data.my_turn) {
                    this.play('yourTurn');
                }
            });
            
            window.multiplayer.on('game_won', (data) => {
                if (data.winner === window.multiplayer.playerId) {
                    this.play('gameWin');
                } else {
                    this.play('gameLose');
                }
            });
            
            window.multiplayer.on('chat_message', () => {
                this.play('chatMessage');
            });
            
            window.multiplayer.on('emote_received', () => {
                this.play('emoteReceived');
            });
            
            window.multiplayer.on('turn_timeout', () => {
                this.play('timeWarning');
            });
        }
    }
}

// Initialize sound manager
document.addEventListener('DOMContentLoaded', () => {
    window.soundManager = new SoundManager();
    
    // Add sound controls to UI
    const controlsContainer = document.querySelector('.game-timer');
    if (controlsContainer) {
        const soundControls = window.soundManager.createControlUI();
        controlsContainer.parentElement.insertBefore(soundControls, controlsContainer.nextSibling);
        
        // Attach control event listeners
        document.getElementById('sound-toggle')?.addEventListener('click', () => {
            const enabled = window.soundManager.toggleSound();
            const icon = document.querySelector('#sound-toggle i');
            icon.className = `fas fa-volume-${enabled ? 'up' : 'mute'}`;
            document.getElementById('volume-slider').style.display = enabled ? 'inline-block' : 'none';
        });
        
        document.getElementById('volume-slider')?.addEventListener('input', (e) => {
            window.soundManager.setVolume(e.target.value / 100);
        });
    }
    
    // Attach game listeners
    setTimeout(() => {
        window.soundManager.attachGameListeners();
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}