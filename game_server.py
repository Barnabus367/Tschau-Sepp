import os
import secrets
import string
import time
import html
import re
from datetime import datetime, timedelta
from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
from flask_cors import CORS
from rate_limiter import rate_limit

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'tschau-sepp-secret-key-2024')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Configure CORS - restrict in production
if os.environ.get('FLASK_ENV') == 'production':
    cors_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5000').split(',')
else:
    cors_origins = "*"  # Allow all in development

CORS(app, origins=cors_origins)
socketio = SocketIO(app, cors_allowed_origins=cors_origins, async_mode='eventlet', 
                    ping_timeout=60, ping_interval=25)

# In-memory storage for rooms and players
game_rooms = {}
player_sessions = {}
disconnected_players = {}  # Store disconnected players for reconnection

class Player:
    def __init__(self, sid, name, player_id=None):
        self.id = sid
        self.player_id = player_id or secrets.token_hex(8)  # Persistent ID for reconnection
        self.name = name
        self.hand = []
        self.connected = True
        self.has_called_tschau = False
        self.has_called_sepp = False
        self.disconnect_time = None
        self.turn_start_time = None

class GameRoom:
    def __init__(self, room_code, creator_sid):
        self.code = room_code
        self.players = []
        self.game_state = None
        self.status = 'waiting'  # waiting, playing, finished, paused
        self.created_at = datetime.now()
        self.current_player_index = 0
        self.turn_timer = None
        self.turn_duration = 60  # seconds per turn
        self.allow_reconnect = True
        self.reconnect_grace_period = 120  # seconds to reconnect
        
    def add_player(self, player):
        if len(self.players) < 2:
            self.players.append(player)
            return True
        return False
    
    def remove_player(self, player_id):
        self.players = [p for p in self.players if p.id != player_id]
        
    def is_ready_to_start(self):
        return len(self.players) == 2 and all(p.connected for p in self.players)
    
    def get_player_by_id(self, player_id):
        for player in self.players:
            if player.id == player_id:
                return player
        return None
    
    def get_player_by_persistent_id(self, player_id):
        for player in self.players:
            if player.player_id == player_id:
                return player
        return None
    
    def pause_game(self):
        if self.status == 'playing':
            self.status = 'paused'
            return True
        return False
    
    def resume_game(self):
        if self.status == 'paused' and all(p.connected for p in self.players):
            self.status = 'playing'
            return True
        return False

def generate_room_code():
    """Generate a unique 6-character room code"""
    while True:
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if code not in game_rooms:
            return code

def sanitize_input(text, max_length=200):
    """Sanitize user input to prevent XSS and injection attacks"""
    if not text:
        return ""
    
    # Convert to string and limit length
    text = str(text)[:max_length]
    
    # HTML escape special characters
    text = html.escape(text)
    
    # Remove any potential script tags or javascript
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    return text.strip()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    
    # Check for reconnection token in session
    reconnect_token = request.args.get('reconnect_token')
    if reconnect_token and reconnect_token in disconnected_players:
        # Handle reconnection
        reconnect_data = disconnected_players[reconnect_token]
        room_code = reconnect_data['room_code']
        player_id = reconnect_data['player_id']
        
        if room_code in game_rooms:
            room = game_rooms[room_code]
            player = room.get_player_by_persistent_id(player_id)
            
            if player and player.disconnect_time:
                # Check if within grace period
                time_since_disconnect = time.time() - player.disconnect_time
                if time_since_disconnect < room.reconnect_grace_period:
                    # Reconnect the player
                    player.id = request.sid
                    player.connected = True
                    player.disconnect_time = None
                    
                    # Rejoin socket room
                    join_room(room_code)
                    player_sessions[request.sid] = {'room_code': room_code, 'player': player}
                    
                    # Resume game if it was paused
                    if room.resume_game():
                        emit('game_resumed', room=room_code)
                    
                    # Send current game state
                    if room.game_state:
                        game_view = room.game_state.get_player_view(request.sid)
                        emit('reconnected', {
                            'success': True,
                            'game_state': game_view,
                            'room_code': room_code
                        })
                    else:
                        emit('reconnected', {
                            'success': True,
                            'room_code': room_code,
                            'players': [{'id': p.id, 'name': p.name} for p in room.players]
                        })
                    
                    # Notify other players
                    emit('player_reconnected', {
                        'player_id': request.sid,
                        'player_name': player.name
                    }, room=room_code, skip_sid=request.sid)
                    
                    # Clean up disconnected player entry
                    del disconnected_players[reconnect_token]
                    
                    print(f'Player {player.name} reconnected to room {room_code}')
                    return
    
    emit('connected', {
        'sid': request.sid,
        'reconnect_supported': True
    })

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    
    # Find and handle player disconnection from any room
    for room_code, room in list(game_rooms.items()):
        player = room.get_player_by_id(request.sid)
        if player:
            player.connected = False
            player.disconnect_time = time.time()
            
            # Generate reconnection token
            reconnect_token = secrets.token_hex(16)
            disconnected_players[reconnect_token] = {
                'room_code': room_code,
                'player_id': player.player_id,
                'disconnect_time': player.disconnect_time
            }
            
            # If game is in progress, pause it
            if room.status == 'playing':
                room.pause_game()
                emit('game_paused', {
                    'player_name': player.name,
                    'grace_period': room.reconnect_grace_period
                }, room=room_code)
            
            # Notify other players in the room
            emit('player_disconnected', {
                'player_id': request.sid,
                'player_name': player.name,
                'can_reconnect': room.allow_reconnect,
                'grace_period': room.reconnect_grace_period
            }, room=room_code, skip_sid=request.sid)
            
            # If game hasn't started, remove the player immediately
            if room.status == 'waiting':
                room.remove_player(request.sid)
                if len(room.players) == 0:
                    del game_rooms[room_code]
                else:
                    emit('player_left', {
                        'players': [{'id': p.id, 'name': p.name} for p in room.players]
                    }, room=room_code)
            else:
                # Store the reconnect token for the player
                emit('store_reconnect_token', {
                    'token': reconnect_token,
                    'expires_in': room.reconnect_grace_period
                }, room=request.sid)

@socketio.on('create_room')
@rate_limit('create_room')
def handle_create_room(data):
    player_name = sanitize_input(data.get('player_name', 'Spieler 1'), 30)
    room_code = generate_room_code()
    
    # Create new room and player
    room = GameRoom(room_code, request.sid)
    player = Player(request.sid, player_name)
    room.add_player(player)
    
    # Store room and join socket room
    game_rooms[room_code] = room
    player_sessions[request.sid] = {'room_code': room_code, 'player': player}
    join_room(room_code)
    
    emit('room_created', {
        'room_code': room_code,
        'player_id': request.sid,
        'players': [{'id': p.id, 'name': p.name} for p in room.players]
    })
    
    print(f'Room {room_code} created by {player_name}')

@socketio.on('join_room')
@rate_limit('join_room')
def handle_join_room(data):
    room_code = sanitize_input(data.get('room_code', '').upper(), 6)
    player_name = sanitize_input(data.get('player_name', 'Spieler 2'), 30)
    
    # Check if room exists
    if room_code not in game_rooms:
        emit('error', {'message': 'Raum nicht gefunden'})
        return
    
    room = game_rooms[room_code]
    
    # Check if room is full
    if len(room.players) >= 2:
        emit('error', {'message': 'Raum ist voll'})
        return
    
    # Check if game already started
    if room.status != 'waiting':
        emit('error', {'message': 'Spiel läuft bereits'})
        return
    
    # Create player and add to room
    player = Player(request.sid, player_name)
    if room.add_player(player):
        player_sessions[request.sid] = {'room_code': room_code, 'player': player}
        join_room(room_code)
        
        # Notify all players in room
        emit('player_joined', {
            'players': [{'id': p.id, 'name': p.name} for p in room.players],
            'ready_to_start': room.is_ready_to_start()
        }, room=room_code)
        
        # Send room info to joining player
        emit('room_joined', {
            'room_code': room_code,
            'player_id': request.sid,
            'players': [{'id': p.id, 'name': p.name} for p in room.players],
            'ready_to_start': room.is_ready_to_start()
        })
        
        print(f'{player_name} joined room {room_code}')

@socketio.on('leave_room')
def handle_leave_room(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    
    if room_code in game_rooms:
        room = game_rooms[room_code]
        room.remove_player(request.sid)
        leave_room(room_code)
        
        # Notify remaining players
        emit('player_left', {
            'players': [{'id': p.id, 'name': p.name} for p in room.players]
        }, room=room_code)
        
        # Delete room if empty
        if len(room.players) == 0:
            del game_rooms[room_code]
    
    del player_sessions[request.sid]

@socketio.on('start_game')
def handle_start_game(data):
    if request.sid not in player_sessions:
        emit('error', {'message': 'Nicht in einem Raum'})
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    
    if room_code not in game_rooms:
        emit('error', {'message': 'Raum nicht gefunden'})
        return
    
    room = game_rooms[room_code]
    
    if not room.is_ready_to_start():
        emit('error', {'message': 'Nicht genug Spieler'})
        return
    
    if room.status != 'waiting':
        emit('error', {'message': 'Spiel läuft bereits'})
        return
    
    # Initialize game state
    from game_logic import GameEngine
    room.game_state = GameEngine(room.players)
    room.game_state.start_game()
    room.status = 'playing'
    
    # Start turn timer for first player
    start_turn_timer(room_code)
    
    # Send initial game state to all players
    for player in room.players:
        game_view = room.game_state.get_player_view(player.id)
        game_view['turn_time_limit'] = room.turn_duration
        emit('game_started', game_view, room=player.id)
    
    print(f'Game started in room {room_code}')

def start_turn_timer(room_code):
    """Start a timer for the current player's turn"""
    if room_code not in game_rooms:
        return
    
    room = game_rooms[room_code]
    if room.status != 'playing':
        return
    
    current_player = room.game_state.get_current_player()
    current_player.turn_start_time = time.time()
    
    # Cancel existing timer if any
    if room.turn_timer:
        room.turn_timer.cancel()
    
    # Set new timer
    from threading import Timer
    
    def handle_turn_timeout():
        if room_code in game_rooms and room.status == 'playing':
            # Force draw a card for the timed out player
            result = room.game_state.draw_card(current_player.id)
            
            # Notify all players
            emit('turn_timeout', {
                'player_name': current_player.name,
                'action': 'draw_card'
            }, room=room_code)
            
            # Send updated game state
            for player in room.players:
                game_view = room.game_state.get_player_view(player.id)
                game_view['turn_time_limit'] = room.turn_duration
                emit('game_update', game_view, room=player.id)
            
            # Start timer for next player
            start_turn_timer(room_code)
    
    room.turn_timer = Timer(room.turn_duration, handle_turn_timeout)
    room.turn_timer.start()
    
    # Notify all players about turn start
    emit('turn_started', {
        'player_name': current_player.name,
        'time_limit': room.turn_duration
    }, room=room_code)

@socketio.on('play_card')
@rate_limit('play_card')
def handle_play_card(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'playing':
        return
    
    card = data.get('card')
    result = room.game_state.play_card(request.sid, card)
    
    if result['success']:
        # Restart turn timer for next player
        start_turn_timer(room_code)
        
        # Broadcast updated game state to all players
        for player in room.players:
            game_view = room.game_state.get_player_view(player.id)
            game_view['turn_time_limit'] = room.turn_duration
            emit('game_update', game_view, room=player.id)
        
        # Check for winner
        if result.get('winner'):
            room.status = 'finished'
            if room.turn_timer:
                room.turn_timer.cancel()
            emit('game_won', {'winner': result['winner']}, room=room_code)
    else:
        emit('move_rejected', {'reason': result.get('reason')})

@socketio.on('draw_card')
def handle_draw_card(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'playing':
        return
    
    result = room.game_state.draw_card(request.sid)
    
    if result['success']:
        # Restart turn timer for next player
        start_turn_timer(room_code)
        
        # Broadcast updated game state
        for player in room.players:
            game_view = room.game_state.get_player_view(player.id)
            game_view['turn_time_limit'] = room.turn_duration
            emit('game_update', game_view, room=player.id)
    else:
        emit('move_rejected', {'reason': result.get('reason')})

@socketio.on('select_color')
def handle_select_color(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'playing':
        return
    
    color = data.get('color')
    result = room.game_state.select_color(request.sid, color)
    
    if result['success']:
        # Broadcast updated game state
        for player in room.players:
            game_view = room.game_state.get_player_view(player.id)
            emit('game_update', game_view, room=player.id)

@socketio.on('call_tschau')
def handle_call_tschau(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'playing':
        return
    
    result = room.game_state.call_tschau(request.sid)
    
    emit('tschau_called', {
        'player_id': request.sid,
        'success': result['success'],
        'message': result.get('message')
    }, room=room_code)

@socketio.on('call_sepp')
def handle_call_sepp(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'playing':
        return
    
    result = room.game_state.call_sepp(request.sid)
    
    if result['success']:
        room.status = 'finished'
        if room.turn_timer:
            room.turn_timer.cancel()
        emit('game_won', {
            'winner': request.sid,
            'player_name': session['player'].name,
            'room_code': room_code
        }, room=room_code)
    else:
        emit('sepp_failed', {
            'player_id': request.sid,
            'message': result.get('message')
        }, room=room_code)

@socketio.on('request_rematch')
def handle_request_rematch(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room or room.status != 'finished':
        emit('error', {'message': 'Rematch nicht möglich'})
        return
    
    # Track rematch requests
    if not hasattr(room, 'rematch_requests'):
        room.rematch_requests = set()
    
    room.rematch_requests.add(request.sid)
    
    # Notify other players
    emit('rematch_requested', {
        'player_name': session['player'].name,
        'requests': len(room.rematch_requests),
        'needed': len(room.players)
    }, room=room_code)
    
    # If all players requested rematch, start new game
    if len(room.rematch_requests) == len(room.players):
        # Reset game state
        room.status = 'waiting'
        room.game_state = None
        room.rematch_requests = set()
        
        # Reset player states
        for player in room.players:
            player.hand = []
            player.has_called_tschau = False
            player.has_called_sepp = False
        
        # Notify all players
        emit('rematch_accepted', {
            'room_code': room_code,
            'players': [{'id': p.id, 'name': p.name} for p in room.players]
        }, room=room_code)
        
        print(f'Rematch accepted in room {room_code}')

@socketio.on('send_chat')
@rate_limit('send_chat')
def handle_send_chat(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room:
        return
    
    # Sanitize message to prevent XSS
    message = sanitize_input(data.get('message', ''), 200)
    
    if message:
        emit('chat_message', {
            'player_name': session['player'].name,
            'message': message,
            'timestamp': time.time()
        }, room=room_code)

@socketio.on('send_emote')
@rate_limit('send_emote')
def handle_send_emote(data):
    if request.sid not in player_sessions:
        return
    
    session = player_sessions[request.sid]
    room_code = session['room_code']
    room = game_rooms.get(room_code)
    
    if not room:
        return
    
    emote = data.get('emote', '')
    
    # Predefined emotes for security
    allowed_emotes = ['👍', '👎', '😄', '😢', '😮', '🎉', '💭', '🔥', '❤️', '😤']
    
    if emote in allowed_emotes:
        emit('emote_received', {
            'player_name': session['player'].name,
            'emote': emote,
            'timestamp': time.time()
        }, room=room_code)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    socketio.run(app, host='0.0.0.0', port=port, debug=debug)