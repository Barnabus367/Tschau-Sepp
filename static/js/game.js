document.addEventListener('DOMContentLoaded', function() {
    // Game state
    const gameState = {
        started: false,
        currentPlayer: 0, // 0 for player 1, 1 for player 2
        players: [
            { id: 0, name: 'Spieler 1', hand: [], hasCalled: { tschau: false, sepp: false } },
            { id: 1, name: 'Spieler 2', hand: [], hasCalled: { tschau: false, sepp: false } }
        ],
        deck: [],
        discardPile: [],
        currentColor: null,
        currentValue: null,
        specialEffectActive: null,
        waitingForColorSelection: false,
        skipNextPlayer: false,
        mustDrawCards: 0,
        mustPlaySameColor: false,
        acePlayed: false,
        gameTime: 0,
        timerInterval: null
    };

    // Card suits and values
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suitSymbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
    };
    
    // German translations
    const suitNames = {
        'hearts': 'Herz',
        'diamonds': 'Karo',
        'clubs': 'Kreuz',
        'spades': 'Pik'
    };

    // DOM elements
    const startGameBtn = document.getElementById('start-game');
    const drawCardBtn = document.getElementById('draw-card');
    const tschauBtn = document.getElementById('tschau-button');
    const seppBtn = document.getElementById('sepp-button');
    const colorSelection = document.getElementById('color-selection');
    const colorButtons = document.querySelectorAll('.color-btn');
    const player1Hand = document.getElementById('player1-hand');
    const player2Hand = document.getElementById('player2-hand');
    const player1Area = document.getElementById('player1-area');
    const player2Area = document.getElementById('player2-area');
    const player1CardCount = document.getElementById('player1-card-count');
    const player2CardCount = document.getElementById('player2-card-count');
    const discardPile = document.getElementById('discard-pile');
    const deck = document.getElementById('deck');
    const gameStatus = document.getElementById('game-status');
    const currentPlayer = document.getElementById('current-player');
    const messageLog = document.getElementById('message-log');
    const colorDisplay = document.getElementById('color-display');
    const gameTimer = document.getElementById('game-timer');

    // Timer functions
    function startTimer() {
        // Clear any existing timer
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }
        
        gameState.gameTime = 0;
        updateTimerDisplay();
        
        // Start a new timer that updates every second
        gameState.timerInterval = setInterval(() => {
            gameState.gameTime++;
            updateTimerDisplay();
        }, 1000);
    }
    
    function stopTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(gameState.gameTime / 60);
        const seconds = gameState.gameTime % 60;
        gameTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Initialize event listeners
    function initEventListeners() {
        startGameBtn.addEventListener('click', startNewGame);
        drawCardBtn.addEventListener('click', drawCard);
        tschauBtn.addEventListener('click', callTschau);
        seppBtn.addEventListener('click', callSepp);
        
        colorButtons.forEach(button => {
            button.addEventListener('click', () => selectColor(button.dataset.color));
        });
    }

    // Initialize the game
    function initGame() {
        initEventListeners();
        updateUI();
    }

    // Start a new game
    function startNewGame() {
        // Reset game state
        gameState.started = true;
        gameState.currentPlayer = 0;
        gameState.players[0].hand = [];
        gameState.players[1].hand = [];
        gameState.players[0].hasCalled = { tschau: false, sepp: false };
        gameState.players[1].hasCalled = { tschau: false, sepp: false };
        gameState.deck = [];
        gameState.discardPile = [];
        gameState.currentColor = null;
        gameState.currentValue = null;
        gameState.specialEffectActive = null;
        gameState.waitingForColorSelection = false;
        gameState.skipNextPlayer = false;
        gameState.mustDrawCards = 0;
        gameState.mustPlaySameColor = false;
        gameState.acePlayed = false;
        
        // Start the game timer
        startTimer();
        
        // Create and shuffle the deck
        createDeck();
        shuffleDeck();
        
        // Deal cards to players
        dealCards();
        
        // Start the game by turning over the top card
        const startCard = gameState.deck.pop();
        gameState.discardPile.push(startCard);
        gameState.currentColor = startCard.suit;
        gameState.currentValue = startCard.value;
        
        // Handle if the start card is a special card
        handleSpecialCardEffects(startCard, true);
        
        // Log game start
        addMessage('Spiel gestartet! ' + gameState.players[gameState.currentPlayer].name + ' ist an der Reihe.');
        
        // Update UI
        updateUI();
    }

    // Create a deck of cards
    function createDeck() {
        gameState.deck = [];
        for (let suit of suits) {
            for (let value of values) {
                gameState.deck.push({ suit, value });
            }
        }
    }

    // Shuffle the deck
    function shuffleDeck() {
        for (let i = gameState.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
        }
    }

    // Deal cards to players
    function dealCards() {
        for (let i = 0; i < 7; i++) {
            for (let player of gameState.players) {
                player.hand.push(gameState.deck.pop());
            }
        }
    }

    // Draw a card from the deck
    function drawCard() {
        if (!gameState.started || gameState.waitingForColorSelection) {
            return;
        }
        
        const currentPlayerObj = gameState.players[gameState.currentPlayer];
        let drawnCards = 0;
        
        // Add card drawing animation
        const deckElem = document.getElementById('deck');
        const playerHand = gameState.currentPlayer === 0 ? player1Hand : player2Hand;
        
        // If there's a special effect active that requires drawing cards
        if (gameState.mustDrawCards > 0) {
            // Animate drawing multiple cards
            animateCardDraw(deckElem, playerHand, gameState.mustDrawCards, () => {
                for (let i = 0; i < gameState.mustDrawCards; i++) {
                    if (gameState.deck.length === 0) {
                        reshuffleDeck();
                    }
                    if (gameState.deck.length > 0) {
                        const card = gameState.deck.pop();
                        currentPlayerObj.hand.push(card);
                        drawnCards++;
                    }
                }
                
                addMessage(`${currentPlayerObj.name} zieht ${drawnCards} Karten (Strafe).`);
                gameState.mustDrawCards = 0;
                
                // Move to next player
                nextTurn();
                updateUI();
            });
            return;
        }
        
        // Regular card draw with animation
        if (gameState.deck.length === 0) {
            reshuffleDeck();
        }
        
        if (gameState.deck.length > 0) {
            // Animate drawing a single card
            animateCardDraw(deckElem, playerHand, 1, () => {
                const card = gameState.deck.pop();
                currentPlayerObj.hand.push(card);
                addMessage(`${currentPlayerObj.name} zieht eine Karte.`);
                
                // Check if the drawn card can be played
                if (canPlayCard(card)) {
                    // Allow the player to play the card they just drew
                    renderPlayerHands();
                } else {
                    // Move to next player
                    nextTurn();
                }
                updateUI();
            });
        } else {
            addMessage('Keine Karten mehr zum Ziehen!');
            updateUI();
        }
    }
    
    // Animate drawing a card
    function animateCardDraw(deckElem, playerHand, count, callback) {
        const deckRect = deckElem.getBoundingClientRect();
        const handRect = playerHand.getBoundingClientRect();
        
        let cardsAnimated = 0;
        
        // Create a temporary animated card for each card being drawn
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const tempCard = document.createElement('div');
                tempCard.className = 'card-item card-back animate-draw';
                tempCard.style.position = 'absolute';
                tempCard.style.left = `${deckRect.left}px`;
                tempCard.style.top = `${deckRect.top}px`;
                tempCard.style.width = '90px';
                tempCard.style.height = '130px';
                tempCard.style.zIndex = '1000';
                tempCard.style.transition = 'all 0.5s ease-out';
                
                document.body.appendChild(tempCard);
                
                // Trigger animation
                setTimeout(() => {
                    tempCard.style.left = `${handRect.left + 50}px`;
                    tempCard.style.top = `${handRect.top + 50}px`;
                    tempCard.style.transform = 'scale(0.8)';
                    tempCard.style.opacity = '0.8';
                }, 50);
                
                // Remove the temporary card when animation completes
                setTimeout(() => {
                    tempCard.remove();
                    cardsAnimated++;
                    
                    // Call the callback when all cards have been animated
                    if (cardsAnimated === count && callback) {
                        callback();
                    }
                }, 600);
            }, i * 300); // Stagger the animations
        }
    }

    // Reshuffle the discard pile into the deck
    function reshuffleDeck() {
        if (gameState.discardPile.length <= 1) {
            return;
        }
        
        // Keep the top card
        const topCard = gameState.discardPile.pop();
        
        // Move the rest to the deck and shuffle
        gameState.deck = [...gameState.discardPile];
        gameState.discardPile = [topCard];
        
        shuffleDeck();
        addMessage('Discard pile reshuffled into the deck.');
    }

    // Play a card
    function playCard(card, playerIndex) {
        if (!gameState.started || 
            gameState.waitingForColorSelection || 
            gameState.currentPlayer !== playerIndex) {
            return;
        }
        
        const currentPlayerObj = gameState.players[playerIndex];
        
        // Check if the card can be played
        if (!canPlayCard(card)) {
            addMessage(`${currentPlayerObj.name} can't play that card!`);
            return;
        }
        
        // Special handling for Ace
        if (gameState.acePlayed && card.value !== 'A' && card.suit !== gameState.currentColor) {
            addMessage(`${currentPlayerObj.name} must play a card of ${gameState.currentColor} or an Ace!`);
            return;
        }
        
        // Find and remove the card from the player's hand
        const cardIndex = currentPlayerObj.hand.findIndex(c => c.suit === card.suit && c.value === card.value);
        if (cardIndex !== -1) {
            currentPlayerObj.hand.splice(cardIndex, 1);
        } else {
            console.error('Card not found in player hand!');
            return;
        }
        
        // Add the card to the discard pile
        gameState.discardPile.push(card);
        gameState.currentColor = card.suit;
        gameState.currentValue = card.value;
        
        // Check for "Tschau" (1 card left) or "Sepp" (0 cards left)
        if (currentPlayerObj.hand.length === 1 && !currentPlayerObj.hasCalled.tschau) {
            // Show Tschau button
            tschauBtn.classList.remove('d-none');
        } else if (currentPlayerObj.hand.length === 0) {
            // Show Sepp button
            seppBtn.classList.remove('d-none');
        }
        
        // Handle special card effects
        handleSpecialCardEffects(card);
        
        // Log the card played
        addMessage(`${currentPlayerObj.name} played ${card.value} of ${card.suit}.`);
        
        // Only move to the next player if no color selection is needed
        if (!gameState.waitingForColorSelection) {
            nextTurn();
        }
        
        updateUI();
    }

    // Handle special card effects
    function handleSpecialCardEffects(card, isStartCard = false) {
        // Reset previous effects
        gameState.specialEffectActive = null;
        gameState.skipNextPlayer = false;
        gameState.acePlayed = false;
        
        switch (card.value) {
            case '7':
                // Next player draws 2 cards
                gameState.mustDrawCards = 2;
                gameState.specialEffectActive = '7';
                addMessage('Next player must draw 2 cards or play a 7.');
                break;
                
            case '8':
                // Next player skips a turn
                gameState.skipNextPlayer = true;
                gameState.specialEffectActive = '8';
                addMessage('Next player must skip a turn.');
                break;
                
            case 'J':
                // Player can choose a new color
                if (!isStartCard) { // Don't prompt for color if this is the start card
                    gameState.waitingForColorSelection = true;
                    gameState.specialEffectActive = 'J';
                    colorSelection.classList.remove('d-none');
                    addMessage('Player must choose a new color.');
                }
                break;
                
            case 'Q':
                // If it's the Queen of Hearts (Rose)
                if (card.suit === 'hearts') {
                    gameState.mustDrawCards = 4;
                    gameState.specialEffectActive = 'Q';
                    addMessage('Next player must draw 4 cards or play a Queen of Hearts.');
                }
                break;
                
            case 'A':
                // Must be covered with card of same color or another Ace
                gameState.acePlayed = true;
                gameState.specialEffectActive = 'A';
                gameState.mustPlaySameColor = true;
                addMessage('Next player must play the same color or an Ace.');
                break;
        }
    }

    // Select a color (after playing a Jack)
    function selectColor(color) {
        if (!gameState.waitingForColorSelection) {
            return;
        }
        
        gameState.currentColor = color;
        gameState.waitingForColorSelection = false;
        colorSelection.classList.add('d-none');
        
        addMessage(`${gameState.players[gameState.currentPlayer].name} chose ${color} as the new color.`);
        
        // Move to the next player
        nextTurn();
        updateUI();
    }

    // Call "Tschau" (when player has 1 card left)
    function callTschau() {
        const currentPlayerObj = gameState.players[gameState.currentPlayer];
        
        if (currentPlayerObj.hand.length === 1) {
            currentPlayerObj.hasCalled.tschau = true;
            addMessage(`${currentPlayerObj.name} ruft "Tschau"!`);
            tschauBtn.classList.add('d-none');
            
            // Add visual indication
            const playerArea = gameState.currentPlayer === 0 ? player1Area : player2Area;
            playerArea.classList.add('tschau-called');
            setTimeout(() => {
                playerArea.classList.remove('tschau-called');
            }, 2000);
        } else {
            // Penalty for wrong call
            addMessage(`${currentPlayerObj.name} hat "Tschau" zur falschen Zeit gerufen! +2 Strafkarten.`);
            for (let i = 0; i < 2; i++) {
                if (gameState.deck.length === 0) {
                    reshuffleDeck();
                }
                if (gameState.deck.length > 0) {
                    currentPlayerObj.hand.push(gameState.deck.pop());
                }
            }
        }
        
        updateUI();
    }

    // Call "Sepp" (when player has 0 cards left)
    function callSepp() {
        const currentPlayerObj = gameState.players[gameState.currentPlayer];
        
        if (currentPlayerObj.hand.length === 0) {
            currentPlayerObj.hasCalled.sepp = true;
            addMessage(`${currentPlayerObj.name} ruft "Sepp" und gewinnt das Spiel!`);
            seppBtn.classList.add('d-none');
            
            // End the game
            gameState.started = false;
            startGameBtn.textContent = 'Neues Spiel';
            
            // Stop the timer
            stopTimer();
            
            // Show winning animation
            showWinningAnimation(gameState.currentPlayer);
        } else {
            // Penalty for wrong call
            addMessage(`${currentPlayerObj.name} hat "Sepp" zur falschen Zeit gerufen! +2 Strafkarten.`);
            for (let i = 0; i < 2; i++) {
                if (gameState.deck.length === 0) {
                    reshuffleDeck();
                }
                if (gameState.deck.length > 0) {
                    currentPlayerObj.hand.push(gameState.deck.pop());
                }
            }
        }
        
        updateUI();
    }
    
    // Show winning animation for the player who won
    function showWinningAnimation(playerIndex) {
        const playerArea = playerIndex === 0 ? player1Area : player2Area;
        playerArea.classList.add('winner');
        
        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            createConfetti(playerArea);
        }
    }
    
    // Create a confetti particle
    function createConfetti(container) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random color
        const colors = ['#ffd700', '#ff0000', '#00ff00', '#0000ff', '#ff00ff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.backgroundColor = randomColor;
        
        // Random position, size and rotation
        const size = Math.random() * 10 + 5;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `-10px`;
        
        const duration = Math.random() * 3 + 2;
        confetti.style.animation = `fall ${duration}s linear forwards`;
        
        container.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, duration * 1000);
    }

    // Move to the next player's turn
    function nextTurn() {
        // If the game has a winner, don't change turns
        if (!gameState.started) {
            return;
        }
        
        if (gameState.skipNextPlayer) {
            // Skip the next player
            addMessage(`${gameState.players[(gameState.currentPlayer + 1) % 2].name}'s turn is skipped.`);
            gameState.skipNextPlayer = false;
        }
        
        // Switch to the other player
        gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;
        
        addMessage(`It's ${gameState.players[gameState.currentPlayer].name}'s turn.`);
    }

    // Check if a card can be played
    function canPlayCard(card) {
        if (!gameState.started) {
            return false;
        }
        
        const topCard = gameState.discardPile[gameState.discardPile.length - 1];
        
        // If waiting for color selection, no cards can be played
        if (gameState.waitingForColorSelection) {
            return false;
        }
        
        // Special handling for "must draw cards" effect
        if (gameState.mustDrawCards > 0) {
            // If it's a 7, player can play another 7 to pass on the effect
            if (gameState.specialEffectActive === '7' && card.value === '7') {
                return true;
            }
            
            // If it's a Queen of Hearts, player can play another Queen of Hearts
            if (gameState.specialEffectActive === 'Q' && card.value === 'Q' && card.suit === 'hearts') {
                return true;
            }
            
            // Otherwise, they must draw cards
            return false;
        }
        
        // If an Ace was played, must play same color or another Ace
        if (gameState.acePlayed) {
            return card.suit === gameState.currentColor || card.value === 'A';
        }
        
        // Standard rules: match color or value
        return card.suit === gameState.currentColor || card.value === gameState.currentValue;
    }

    // Render player hands
    function renderPlayerHands() {
        // Clear existing cards
        player1Hand.innerHTML = '';
        player2Hand.innerHTML = '';
        
        // Render Player 1's hand
        gameState.players[0].hand.forEach(card => {
            const cardElement = createCardElement(card, 0);
            player1Hand.appendChild(cardElement);
        });
        
        // Render Player 2's hand
        gameState.players[1].hand.forEach(card => {
            const cardElement = createCardElement(card, 1);
            player2Hand.appendChild(cardElement);
        });
        
        // Update card counts
        player1CardCount.textContent = gameState.players[0].hand.length;
        player2CardCount.textContent = gameState.players[1].hand.length;
    }

    // Create a card element
    function createCardElement(card, playerIndex) {
        const cardElement = document.createElement('div');
        cardElement.className = `card-item ${card.suit}`;
        
        if (!gameState.started || gameState.currentPlayer !== playerIndex || !canPlayCard(card)) {
            cardElement.classList.add('disabled');
        } else {
            cardElement.addEventListener('click', () => playCard(card, playerIndex));
        }
        
        const valueElement = document.createElement('div');
        valueElement.className = 'card-value';
        valueElement.textContent = card.value;
        
        const suitElement = document.createElement('div');
        suitElement.className = 'card-suit';
        suitElement.textContent = suitSymbols[card.suit];
        
        cardElement.appendChild(valueElement);
        cardElement.appendChild(suitElement);
        
        return cardElement;
    }

    // Render the discard pile
    function renderDiscardPile() {
        discardPile.innerHTML = '';
        
        if (gameState.discardPile.length > 0) {
            const topCard = gameState.discardPile[gameState.discardPile.length - 1];
            const cardElement = document.createElement('div');
            cardElement.className = `card-item ${topCard.suit}`;
            
            const valueElement = document.createElement('div');
            valueElement.className = 'card-value';
            valueElement.textContent = topCard.value;
            
            const suitElement = document.createElement('div');
            suitElement.className = 'card-suit';
            suitElement.textContent = suitSymbols[topCard.suit];
            
            cardElement.appendChild(valueElement);
            cardElement.appendChild(suitElement);
            
            discardPile.appendChild(cardElement);
            
            // Update current color display
            colorDisplay.textContent = topCard.suit.charAt(0).toUpperCase() + topCard.suit.slice(1);
            colorDisplay.style.color = topCard.suit === 'hearts' || topCard.suit === 'diamonds' ? '#d12c2c' : '#333';
        } else {
            colorDisplay.textContent = 'None';
            colorDisplay.style.color = '';
        }
    }

    // Add a message to the message log
    function addMessage(message) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        
        // Add a timestamp
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = time;
        
        messageElement.prepend(timeSpan, ' ');
        messageLog.appendChild(messageElement);
        messageLog.scrollTop = messageLog.scrollHeight;
    }

    // Update game UI
    function updateUI() {
        // Update game status
        if (!gameState.started) {
            gameStatus.textContent = 'Spiel nicht gestartet';
            currentPlayer.textContent = '';
            drawCardBtn.disabled = true;
        } else {
            gameStatus.textContent = 'Spiel läuft';
            currentPlayer.textContent = `${gameState.players[gameState.currentPlayer].name} ist an der Reihe`;
            drawCardBtn.disabled = gameState.waitingForColorSelection;
        }
        
        // Update player areas to show active player
        player1Area.classList.toggle('player-active', gameState.started && gameState.currentPlayer === 0);
        player2Area.classList.toggle('player-active', gameState.started && gameState.currentPlayer === 1);
        
        // Update hands
        renderPlayerHands();
        
        // Update discard pile
        renderDiscardPile();
        
        // Update Tschau/Sepp buttons visibility
        const currentPlayerObj = gameState.players[gameState.currentPlayer];
        tschauBtn.classList.toggle('d-none', !(gameState.started && currentPlayerObj.hand.length === 1 && !currentPlayerObj.hasCalled.tschau));
        seppBtn.classList.toggle('d-none', !(gameState.started && currentPlayerObj.hand.length === 0 && !currentPlayerObj.hasCalled.sepp));
    }

    // Initialize the game
    initGame();
});
