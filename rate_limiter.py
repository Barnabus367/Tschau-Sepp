"""
Rate limiting middleware for Socket.IO events
"""
import time
from collections import defaultdict
from functools import wraps

class RateLimiter:
    def __init__(self):
        # Store request counts per client
        self.requests = defaultdict(lambda: defaultdict(list))
        
        # Rate limits per event type (requests per minute)
        self.limits = {
            'play_card': 30,      # 30 moves per minute max
            'draw_card': 30,      # 30 draws per minute max
            'send_chat': 10,      # 10 messages per minute
            'send_emote': 20,     # 20 emotes per minute
            'create_room': 5,     # 5 room creations per minute
            'join_room': 10,      # 10 join attempts per minute
            'default': 60         # 60 requests per minute for other events
        }
        
        # Cleanup old entries every 5 minutes
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
    
    def is_allowed(self, client_id, event_name):
        """Check if a request is allowed based on rate limits"""
        current_time = time.time()
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            self.cleanup()
            self.last_cleanup = current_time
        
        # Get rate limit for this event
        limit = self.limits.get(event_name, self.limits['default'])
        
        # Get client's request history for this event
        request_times = self.requests[client_id][event_name]
        
        # Remove requests older than 1 minute
        cutoff_time = current_time - 60
        request_times[:] = [t for t in request_times if t > cutoff_time]
        
        # Check if limit exceeded
        if len(request_times) >= limit:
            return False
        
        # Add current request
        request_times.append(current_time)
        return True
    
    def cleanup(self):
        """Remove old entries to prevent memory leak"""
        current_time = time.time()
        cutoff_time = current_time - 60
        
        # Clean up each client's requests
        for client_id in list(self.requests.keys()):
            for event_name in list(self.requests[client_id].keys()):
                # Remove old timestamps
                self.requests[client_id][event_name][:] = [
                    t for t in self.requests[client_id][event_name] 
                    if t > cutoff_time
                ]
                
                # Remove empty event lists
                if not self.requests[client_id][event_name]:
                    del self.requests[client_id][event_name]
            
            # Remove clients with no recent requests
            if not self.requests[client_id]:
                del self.requests[client_id]
    
    def get_remaining_requests(self, client_id, event_name):
        """Get number of remaining requests allowed"""
        current_time = time.time()
        limit = self.limits.get(event_name, self.limits['default'])
        
        # Get client's request history
        request_times = self.requests[client_id][event_name]
        
        # Count recent requests (within last minute)
        cutoff_time = current_time - 60
        recent_requests = sum(1 for t in request_times if t > cutoff_time)
        
        return max(0, limit - recent_requests)

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit(event_name=None):
    """Decorator for rate limiting Socket.IO events"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            from flask import request
            from flask_socketio import emit
            
            # Get client ID
            client_id = request.sid
            
            # Use function name as event name if not specified
            event = event_name or f.__name__.replace('handle_', '')
            
            # Check rate limit
            if not rate_limiter.is_allowed(client_id, event):
                remaining = rate_limiter.get_remaining_requests(client_id, event)
                emit('rate_limited', {
                    'event': event,
                    'message': 'Zu viele Anfragen. Bitte warten.',
                    'remaining_requests': remaining,
                    'retry_after': 60  # seconds
                })
                return
            
            # Call the original function
            return f(*args, **kwargs)
        
        return wrapped
    return decorator