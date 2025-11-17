/**
 * Behavioral Biometrics Tracking Library
 * Captures keystroke dynamics, mouse movements, and touch gestures
 */

class BehavioralTracker {
  constructor(options = {}) {
    this.options = {
      sendInterval: options.sendInterval || 30000, // Send data every 30 seconds
      maxKeystrokeBuffer: options.maxKeystrokeBuffer || 100,
      maxMouseBuffer: options.maxMouseBuffer || 200,
      maxTouchBuffer: options.maxTouchBuffer || 100,
      ...options
    };

    this.keystrokeData = [];
    this.mouseData = [];
    this.touchData = [];
    this.sessionStart = Date.now();
    this.lastKeyDown = new Map();
    this.lastMousePosition = null;
    this.isTracking = false;
    this.sendTimer = null;
  }

  /**
   * Start tracking behavioral data
   */
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    console.log('🔍 Behavioral tracking started');

    // Keystroke event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Mouse event listeners
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('click', this.handleMouseClick.bind(this));
    document.addEventListener('wheel', this.handleMouseWheel.bind(this));

    // Touch event listeners (mobile)
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // Periodic data sending (if in authenticated session)
    if (this.options.continuousMode) {
      this.startPeriodicSending();
    }
  }

  /**
   * Stop tracking
   */
  stopTracking() {
    this.isTracking = false;
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }
    console.log('🛑 Behavioral tracking stopped');
  }

  /**
   * Handle keydown event
   */
  handleKeyDown(event) {
    const timestamp = Date.now();
    const key = event.key;

    // Store keydown time for duration calculation
    this.lastKeyDown.set(key, timestamp);

    // Don't store password field keystrokes for security
    if (event.target.type === 'password' && this.options.skipPasswordKeys) {
      return;
    }

    this.keystrokeData.push({
      type: 'keydown',
      key: key.length === 1 ? key : '[special]', // Anonymize special keys
      code: event.code,
      timestamp,
      sessionTime: timestamp - this.sessionStart
    });

    // Limit buffer size
    if (this.keystrokeData.length > this.options.maxKeystrokeBuffer) {
      this.keystrokeData.shift();
    }
  }

  /**
   * Handle keyup event
   */
  handleKeyUp(event) {
    const timestamp = Date.now();
    const key = event.key;
    const keyDownTime = this.lastKeyDown.get(key);

    if (keyDownTime) {
      // Find the corresponding keydown event
      for (let i = this.keystrokeData.length - 1; i >= 0; i--) {
        if (this.keystrokeData[i].type === 'keydown' && 
            this.keystrokeData[i].key === (key.length === 1 ? key : '[special]') &&
            !this.keystrokeData[i].duration) {
          
          // Calculate dwell time (how long key was pressed)
          this.keystrokeData[i].duration = timestamp - keyDownTime;

          // Calculate flight time (time between this and previous keystroke)
          if (i > 0) {
            this.keystrokeData[i].flightTime = keyDownTime - this.keystrokeData[i - 1].timestamp;
          }
          
          break;
        }
      }

      this.lastKeyDown.delete(key);
    }
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(event) {
    const timestamp = Date.now();
    
    // Sample mouse movements (not every pixel to reduce data volume)
    if (!this.lastMousePosition || 
        timestamp - this.lastMousePosition.timestamp > 50) {
      
      this.mouseData.push({
        type: 'mousemove',
        x: event.clientX,
        y: event.clientY,
        timestamp,
        sessionTime: timestamp - this.sessionStart
      });

      this.lastMousePosition = {
        x: event.clientX,
        y: event.clientY,
        timestamp
      };

      // Limit buffer size
      if (this.mouseData.length > this.options.maxMouseBuffer) {
        this.mouseData.shift();
      }
    }
  }

  /**
   * Handle mouse click event
   */
  handleMouseClick(event) {
    const timestamp = Date.now();
    
    this.mouseData.push({
      type: 'click',
      x: event.clientX,
      y: event.clientY,
      button: event.button,
      timestamp,
      sessionTime: timestamp - this.sessionStart
    });
  }

  /**
   * Handle mouse wheel event
   */
  handleMouseWheel(event) {
    const timestamp = Date.now();
    
    this.mouseData.push({
      type: 'wheel',
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      timestamp,
      sessionTime: timestamp - this.sessionStart
    });

    // Limit buffer size
    if (this.mouseData.length > this.options.maxMouseBuffer) {
      this.mouseData.shift();
    }
  }

  /**
   * Handle touch start event
   */
  handleTouchStart(event) {
    const timestamp = Date.now();
    const touch = event.touches[0];
    
    if (touch) {
      this.touchData.push({
        type: 'touchstart',
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0,
        timestamp,
        sessionTime: timestamp - this.sessionStart,
        touchId: touch.identifier
      });
    }
  }

  /**
   * Handle touch move event
   */
  handleTouchMove(event) {
    const timestamp = Date.now();
    const touch = event.touches[0];
    
    if (touch) {
      this.touchData.push({
        type: 'touchmove',
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0,
        timestamp,
        sessionTime: timestamp - this.sessionStart,
        touchId: touch.identifier
      });

      // Limit buffer size
      if (this.touchData.length > this.options.maxTouchBuffer) {
        this.touchData.shift();
      }
    }
  }

  /**
   * Handle touch end event
   */
  handleTouchEnd(event) {
    const timestamp = Date.now();
    const touch = event.changedTouches[0];
    
    if (touch) {
      // Find corresponding touchstart to calculate duration
      for (let i = this.touchData.length - 1; i >= 0; i--) {
        if (this.touchData[i].type === 'touchstart' && 
            this.touchData[i].touchId === touch.identifier &&
            !this.touchData[i].duration) {
          
          const duration = timestamp - this.touchData[i].timestamp;
          const dx = touch.clientX - this.touchData[i].x;
          const dy = touch.clientY - this.touchData[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Determine if tap or swipe
          if (distance < 10 && duration < 300) {
            this.touchData[i].type = 'tap';
            this.touchData[i].duration = duration;
          } else {
            this.touchData[i].type = 'swipe';
            this.touchData[i].duration = duration;
            this.touchData[i].distance = distance;
            this.touchData[i].speed = distance / duration;
            this.touchData[i].direction = Math.atan2(dy, dx);
          }
          
          break;
        }
      }
    }
  }

  /**
   * Get collected behavioral data
   */
  getData() {
    return {
      keystrokeData: [...this.keystrokeData],
      mouseData: [...this.mouseData],
      touchData: [...this.touchData],
      sessionDuration: Date.now() - this.sessionStart,
      timestamp: Date.now()
    };
  }

  /**
   * Clear collected data
   */
  clearData() {
    this.keystrokeData = [];
    this.mouseData = [];
    this.touchData = [];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      keystrokeCount: this.keystrokeData.length,
      mouseEventCount: this.mouseData.length,
      touchEventCount: this.touchData.length,
      sessionDuration: Date.now() - this.sessionStart
    };
  }

  /**
   * Start periodic sending for continuous authentication
   */
  startPeriodicSending() {
    if (this.sendTimer) return;

    this.sendTimer = setInterval(async () => {
      if (this.keystrokeData.length > 0 || this.mouseData.length > 0) {
        const data = this.getData();
        
        try {
          const response = await fetch('/api/behavioral-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });

          if (response.ok) {
            const result = await response.json();
            
            // Emit custom event with assessment
            const event = new CustomEvent('behavioralAssessment', {
              detail: result.assessment
            });
            document.dispatchEvent(event);

            // Check if re-authentication is required
            if (result.assessment.recommendation.requiresAuth) {
              const reauthEvent = new CustomEvent('requiresReauth', {
                detail: result.assessment
              });
              document.dispatchEvent(reauthEvent);
            }

            // Clear data after successful send
            this.clearData();
          }
        } catch (error) {
          console.error('Failed to send behavioral data:', error);
        }
      }
    }, this.options.sendInterval);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehavioralTracker;
}
