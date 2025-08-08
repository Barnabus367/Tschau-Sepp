"""
Simplified AI handler that works directly with game_server
"""

import time
from threading import Thread

def process_ai_turn(room, room_code, socketio):
    """
    Simple AI turn processor
    """
    print(f"[AI] process_ai_turn called for room {room_code}")
    try:
        # Small delay to make it feel natural
        time.sleep(1.5)
        print(f"[AI] After delay, checking game state...")
        
        if not room:
            print(f"[AI] No room found!")
            return
        if not room.game_state:
            print(f"[AI] No game_state in room!")
            return
        if room.status != 'playing':
            print(f"[AI] Room status is {room.status}, not playing!")
            return
        
        print(f"[AI] Getting current player...")
        current_player = room.game_state.get_current_player()
        if not current_player:
            print(f"[AI] No current player found!")
            return
        
        print(f"[AI] Current player is: {current_player.name} (ID: {current_player.id})")
            
        # Check if current player is AI
        is_ai = False
        ai_player = None
        
        print(f"[AI] Checking if {current_player.name} is AI...")
        print(f"[AI] Room has {len(room.players)} players")
        
        for p in room.players:
            print(f"[AI] Checking player: {p.name} (ID: {p.id}), is_ai={getattr(p, 'is_ai', False)}")
            if p.id == current_player.id:
                print(f"[AI] IDs match! {p.id} == {current_player.id}")
                if hasattr(p, 'is_ai') and p.is_ai:
                    is_ai = True
                    ai_player = p
                    print(f"[AI] Found AI player: {p.name}")
                    break
                else:
                    print(f"[AI] Player {p.name} is not AI")
        
        if not is_ai or not ai_player:
            print(f"[AI] Current player is not AI, returning")
            return
        
        print(f"AI {ai_player.name} is thinking...")
        
        # Get game state
        game_state = room.game_state.get_game_state()
        
        # Convert hand for AI
        hand_dicts = [{'suit': card.suit, 'value': card.value} for card in current_player.hand]
        
        # Let AI choose
        chosen_card = ai_player.ai.choose_card(
            hand_dicts,
            game_state['current_color'],
            game_state['current_value'],
            game_state.get('must_draw_cards', 0),
            game_state.get('special_effect')
        )
        
        if chosen_card:
            print(f"AI plays: {chosen_card['value']} of {chosen_card['suit']}")
            # Play the card
            result = room.game_state.play_card(current_player.id, chosen_card)
            
            if result.get('success'):
                # Handle color selection for Jack
                if chosen_card['value'] == 'U' and room.game_state.waiting_for_color_selection:
                    color = ai_player.ai.choose_color(hand_dicts)
                    room.game_state.select_color(current_player.id, color)
                    print(f"AI chooses color: {color}")
                
                # Broadcast update to ALL players in the room
                print(f"[AI] Broadcasting game update to room {room_code}")
                for player in room.players:
                    if not (hasattr(player, 'is_ai') and player.is_ai):
                        try:
                            game_view = room.game_state.get_player_view(player.id)
                            game_view['turn_time_limit'] = 60  # Add turn time
                            
                            # Emit to the specific socket ID
                            socketio.emit('game_update', game_view, to=player.id)
                            print(f"[AI] Emitted update to {player.name} (socket: {player.id})")
                        except Exception as e:
                            print(f"Error sending update to {player.name}: {e}")
                
                # Check for winner
                if room.game_state.winner:
                    winner_name = current_player.name
                    socketio.emit('game_won', {
                        'winner': room.game_state.winner,
                        'player_name': winner_name
                    }, room=room_code)
                    room.status = 'finished'
                else:
                    # Check if next player is also AI
                    time.sleep(0.5)
                    process_ai_turn(room, room_code, socketio)
        else:
            print(f"AI draws a card")
            # Draw card
            result = room.game_state.draw_card(current_player.id)
            
            if result.get('success'):
                # Broadcast update
                for player in room.players:
                    if not (hasattr(player, 'is_ai') and player.is_ai):
                        try:
                            game_view = room.game_state.get_player_view(player.id)
                            game_view['turn_time_limit'] = 60
                            socketio.emit('game_update', game_view, to=player.id)
                            print(f"Sent game update to {player.name} (socket: {player.id}) after AI draw")
                        except Exception as e:
                            print(f"Error sending update to {player.name}: {e}")
                
                # Check next player
                time.sleep(0.5)
                process_ai_turn(room, room_code, socketio)
                
    except Exception as e:
        print(f"Error in AI turn: {e}")
        import traceback
        traceback.print_exc()

class DummyLock:
    def __enter__(self):
        pass
    def __exit__(self, *args):
        pass

def trigger_ai_turn(room, room_code, socketio):
    """
    Trigger AI turn in background thread
    """
    thread = Thread(target=process_ai_turn, args=(room, room_code, socketio))
    thread.daemon = True
    thread.start()