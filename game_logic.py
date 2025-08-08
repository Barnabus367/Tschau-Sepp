import random
from typing import List, Dict, Optional, Any

class Card:
    def __init__(self, suit: str, value: str):
        self.suit = suit
        self.value = value
    
    def to_dict(self):
        return {'suit': self.suit, 'value': self.value}
    
    def __eq__(self, other):
        return self.suit == other.suit and self.value == other.value

class GameEngine:
    SUITS = ['rosen', 'schellen', 'schilten', 'eichel']
    VALUES = ['6', '7', '8', '9', 'U', 'O', 'K', 'A']
    CARDS_PER_PLAYER = 7
    
    def __init__(self, players):
        self.players = players
        self.deck = []
        self.discard_pile = []
        self.current_player_index = 0
        self.current_color = None
        self.current_value = None
        self.direction = 1  # 1 for clockwise, -1 for counter-clockwise
        self.special_effect_active = None
        self.waiting_for_color_selection = False
        self.skip_next_player = False
        self.must_draw_cards = 0
        self.ace_played = False
        self.game_started = False
        self.winner = None
        self.game_messages = []
        
    def start_game(self):
        """Initialize and start a new game"""
        self.game_started = True
        self.create_deck()
        self.shuffle_deck()
        self.deal_cards()
        
        # Turn over the first card
        start_card = self.deck.pop()
        self.discard_pile.append(start_card)
        self.current_color = start_card.suit
        self.current_value = start_card.value
        
        # Handle if start card is special
        self.handle_special_effects(start_card, is_start_card=True)
        
        self.add_message(f"Spiel gestartet! Erste Karte: {start_card.value} {start_card.suit}")
        
    def create_deck(self):
        """Create a standard deck of Swiss Jass cards"""
        self.deck = []
        for suit in self.SUITS:
            for value in self.VALUES:
                self.deck.append(Card(suit, value))
    
    def shuffle_deck(self):
        """Shuffle the deck"""
        random.shuffle(self.deck)
    
    def deal_cards(self):
        """Deal cards to all players"""
        for _ in range(self.CARDS_PER_PLAYER):
            for player in self.players:
                if self.deck:
                    player.hand.append(self.deck.pop())
    
    def get_current_player(self):
        """Get the current player"""
        return self.players[self.current_player_index]
    
    def get_game_state(self):
        """Get current game state for AI"""
        return {
            'current_color': self.current_color,
            'current_value': self.current_value,
            'must_draw_cards': self.must_draw_cards,
            'special_effect': self.special_effect_active,
            'waiting_for_color': self.waiting_for_color_selection
        }
    
    def play_card(self, player_id: str, card_data: dict) -> dict:
        """Play a card from player's hand"""
        player = self.get_player_by_id(player_id)
        if not player:
            return {'success': False, 'reason': 'Spieler nicht gefunden'}
        
        if self.get_current_player().id != player_id:
            return {'success': False, 'reason': 'Nicht an der Reihe'}
        
        if self.waiting_for_color_selection:
            return {'success': False, 'reason': 'Warte auf Farbauswahl'}
        
        # Find card in player's hand
        card = None
        for c in player.hand:
            if c.suit == card_data['suit'] and c.value == card_data['value']:
                card = c
                break
        
        if not card:
            return {'success': False, 'reason': 'Karte nicht in der Hand'}
        
        # Check if card can be played
        if not self.can_play_card(card):
            return {'success': False, 'reason': 'Karte kann nicht gespielt werden'}
        
        # Special handling for stacking effects
        if self.must_draw_cards > 0:
            if card.value == '7' and self.special_effect_active == '7':
                self.must_draw_cards += 2
            elif card.value == 'O' and card.suit == 'rosen' and self.special_effect_active == 'O':
                self.must_draw_cards += 4
            else:
                return {'success': False, 'reason': 'Muss Karten ziehen oder passende Karte spielen'}
        
        # Remove card from hand and add to discard pile
        player.hand.remove(card)
        self.discard_pile.append(card)
        self.current_color = card.suit
        self.current_value = card.value
        
        # Reset player's tschau/sepp calls
        player.has_called_tschau = False
        player.has_called_sepp = False
        
        # Handle special effects
        self.handle_special_effects(card)
        
        self.add_message(f"{player.name} spielt {card.value} {card.suit}")
        
        # Check for Tschau penalty (after playing card, check if now has 1 card)
        if len(player.hand) == 1 and not player.has_called_tschau:
            # Penalty for not calling Tschau before playing penultimate card
            for _ in range(2):
                if len(self.deck) == 0:
                    self.reshuffle_deck()
                if len(self.deck) > 0:
                    player.hand.append(self.deck.pop())
            self.add_message(f"{player.name} hat vergessen TSCHAU zu rufen! +2 Strafkarten")
        
        # Check for winner
        if len(player.hand) == 0:
            if player.has_called_sepp:
                self.winner = player.id
                return {'success': True, 'winner': player.id}
            else:
                # Penalty for not calling Sepp
                for _ in range(2):
                    if len(self.deck) == 0:
                        self.reshuffle_deck()
                    if len(self.deck) > 0:
                        player.hand.append(self.deck.pop())
                self.add_message(f"{player.name} hat vergessen SEPP zu rufen! +2 Strafkarten")
        
        # Move to next player if no color selection needed
        if not self.waiting_for_color_selection:
            self.next_turn()
        
        return {'success': True}
    
    def draw_card(self, player_id: str) -> dict:
        """Draw cards from deck"""
        player = self.get_player_by_id(player_id)
        if not player:
            return {'success': False, 'reason': 'Spieler nicht gefunden'}
        
        if self.get_current_player().id != player_id:
            return {'success': False, 'reason': 'Nicht an der Reihe'}
        
        if self.waiting_for_color_selection:
            return {'success': False, 'reason': 'Warte auf Farbauswahl'}
        
        cards_to_draw = max(1, self.must_draw_cards)
        
        for _ in range(cards_to_draw):
            if len(self.deck) == 0:
                self.reshuffle_deck()
            if len(self.deck) > 0:
                player.hand.append(self.deck.pop())
        
        self.add_message(f"{player.name} zieht {cards_to_draw} Karte(n)")
        
        # Reset draw requirement
        self.must_draw_cards = 0
        self.special_effect_active = None
        
        # Move to next player
        self.next_turn()
        
        return {'success': True}
    
    def select_color(self, player_id: str, color: str) -> dict:
        """Select color after playing a Jack (Bube/Under)"""
        if not self.waiting_for_color_selection:
            return {'success': False, 'reason': 'Keine Farbauswahl erforderlich'}
        
        if self.get_current_player().id != player_id:
            return {'success': False, 'reason': 'Nicht an der Reihe'}
        
        if color not in self.SUITS:
            return {'success': False, 'reason': 'Ungültige Farbe'}
        
        self.current_color = color
        self.waiting_for_color_selection = False
        
        player = self.get_player_by_id(player_id)
        self.add_message(f"{player.name} wählt {color}")
        
        self.next_turn()
        
        return {'success': True}
    
    def call_tschau(self, player_id: str) -> dict:
        """Call Tschau when having 2 cards (before playing penultimate card)"""
        player = self.get_player_by_id(player_id)
        if not player:
            return {'success': False, 'reason': 'Spieler nicht gefunden'}
        
        if len(player.hand) == 2:
            player.has_called_tschau = True
            self.add_message(f"{player.name} ruft TSCHAU!")
            return {'success': True, 'message': 'Tschau erfolgreich gerufen'}
        else:
            # Penalty for wrong call
            for _ in range(2):
                if len(self.deck) == 0:
                    self.reshuffle_deck()
                if len(self.deck) > 0:
                    player.hand.append(self.deck.pop())
            self.add_message(f"{player.name} ruft TSCHAU zur falschen Zeit! +2 Strafkarten")
            return {'success': False, 'message': 'Falsche Zeit für Tschau! +2 Strafkarten'}
    
    def call_sepp(self, player_id: str) -> dict:
        """Call Sepp when having 0 cards"""
        player = self.get_player_by_id(player_id)
        if not player:
            return {'success': False, 'reason': 'Spieler nicht gefunden'}
        
        if len(player.hand) == 0:
            player.has_called_sepp = True
            self.winner = player_id
            self.add_message(f"{player.name} ruft SEPP und gewinnt!")
            return {'success': True, 'message': 'Sepp! Du hast gewonnen!'}
        else:
            # Penalty for wrong call
            for _ in range(2):
                if len(self.deck) == 0:
                    self.reshuffle_deck()
                if len(self.deck) > 0:
                    player.hand.append(self.deck.pop())
            self.add_message(f"{player.name} ruft SEPP zur falschen Zeit! +2 Strafkarten")
            return {'success': False, 'message': 'Falsche Zeit für Sepp! +2 Strafkarten'}
    
    def can_play_card(self, card: Card) -> bool:
        """Check if a card can be played"""
        if not self.game_started:
            return False
        
        # Special handling for draw effects
        if self.must_draw_cards > 0:
            if self.special_effect_active == '7' and card.value == '7':
                return True
            if self.special_effect_active == 'O' and card.value == 'O' and card.suit == 'rosen':
                return True
            return False
        
        # Ace rule: must play same color or another ace
        if self.ace_played:
            return card.suit == self.current_color or card.value == 'A'
        
        # Standard rules: match color or value
        return card.suit == self.current_color or card.value == self.current_value
    
    def handle_special_effects(self, card: Card, is_start_card: bool = False):
        """Handle special card effects"""
        self.special_effect_active = None
        self.skip_next_player = False
        self.ace_played = False
        
        if card.value == '7':
            # Next player draws 2 cards (can be stacked)
            if self.must_draw_cards == 0:
                self.must_draw_cards = 2
            self.special_effect_active = '7'
            
        elif card.value == '8':
            # Next player skips turn
            self.skip_next_player = True
            self.special_effect_active = '8'
            
        elif card.value == 'U':  # Bube/Under
            # Player chooses color
            if not is_start_card:
                self.waiting_for_color_selection = True
                self.special_effect_active = 'U'
            
        elif card.value == 'O' and card.suit == 'rosen':  # Ober Rose
            # Next player draws 4 cards (can be stacked)
            if self.must_draw_cards == 0:
                self.must_draw_cards = 4
            self.special_effect_active = 'O'
            
        elif card.value == 'A':
            # Must be covered with same color or another ace
            self.ace_played = True
            self.special_effect_active = 'A'
    
    def next_turn(self):
        """Move to next player's turn"""
        if not self.game_started or self.winner:
            return
        
        # Handle skip effect
        if self.skip_next_player:
            self.current_player_index = (self.current_player_index + 2 * self.direction) % len(self.players)
            self.skip_next_player = False
            self.add_message(f"{self.players[(self.current_player_index - self.direction) % len(self.players)].name} wird übersprungen")
        else:
            self.current_player_index = (self.current_player_index + self.direction) % len(self.players)
        
        self.add_message(f"{self.get_current_player().name} ist an der Reihe")
    
    def reshuffle_deck(self):
        """Reshuffle discard pile into deck"""
        if len(self.discard_pile) <= 1:
            return
        
        # Keep top card
        top_card = self.discard_pile.pop()
        
        # Move rest to deck and shuffle
        self.deck = self.discard_pile
        self.discard_pile = [top_card]
        random.shuffle(self.deck)
        
        self.add_message("Ablagestapel wurde neu gemischt")
    
    def get_player_by_id(self, player_id: str):
        """Get player by ID"""
        for player in self.players:
            if player.id == player_id:
                return player
        return None
    
    def add_message(self, message: str):
        """Add a game message"""
        self.game_messages.append(message)
        # Keep only last 20 messages
        if len(self.game_messages) > 20:
            self.game_messages.pop(0)
    
    def get_player_view(self, player_id: str) -> dict:
        """Get game state from a player's perspective"""
        player = self.get_player_by_id(player_id)
        if not player:
            return {}
        
        # Get other players' info (without showing their cards)
        other_players = []
        for p in self.players:
            if p.id != player_id:
                other_players.append({
                    'id': p.id,
                    'name': p.name,
                    'card_count': len(p.hand),
                    'has_called_tschau': p.has_called_tschau,
                    'has_called_sepp': p.has_called_sepp
                })
        
        # Get top card of discard pile
        top_card = None
        if self.discard_pile:
            top_card = self.discard_pile[-1].to_dict()
        
        return {
            'player_id': player_id,
            'hand': [card.to_dict() for card in player.hand],
            'other_players': other_players,
            'current_player_id': self.get_current_player().id,
            'current_player_name': self.get_current_player().name,
            'discard_top': top_card,
            'current_color': self.current_color,
            'current_value': self.current_value,
            'deck_count': len(self.deck),
            'waiting_for_color': self.waiting_for_color_selection,
            'must_draw_cards': self.must_draw_cards,
            'special_effect': self.special_effect_active,
            'messages': self.game_messages[-5:],  # Last 5 messages
            'winner': self.winner,
            'my_turn': self.get_current_player().id == player_id
        }