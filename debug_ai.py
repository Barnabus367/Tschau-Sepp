#!/usr/bin/env python3
"""
Simple debug script to test AI without server
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from game_logic import GameEngine, Card
from ai_player import AIPlayer

class TestPlayer:
    def __init__(self, sid, name, is_ai=False):
        self.id = sid
        self.name = name
        self.hand = []
        self.is_ai = is_ai
        self.ai = AIPlayer(difficulty='medium', name=name) if is_ai else None
        self.has_called_tschau = False
        self.has_called_sepp = False

# Create test game
player1 = TestPlayer('human1', 'David', is_ai=False)
player2 = TestPlayer('bot1', 'Bot-Max', is_ai=True)

game = GameEngine([player1, player2])
game.start_game()

print(f"Game started!")
print(f"First card: {game.current_value} of {game.current_color}")
print(f"Current player: {game.get_current_player().name}")
print(f"Player 1 hand: {len(player1.hand)} cards")
print(f"Player 2 hand: {len(player2.hand)} cards")

# Test if bot can make decision
if player2.is_ai:
    hand_dicts = [{'suit': card.suit, 'value': card.value} for card in player2.hand]
    chosen = player2.ai.choose_card(
        hand_dicts,
        game.current_color,
        game.current_value,
        0,
        None
    )
    print(f"Bot would play: {chosen if chosen else 'Draw card'}")