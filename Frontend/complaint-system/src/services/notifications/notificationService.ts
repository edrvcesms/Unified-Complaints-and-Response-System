import { useAuthStore } from "../../store/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface NotificationData {
  event: string;
  data: any;
}

export type NotificationHandler = (notification: NotificationData) => void;

export class NotificationService {
  private eventSource: EventSource | null = null;
  private handlers: Map<string, Set<NotificationHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private isManuallyDisconnected = false;
  private buffer = '';
  private isConnecting = false;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  connect() {
    if (this.eventSource || this.isConnecting) {
      console.log("Already connected or connecting to notification stream");
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.warn("No access token available for notifications");
      return;
    }

    this.isManuallyDisconnected = false;
    this.isConnecting = true;
    
    const url = `${BASE_URL}/notifications/stream`;
    
    try {
      this.connectWithFetch(url, token);
    } catch (error) {
      console.error("Failed to connect to notification stream:", error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private async connectWithFetch(url: string, token: string) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      this.reader = response.body.getReader();
      const decoder = new TextDecoder();

      this.eventSource = {} as EventSource;
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      console.log("✅ Connected to notification stream");

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await this.reader!.read();
            
            if (done) {
              console.log("Stream ended");
              this.eventSource = null;
              this.reader = null;
              if (!this.isManuallyDisconnected) {
                this.scheduleReconnect();
              }
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            this.processChunk(chunk);
          }
        } catch (error) {
          console.error("Error reading stream:", error);
          this.eventSource = null;
          this.reader = null;
          if (!this.isManuallyDisconnected) {
            this.scheduleReconnect();
          }
        }
      };

      processStream();

    } catch (error) {
      console.error("Fetch connection error:", error);
      this.eventSource = null;
      this.reader = null;
      this.isConnecting = false;
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect();
      }
    }
  }

  private processChunk(chunk: string) {
    this.buffer += chunk;
    
    const messages = this.buffer.split('\n\n');
    
    this.buffer = messages.pop() || '';
    
    for (const message of messages) {
      if (!message.trim()) continue;
      
      const lines = message.split('\n');
      let event = 'message';
      let data = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          data = line.slice(5).trim();
        } else if (line.startsWith(':')) {
          continue;
        }
      }

      if (data) {
        try {
          const parsedData = JSON.parse(data);
          this.notifyHandlers(event, parsedData);
        } catch (error) {
          console.error("Failed to parse notification data:", error, "Data:", data);
        }
      }
    }
  }

  disconnect() {
    this.isManuallyDisconnected = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reader) {
      this.reader.cancel();
      this.reader = null;
    }

    if (this.eventSource) {
      this.eventSource = null;
      console.log("Disconnected from notification stream");
    }

    this.buffer = '';
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect() {
    if (this.isManuallyDisconnected) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.isConnecting = false;
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      console.log("Attempting to reconnect...");
      this.eventSource = null;
      this.isConnecting = false;
      this.connect();
    }, delay);
  }

  on(event: string, handler: NotificationHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const handlers = this.handlers.get(event)!;
    const sizeBefore = handlers.size;
    handlers.add(handler);
    
    if (import.meta.env.DEV && handlers.size === sizeBefore) {
      console.warn(`Handler already registered for event: ${event}`);
    }
  }

  off(event: string, handler: NotificationHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  private notifyHandlers(event: string, data: any) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler({ event, data });
        } catch (error) {
          console.error(`Error in notification handler for event ${event}:`, error);
        }
      });
    }

    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ event, data });
        } catch (error) {
          console.error(`Error in wildcard notification handler:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

export const notificationService = new NotificationService();
