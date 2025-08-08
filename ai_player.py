"""
AI Player for Tschau-Sepp
Implements different difficulty levels and strategies
"""

import random
import time
from typing import List, Dict, Optional

class AIPlayer:
    """AI player with configurable difficulty and strategies"""
    
    def __init__(self, difficulty='medium', name=None):
        self.difficulty = difficulty
        self.name = name or f"Bot-{random.choice(['Max', 'Lisa', 'Tom', 'Anna', 'Felix', 'Emma'])}"
        self.thinking_time = {
            'easy': (1.0, 2.5),
            'medium': (0.8, 2.0),
            'hard': (0.5, 1.5)
        }
        
    def choose_card(self, hand: List[Dict], current_color: str, current_value: str, 
                   must_draw_cards: int, special_effect: str = None) -> Optional[Dict]:
        """
        Choose which card to play based on difficulty
        Returns None if no playable card (should draw)
        """
        playable_cards = self._get_playable_cards(hand, current_color, current_value, must_draw_cards, special_effect)
        
        if not playable_cards:
            return None
            
        if self.difficulty == 'easy':
            return self._easy_strategy(playable_cards)
        elif self.difficulty == 'medium':
            return self._medium_strategy(playable_cards, hand)
        else:  # hard
            return self._hard_strategy(playable_cards, hand, current_color)
    
    def _get_playable_cards(self, hand: List[Dict], current_color: str, current_value: str,
                           must_draw_cards: int, special_effect: str) -> List[Dict]:
        """Get all cards that can be played"""
        playable = []
        
        for card in hand:
            # Special handling for draw effects
            if must_draw_cards > 0:
                if special_effect == '7' and card['value'] == '7':
                    playable.append(card)
                elif special_effect == 'O' and card['value'] == 'O' and card['suit'] == 'rosen':
                    playable.append(card)
            # Ace rule
            elif special_effect == 'A':
                if card['suit'] == current_color or card['value'] == 'A':
                    playable.append(card)
            # Standard rules
            elif card['suit'] == current_color or card['value'] == current_value:
                playable.append(card)
                
        return playable
    
    def _easy_strategy(self, playable_cards: List[Dict]) -> Dict:
        """Easy AI: Plays random valid card"""
        return random.choice(playable_cards)
    
    def _medium_strategy(self, playable_cards: List[Dict], hand: List[Dict]) -> Dict:
        """
        Medium AI: Basic strategy
        - Prefers to save special cards when many cards in hand
        - Uses special cards when few cards left
        """
        special_cards = ['7', '8', 'U', 'A']
        hand_size = len(hand)
        
        if hand_size > 4:
            # Try to play normal cards first
            normal_cards = [c for c in playable_cards if c['value'] not in special_cards]
            if normal_cards:
                return random.choice(normal_cards)
        
        if hand_size <= 3:
            # Prefer special cards when few cards left
            special_playable = [c for c in playable_cards if c['value'] in special_cards]
            if special_playable:
                # Prioritize attack cards
                attack_cards = [c for c in special_playable if c['value'] in ['7', '8']]
                if attack_cards:
                    return random.choice(attack_cards)
                return random.choice(special_playable)
        
        return random.choice(playable_cards)
    
    def _hard_strategy(self, playable_cards: List[Dict], hand: List[Dict], current_color: str) -> Dict:
        """
        Hard AI: Advanced strategy
        - Counts cards by color
        - Saves Jacks for color changes
        - Uses special cards strategically
        - Tries to get rid of colors with few cards
        """
        # Count cards by color
        color_counts = {'rosen': 0, 'schellen': 0, 'schilten': 0, 'eichel': 0}
        for card in hand:
            color_counts[card['suit']] += 1
        
        # Categorize playable cards
        jacks = [c for c in playable_cards if c['value'] == 'U']
        sevens = [c for c in playable_cards if c['value'] == '7']
        eights = [c for c in playable_cards if c['value'] == '8']
        rose_ober = [c for c in playable_cards if c['value'] == 'O' and c['suit'] == 'rosen']
        aces = [c for c in playable_cards if c['value'] == 'A']
        normal_cards = [c for c in playable_cards if c['value'] not in ['7', '8', 'U', 'A'] 
                       and not (c['value'] == 'O' and c['suit'] == 'rosen')]
        
        hand_size = len(hand)
        
        # Strategy based on hand size
        if hand_size > 5:
            # Early game: save special cards, play from colors with few cards
            if normal_cards:
                # Play from color with fewest cards
                normal_cards.sort(key=lambda c: color_counts[c['suit']])
                return normal_cards[0]
            
            # Use defensive cards before offensive
            if eights:
                return random.choice(eights)
            if sevens:
                return random.choice(sevens)
                
        elif hand_size <= 3:
            # Late game: use attack cards aggressively
            if rose_ober:
                return rose_ober[0]
            if sevens:
                return random.choice(sevens)
            if eights:
                return random.choice(eights)
            
            # Use Jack to change to our strongest color
            if jacks and hand_size > 1:
                # Find color with most cards (excluding the Jack)
                best_color = max(color_counts, key=color_counts.get)
                if color_counts[best_color] > 1:
                    return jacks[0]
        
        # Middle game or fallback
        if hand_size == 4:
            # Use Jack strategically to change to favorable color
            if jacks:
                # Find color with most cards
                best_color = max(color_counts, key=color_counts.get)
                if best_color != current_color and color_counts[best_color] >= 2:
                    return jacks[0]
        
        # Default: play any available card, prefer normal cards
        if normal_cards:
            return random.choice(normal_cards)
        return random.choice(playable_cards)
    
    def choose_color(self, hand: List[Dict]) -> str:
        """Choose color after playing Jack"""
        if self.difficulty == 'easy':
            # Random color
            return random.choice(['rosen', 'schellen', 'schilten', 'eichel'])
        else:
            # Choose color with most cards
            color_counts = {'rosen': 0, 'schellen': 0, 'schilten': 0, 'eichel': 0}
            for card in hand:
                color_counts[card['suit']] += 1
            
            # Return color with most cards
            return max(color_counts, key=color_counts.get)
    
    def should_call_tschau(self, hand_size: int) -> bool:
        """Decide whether to call Tschau"""
        if hand_size != 2:
            return False
            
        if self.difficulty == 'easy':
            # Sometimes forgets
            return random.random() > 0.3
        elif self.difficulty == 'medium':
            # Rarely forgets
            return random.random() > 0.1
        else:  # hard
            # Never forgets
            return True
    
    def should_call_sepp(self, hand_size: int) -> bool:
        """Decide whether to call Sepp"""
        if hand_size != 0:
            return False
            
        if self.difficulty == 'easy':
            # Sometimes forgets
            return random.random() > 0.2
        elif self.difficulty == 'medium':
            # Rarely forgets
            return random.random() > 0.05
        else:  # hard
            # Never forgets
            return True
    
    def get_thinking_time(self) -> float:
        """Get realistic thinking time based on difficulty"""
        min_time, max_time = self.thinking_time[self.difficulty]
        return random.uniform(min_time, max_time)
    
    def should_draw_or_play(self, has_playable_card: bool) -> str:
        """Decide whether to draw or play a card"""
        if not has_playable_card:
            return 'draw'
        
        # Hard AI might strategically draw in rare cases
        if self.difficulty == 'hard' and random.random() < 0.05:
            return 'draw'
            
        return 'play'