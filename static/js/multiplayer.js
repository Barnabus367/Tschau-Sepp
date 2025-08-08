// Multiplayer client-side logic using Socket.IO

class MultiplayerClient {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerName = null;
        this.gameState = null;
        this.isConnected = false;
        this.callbacks = {};
        this.reconnectToken = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    connect() {
        // Check for stored reconnect token
        this.reconnectToken = localStorage.getItem('reconnect_token');
        const tokenExpiry = localStorage.getItem('reconnect_token_expiry');
        
        // Clear expired token
        if (this.reconnectToken && tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
            localStorage.removeItem('reconnect_token');
            localStorage.removeItem('reconnect_token_expiry');
            this.reconnectToken = null;
        }
        
        // Connect to Socket.IO server with reconnect token if available
        const options = {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        };
        
        if (this.reconnectToken) {
            options.query = { reconnect_token: this.reconnectToken };
        }
        
        this.socket = io(options);
        
        this.setupEventHandlers();
        
        return new Promise((resolve, reject) => {
            this.socket.on('connected', (data) => {
                this.playerId = data.sid;
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('Connected to server with ID:', this.playerId);
                resolve(data);
            });
            
            this.socket.on('reconnected', (data) => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('Reconnected successfully');
                this.trigger('successful_reconnect', data);
                resolve(data);
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(error);
                }
            });
        });
    }
    
    setupEventHandlers() {
        // Connection events
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('Disconnected from server');
            this.trigger('disconnected');
        });
        
        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            this.trigger('reconnected');
        });
        
        // Store reconnect token when disconnected
        this.socket.on('store_reconnect_token', (data) => {
            localStorage.setItem('reconnect_token', data.token);
            localStorage.setItem('reconnect_token_expiry', Date.now() + (data.expires_in * 1000));
            console.log('Stored reconnect token');
        });
        
        // Handle game pause/resume
        this.socket.on('game_paused', (data) => {
            console.log('Game paused:', data);
            this.trigger('game_paused', data);
        });
        
        this.socket.on('game_resumed', (data) => {
            console.log('Game resumed');
            this.trigger('game_resumed', data);
        });
        
        this.socket.on('player_reconnected', (data) => {
            console.log('Player reconnected:', data);
            this.trigger('player_reconnected', data);
        });
        
        // Room events
        this.socket.on('room_created', (data) => {
            this.roomCode = data.room_code;
            this.playerId = data.player_id;
            console.log('Room created:', data);
            this.trigger('room_created', data);
        });
        
        this.socket.on('room_joined', (data) => {
            this.roomCode = data.room_code;
            this.playerId = data.player_id;
            console.log('Joined room:', data);
            this.trigger('room_joined', data);
        });
        
        this.socket.on('player_joined', (data) => {
            console.log('Player joined:', data);
            this.trigger('player_joined', data);
        });
        
        this.socket.on('player_left', (data) => {
            console.log('Player left:', data);
            this.trigger('player_left', data);
        });
        
        this.socket.on('player_disconnected', (data) => {
            console.log('Player disconnected:', data);
            this.trigger('player_disconnected', data);
        });
        
        // Game events
        this.socket.on('game_started', (data) => {
            this.gameState = data;
            console.log('Game started:', data);
            this.trigger('game_started', data);
        });
        
        this.socket.on('game_update', (data) => {
            this.gameState = data;
            console.log('Game update:', data);
            this.trigger('game_update', data);
        });
        
        this.socket.on('game_won', (data) => {
            console.log('Game won:', data);
            this.trigger('game_won', data);
        });
        
        this.socket.on('move_rejected', (data) => {
            console.log('Move rejected:', data);
            this.trigger('move_rejected', data);
        });
        
        this.socket.on('tschau_called', (data) => {
            console.log('Tschau called:', data);
            this.trigger('tschau_called', data);
        });
        
        this.socket.on('sepp_failed', (data) => {
            console.log('Sepp failed:', data);
            this.trigger('sepp_failed', data);
        });
        
        // Timer events
        this.socket.on('turn_started', (data) => {
            console.log('Turn started:', data);
            this.trigger('turn_started', data);
        });
        
        this.socket.on('turn_timeout', (data) => {
            console.log('Turn timeout:', data);
            this.trigger('turn_timeout', data);
        });
        
        // Rematch events
        this.socket.on('rematch_requested', (data) => {
            console.log('Rematch requested:', data);
            this.trigger('rematch_requested', data);
        });
        
        this.socket.on('rematch_accepted', (data) => {
            console.log('Rematch accepted:', data);
            this.trigger('rematch_accepted', data);
        });
        
        // Chat and emote events
        this.socket.on('chat_message', (data) => {
            console.log('Chat message:', data);
            this.trigger('chat_message', data);
        });
        
        this.socket.on('emote_received', (data) => {
            console.log('Emote received:', data);
            this.trigger('emote_received', data);
        });
        
        // Error handling
        this.socket.on('error', (data) => {
            console.error('Server error:', data);
            this.trigger('error', data);
        });
    }
    
    // Room management
    createRoom(playerName) {
        this.playerName = playerName;
        return new Promise((resolve, reject) => {
            this.socket.emit('create_room', { player_name: playerName });
            
            const handler = (data) => {
                this.socket.off('room_created', handler);
                resolve(data);
            };
            
            this.socket.on('room_created', handler);
            
            setTimeout(() => {
                this.socket.off('room_created', handler);
                reject(new Error('Room creation timeout'));
            }, 5000);
        });
    }
    
    joinRoom(roomCode, playerName) {
        this.playerName = playerName;
        return new Promise((resolve, reject) => {
            this.socket.emit('join_room', { 
                room_code: roomCode,
                player_name: playerName 
            });
            
            const successHandler = (data) => {
                this.socket.off('room_joined', successHandler);
                this.socket.off('error', errorHandler);
                resolve(data);
            };
            
            const errorHandler = (data) => {
                this.socket.off('room_joined', successHandler);
                this.socket.off('error', errorHandler);
                reject(new Error(data.message));
            };
            
            this.socket.on('room_joined', successHandler);
            this.socket.on('error', errorHandler);
            
            setTimeout(() => {
                this.socket.off('room_joined', successHandler);
                this.socket.off('error', errorHandler);
                reject(new Error('Join room timeout'));
            }, 5000);
        });
    }
    
    leaveRoom() {
        this.socket.emit('leave_room', {});
        this.roomCode = null;
    }
    
    // Game actions
    startGame() {
        this.socket.emit('start_game', {});
    }
    
    addBot(difficulty = 'medium') {
        this.socket.emit('add_bot', { difficulty: difficulty });
    }
    
    playCard(card) {
        this.socket.emit('play_card', { card: card });
    }
    
    drawCard() {
        this.socket.emit('draw_card', {});
    }
    
    selectColor(color) {
        this.socket.emit('select_color', { color: color });
    }
    
    callTschau() {
        this.socket.emit('call_tschau', {});
    }
    
    callSepp() {
        this.socket.emit('call_sepp', {});
    }
    
    requestRematch() {
        this.socket.emit('request_rematch', {});
    }
    
    sendChat(message) {
        this.socket.emit('send_chat', { message: message });
    }
    
    sendEmote(emote) {
        this.socket.emit('send_emote', { emote: emote });
    }
    
    // Event management
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }
    
    trigger(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    // Utility methods
    isMyTurn() {
        return this.gameState && this.gameState.my_turn;
    }
    
    getMyHand() {
        return this.gameState ? this.gameState.hand : [];
    }
    
    getCurrentPlayer() {
        return this.gameState ? this.gameState.current_player_name : null;
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }
}

// Export for use in main game.js
window.MultiplayerClient = MultiplayerClient;