"""
AI Integration Helper for Tschau-Sepp
Bridges the gap between game logic and AI player
"""

import time
from threading import Timer

def handle_ai_turn(room, room_code, socketio, emit):
    """
    Handle AI player's turn with proper integration
    """
    if not room or not room.game or room.status != 'playing':
        return
    
    current_player = room.game.get_current_player()
    if not current_player or not hasattr(current_player, 'is_ai') or not current_player.is_ai:
        return
    
    # Get AI thinking time
    thinking_time = current_player.ai.get_thinking_time() if hasattr(current_player, 'ai') else 1.5
    
    def execute_ai_move():
        try:
            # Re-check game state
            if room.status != 'playing' or not room.game:
                return
            
            current_player = room.game.get_current_player()
            if not current_player or not hasattr(current_player, 'is_ai') or not current_player.is_ai:
                return
            
            # Get game state
            game_state = room.game.get_game_state()
            
            # Convert hand to dict format for AI
            hand_dicts = [{'suit': card.suit, 'value': card.value} for card in current_player.hand]
            
            # AI chooses card
            chosen_card = current_player.ai.choose_card(
                hand_dicts,
                game_state.get('current_color'),
                game_state.get('current_value'),
                game_state.get('must_draw_cards', 0),
                game_state.get('special_effect')
            )
            
            if chosen_card:
                # Play the card
                result = room.game.play_card(current_player.id, chosen_card)
                
                if result.get('success'):
                    # Handle color selection for Jack
                    if chosen_card['value'] == 'U' and room.game.waiting_for_color_selection:
                        color = current_player.ai.choose_color(hand_dicts)
                        room.game.select_color(current_player.id, color)
                    
                    # Emit update to all players
                    broadcast_game_update(room, room_code, socketio)
                    
                    # Check for winner
                    if room.game.winner:
                        handle_game_winner(room, room_code, socketio)
                    else:
                        # Schedule next AI turn if needed
                        Timer(0.5, lambda: handle_ai_turn(room, room_code, socketio, emit)).start()
            else:
                # AI needs to draw
                result = room.game.draw_card(current_player.id)
                if result.get('success'):
                    broadcast_game_update(room, room_code, socketio)
                    
                    # Schedule next AI turn if needed
                    Timer(0.5, lambda: handle_ai_turn(room, room_code, socketio, emit)).start()
                    
        except Exception as e:
            print(f"Error in AI turn: {e}")
    
    # Schedule the AI move with thinking delay
    Timer(thinking_time, execute_ai_move).start()

def broadcast_game_update(room, room_code, socketio):
    """Broadcast game state to all players"""
    for player in room.players:
        if hasattr(player, 'is_ai') and player.is_ai:
            continue  # Skip AI players
        
        game_view = room.game.get_player_view(player.id)
        socketio.emit('game_update', game_view, room=player.id)

def handle_game_winner(room, room_code, socketio):
    """Handle game end"""
    room.status = 'finished'
    winner = room.game.winner
    
    winner_player = None
    for player in room.players:
        if player.id == winner:
            winner_player = player
            break
    
    if winner_player:
        socketio.emit('game_won', {
            'winner': winner,
            'player_name': winner_player.name
        }, room=room_code)