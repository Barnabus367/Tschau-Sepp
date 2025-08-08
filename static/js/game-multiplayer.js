// Multiplayer-integrated game logic
document.addEventListener('DOMContentLoaded', function() {
    // Initialize multiplayer client
    const multiplayer = new MultiplayerClient();
    let isMultiplayer = false;
    let currentGameState = null;
    
    // UI Elements - Lobby
    const lobbyScreen = document.getElementById('lobby-screen');
    const waitingRoom = document.getElementById('waiting-room');
    const gameScreen = document.getElementById('game-screen');
    const playerNameInput = document.getElementById('player-name');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const displayRoomCode = document.getElementById('display-room-code');
    const waitingPlayerList = document.getElementById('waiting-player-list');
    const startGameBtn = document.getElementById('start-game-btn');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const addBotBtn = document.getElementById('add-bot-btn');
    const waitingStatus = document.getElementById('waiting-status');
    
    // UI Elements - Game
    const player1Hand = document.getElementById('player1-hand');
    const player2Hand = document.getElementById('player2-hand');
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    const player1CardCount = document.getElementById('player1-card-count');
    const player2CardCount = document.getElementById('player2-card-count');
    const player1Area = document.getElementById('player1-area');
    const player2Area = document.getElementById('player2-area');
    const discardPile = document.getElementById('discard-pile');
    const drawCardBtn = document.getElementById('draw-card');
    const tschauBtn = document.getElementById('tschau-button');
    const seppBtn = document.getElementById('sepp-button');
    const colorSelection = document.getElementById('color-selection');
    const colorButtons = document.querySelectorAll('.color-btn');
    const gameStatus = document.getElementById('game-status');
    const currentPlayer = document.getElementById('current-player');
    const messageLog = document.getElementById('message-log');
    const colorDisplay = document.getElementById('color-display');
    const gameTimer = document.getElementById('game-timer');
    
    // German suit names
    const suitNames = {
        'rosen': 'Rose',
        'schellen': 'Schelle',
        'schilten': 'Schilten',
        'eichel': 'Eichel'
    };
    
    // Initialize connection
    async function init() {
        try {
            await multiplayer.connect();
            setupMultiplayerEventHandlers();
            setupLobbyEventHandlers();
        } catch (error) {
            console.error('Failed to connect to server:', error);
            showError('Verbindung zum Server fehlgeschlagen');
        }
    }
    
    // Setup lobby event handlers
    function setupLobbyEventHandlers() {
        createRoomBtn.addEventListener('click', async () => {
            const playerName = playerNameInput.value.trim() || 'Spieler';
            try {
                const result = await multiplayer.createRoom(playerName);
                showWaitingRoom(result);
            } catch (error) {
                showError('Raum konnte nicht erstellt werden');
            }
        });
        
        joinRoomBtn.addEventListener('click', async () => {
            const roomCode = roomCodeInput.value.trim().toUpperCase();
            const playerName = playerNameInput.value.trim() || 'Spieler';
            
            if (roomCode.length !== 6) {
                showError('Bitte gib einen 6-stelligen Raum-Code ein');
                return;
            }
            
            try {
                const result = await multiplayer.joinRoom(roomCode, playerName);
                showWaitingRoom(result);
            } catch (error) {
                showError(error.message || 'Raum konnte nicht betreten werden');
            }
        });
        
        leaveRoomBtn.addEventListener('click', () => {
            multiplayer.leaveRoom();
            showLobby();
        });
        
        startGameBtn.addEventListener('click', () => {
            multiplayer.startGame();
        });
        
        addBotBtn.addEventListener('click', () => {
            multiplayer.addBot('medium');
            addBotBtn.disabled = true;
            addBotBtn.textContent = 'Bot wird hinzugefügt...';
        });
        
        // Allow Enter key in room code input
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoomBtn.click();
            }
        });
    }
    
    // Setup multiplayer event handlers
    function setupMultiplayerEventHandlers() {
        multiplayer.on('room_created', (data) => {
            showWaitingRoom(data);
        });
        
        multiplayer.on('room_joined', (data) => {
            showWaitingRoom(data);
        });
        
        multiplayer.on('player_joined', (data) => {
            updateWaitingRoom(data);
        });
        
        multiplayer.on('player_left', (data) => {
            updateWaitingRoom(data);
        });
        
        multiplayer.on('game_started', (data) => {
            isMultiplayer = true;
            currentGameState = data;
            showGame();
            updateGameUI(data);
        });
        
        multiplayer.on('game_update', (data) => {
            currentGameState = data;
            updateGameUI(data);
        });
        
        multiplayer.on('game_won', (data) => {
            showWinner(data);
        });
        
        multiplayer.on('move_rejected', (data) => {
            showError(data.reason);
        });
        
        multiplayer.on('error', (data) => {
            showError(data.message);
        });
        
        multiplayer.on('disconnected', () => {
            showError('Verbindung zum Server verloren');
        });
        
        multiplayer.on('reconnected', () => {
            showInfo('Verbindung wiederhergestellt');
        });
    }
    
    // UI State Management
    function showLobby() {
        lobbyScreen.classList.remove('d-none');
        waitingRoom.classList.add('d-none');
        gameScreen.classList.add('d-none');
        roomCodeInput.value = '';
    }
    
    function showWaitingRoom(data) {
        lobbyScreen.classList.add('d-none');
        waitingRoom.classList.remove('d-none');
        gameScreen.classList.add('d-none');
        
        displayRoomCode.textContent = data.room_code;
        updateWaitingRoom(data);
    }
    
    function updateWaitingRoom(data) {
        // Update player list
        waitingPlayerList.innerHTML = '';
        data.players.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            let badges = '';
            if (player.id === multiplayer.playerId) {
                badges += '<span class="badge bg-primary">Du</span>';
            }
            if (player.is_ai) {
                badges += '<span class="badge bg-warning ms-1"><i class="fas fa-robot"></i> Bot</span>';
            }
            li.innerHTML = `
                <span>${player.name}</span>
                <div>${badges}</div>
            `;
            waitingPlayerList.appendChild(li);
        });
        
        // Hide/show add bot button
        if (addBotBtn) {
            if (data.players.length >= 2) {
                addBotBtn.style.display = 'none';
            } else {
                addBotBtn.style.display = 'block';
                addBotBtn.disabled = false;
                addBotBtn.innerHTML = '<i class="fas fa-robot me-2"></i>Bot hinzufügen';
            }
        }
        
        // Update start button and status
        if (data.ready_to_start || data.players.length === 2) {
            startGameBtn.disabled = false;
            waitingStatus.textContent = 'Bereit zum Starten!';
            waitingStatus.className = 'mt-3 text-center text-success';
        } else {
            startGameBtn.disabled = true;
            waitingStatus.textContent = 'Warte auf zweiten Spieler...';
            waitingStatus.className = 'mt-3 text-center text-muted';
        }
    }
    
    function showGame() {
        lobbyScreen.classList.add('d-none');
        waitingRoom.classList.add('d-none');
        gameScreen.classList.remove('d-none');
    }
    
    // Update game UI based on server state
    function updateGameUI(state) {
        if (!state) return;
        
        // Update player names and hands
        const isPlayer1 = state.player_id === multiplayer.playerId;
        
        if (isPlayer1) {
            player1Name.textContent = multiplayer.playerName + ' (Du)';
            renderPlayerHand(state.hand, player1Hand, true);
            
            if (state.other_players[0]) {
                player2Name.textContent = state.other_players[0].name;
                renderOpponentHand(state.other_players[0].card_count, player2Hand);
                player2CardCount.textContent = state.other_players[0].card_count;
            }
        } else {
            player2Name.textContent = multiplayer.playerName + ' (Du)';
            renderPlayerHand(state.hand, player2Hand, true);
            
            if (state.other_players[0]) {
                player1Name.textContent = state.other_players[0].name;
                renderOpponentHand(state.other_players[0].card_count, player1Hand);
                player1CardCount.textContent = state.other_players[0].card_count;
            }
        }
        
        // Update card count for self
        if (isPlayer1) {
            player1CardCount.textContent = state.hand.length;
        } else {
            player2CardCount.textContent = state.hand.length;
        }
        
        // Update discard pile
        if (state.discard_top) {
            renderDiscardPile(state.discard_top);
        }
        
        // Update current player indicator
        const myTurn = state.my_turn;
        player1Area.classList.toggle('current-player', isPlayer1 && myTurn);
        player2Area.classList.toggle('current-player', !isPlayer1 && myTurn);
        
        // Update game status
        gameStatus.textContent = myTurn ? 'Dein Zug' : 'Warte auf Gegner';
        gameStatus.className = myTurn ? 'badge bg-success' : 'badge bg-secondary';
        currentPlayer.textContent = state.current_player_name + ' ist an der Reihe';
        
        // Update current color
        if (state.current_color) {
            colorDisplay.textContent = suitNames[state.current_color];
        }
        
        // Handle color selection
        if (state.waiting_for_color && myTurn) {
            colorSelection.classList.remove('d-none');
        } else {
            colorSelection.classList.add('d-none');
        }
        
        // Update action buttons
        drawCardBtn.disabled = !myTurn || state.waiting_for_color;
        
        // Show Tschau/Sepp buttons if applicable
        if (myTurn) {
            if (state.hand.length === 2) {
                tschauBtn.classList.remove('d-none');
            } else {
                tschauBtn.classList.add('d-none');
            }
            
            if (state.hand.length === 0) {
                seppBtn.classList.remove('d-none');
            } else {
                seppBtn.classList.add('d-none');
            }
        } else {
            tschauBtn.classList.add('d-none');
            seppBtn.classList.add('d-none');
        }
        
        // Update messages
        if (state.messages && state.messages.length > 0) {
            messageLog.innerHTML = '';
            state.messages.forEach(msg => addMessage(msg));
        }
    }
    
    // Render player's hand
    function renderPlayerHand(cards, container, isPlayable) {
        container.innerHTML = '';
        cards.forEach((card, index) => {
            const cardElement = createCardElement(card, isPlayable && currentGameState.my_turn);
            const fanning = (index - (cards.length - 1) / 2) * 5;
            cardElement.style.setProperty('--card-angle', fanning);
            container.appendChild(cardElement);
        });
    }
    
    // Render opponent's hand (card backs)
    function renderOpponentHand(cardCount, container) {
        container.innerHTML = '';
        for (let i = 0; i < cardCount; i++) {
            const cardBack = document.createElement('div');
            cardBack.className = 'card-item card-back-jass';
            const fanning = (i - (cardCount - 1) / 2) * 5;
            cardBack.style.setProperty('--card-angle', fanning);
            container.appendChild(cardBack);
        }
    }
    
    // Create card element
    function createCardElement(card, isPlayable) {
        const suitOffset = {
            'eichel': 0,
            'rosen': 9,
            'schellen': 18,
            'schilten': 27
        };
        
        const valueOffset = {
            '6': 0, '7': 1, '8': 2, '9': 3,
            'U': 4, 'O': 5, 'K': 6, 'A': 7, 'B': 8
        };
        
        const imageIndex = suitOffset[card.suit] + valueOffset[card.value];
        
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item card-real-image';
        
        if (!isPlayable || !canPlayCard(card)) {
            cardElement.classList.add('disabled');
        }
        
        const cardImagePath = `/static/images/karten/Jasskarten-Deutsch-images-${imageIndex}.jpg`;
        cardElement.style.backgroundImage = `url('${cardImagePath}')`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        
        if (isPlayable && canPlayCard(card)) {
            cardElement.addEventListener('click', () => {
                // Play sound effect
                if (window.soundManager) {
                    window.soundManager.playCardSound(card);
                }
                multiplayer.playCard(card);
            });
            
            cardElement.addEventListener('mouseover', (e) => {
                const rect = cardElement.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const tiltX = ((y / rect.height) - 0.5) * 10;
                const tiltY = ((x / rect.width) - 0.5) * -10;
                cardElement.style.transform = `rotate(calc(var(--card-angle, 0) * 1deg)) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
            });
            
            cardElement.addEventListener('mouseout', () => {
                cardElement.style.transform = `rotate(calc(var(--card-angle, 0) * 1deg))`;
            });
        }
        
        return cardElement;
    }
    
    // Check if card can be played
    function canPlayCard(card) {
        if (!currentGameState || !currentGameState.my_turn) return false;
        
        // Special handling for must draw cards
        if (currentGameState.must_draw_cards > 0) {
            if (currentGameState.special_effect === '7' && card.value === '7') return true;
            if (currentGameState.special_effect === 'O' && card.value === 'O' && card.suit === 'rosen') return true;
            return false;
        }
        
        // Ace rule
        if (currentGameState.special_effect === 'A') {
            return card.suit === currentGameState.current_color || card.value === 'A';
        }
        
        // Standard rules
        return card.suit === currentGameState.current_color || card.value === currentGameState.current_value;
    }
    
    // Render discard pile
    function renderDiscardPile(topCard) {
        discardPile.innerHTML = '';
        
        if (topCard) {
            const cardElement = createCardElement(topCard, false);
            const rotation = Math.random() * 10 - 5;
            cardElement.style.transform = `rotate(${rotation}deg)`;
            discardPile.appendChild(cardElement);
        }
    }
    
    // Game action handlers
    drawCardBtn.addEventListener('click', () => {
        if (isMultiplayer) {
            if (window.soundManager) {
                window.soundManager.play('cardDraw');
            }
            multiplayer.drawCard();
        }
    });
    
    tschauBtn.addEventListener('click', () => {
        if (isMultiplayer) {
            if (window.soundManager) {
                window.soundManager.play('tschau');
            }
            multiplayer.callTschau();
        }
    });
    
    seppBtn.addEventListener('click', () => {
        if (isMultiplayer) {
            if (window.soundManager) {
                window.soundManager.play('sepp');
            }
            multiplayer.callSepp();
        }
    });
    
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (isMultiplayer) {
                const colorMap = {
                    'hearts': 'rosen',
                    'diamonds': 'schellen',
                    'clubs': 'schilten',
                    'spades': 'eichel'
                };
                multiplayer.selectColor(colorMap[button.dataset.color]);
            }
        });
    });
    
    // Utility functions
    function addMessage(message) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageLog.appendChild(messageElement);
        messageLog.scrollTop = messageLog.scrollHeight;
    }
    
    function showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
    
    function showInfo(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-info alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
    
    function showWinner(data) {
        const winnerName = data.player_name || 'Spieler';
        const isMe = data.winner === multiplayer.playerId;
        
        const modal = document.createElement('div');
        modal.className = 'modal fade show d-block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Spiel beendet!</h5>
                    </div>
                    <div class="modal-body text-center">
                        <h3>${isMe ? '🎉 Du hast gewonnen! 🎉' : winnerName + ' hat gewonnen!'}</h3>
                        <p>${isMe ? 'Glückwunsch!' : 'Viel Glück beim nächsten Mal!'}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Neues Spiel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Initialize the application
    init();
});