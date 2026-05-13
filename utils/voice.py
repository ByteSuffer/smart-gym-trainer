"""
utils/voice.py
Text-to-speech feedback system.
Runs in a background thread so it never blocks the video loop.
Has a cooldown system to prevent spam warnings.
"""

import pyttsx3
import threading
import queue
import time


class VoiceFeedback:
    def __init__(self, cooldown_seconds=4):
        self.cooldown = cooldown_seconds
        self.last_spoken = {}       # message -> timestamp
        self.queue = queue.Queue()
        self.running = True

        # Start background TTS thread
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()

    def speak(self, message):
        """
        Queue a message to be spoken.
        Silently ignored if the same message was spoken recently.
        """
        now = time.time()
        last = self.last_spoken.get(message, 0)

        if now - last >= self.cooldown:
            self.last_spoken[message] = now
            self.queue.put(message)

    def _worker(self):
        """Background thread: reads queue and speaks messages."""
        engine = pyttsx3.init()
        engine.setProperty("rate", 150)    # speaking speed
        engine.setProperty("volume", 1.0)  # 0.0 to 1.0

        while self.running:
            try:
                message = self.queue.get(timeout=1)
                engine.say(message)
                engine.runAndWait()
            except queue.Empty:
                continue
            except Exception as e:
                print(f"[Voice] Error: {e}")

    def stop(self):
        self.running = False
        self.thread.join(timeout=2)