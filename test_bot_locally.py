#!/usr/bin/env python3
"""
Test the bot integration locally to debug the issue
"""

import sys
sys.path.insert(0, '.')

from game_server import Player, GameRoom
from game_logic import GameEngine
from ai_player import AIPlayer

# Simulate a game room
room = GameRoom('TEST123', 'human_sid')

# Create players - CRITICAL: Use same ID system as server!
human = Player('human_sid', 'David')
bot = Player('bot_sid', 'Bot-Max', is_ai=True, ai_difficulty='medium')

room.players = [human, bot]

# Create game
room.game = GameEngine(room.players)
room.game_state = room.game
room.status = 'playing'

# Start game
room.game.start_game()

print("=" * 50)
print("GAME STATE AFTER START:")
print(f"Current player: {room.game.get_current_player().name} (ID: {room.game.get_current_player().id})")
print(f"Top card: {room.game.current_value} of {room.game.current_color}")
print("=" * 50)

# Human plays a card
human_hand = room.game.get_current_player().hand
print(f"\nHuman hand: {[(c.value, c.suit) for c in human_hand]}")

# Find a playable card
playable = None
for card in human_hand:
    if card.suit == room.game.current_color or card.value == room.game.current_value:
        playable = card
        break

if playable:
    print(f"Human plays: {playable.value} of {playable.suit}")
    result = room.game.play_card('human_sid', {'suit': playable.suit, 'value': playable.value})
    print(f"Result: {result}")
    
    print("\n" + "=" * 50)
    print("AFTER HUMAN TURN:")
    print(f"Current player: {room.game.get_current_player().name} (ID: {room.game.get_current_player().id})")
    print(f"Is AI: {room.game.get_current_player().is_ai if hasattr(room.game.get_current_player(), 'is_ai') else 'NO ATTRIBUTE'}")
    
    # Check if we can detect the bot
    current = room.game.get_current_player()
    for p in room.players:
        if p.id == current.id:
            print(f"FOUND in room.players: {p.name}, is_ai={p.is_ai}")
            break
    else:
        print("NOT FOUND in room.players!")
else:
    print("No playable card - would draw")