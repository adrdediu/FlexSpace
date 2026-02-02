
interface WebSocketCallbacks {
    onOpen?: () => void;
    onMessage?: (data:any) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
}

interface WebSocketConnection {
    socket: WebSocket;
    callbacks: WebSocketCallbacks;
    reconnectAttempts: number;
    reconnectTimer?: number;
}

interface WebSocketConnections {
    [key: string]: WebSocketConnection;
}

class WebSocketService {
    private connections: WebSocketConnections = {};
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly RECONNECT_DELAY =3000;
    private readonly RECONNECT_BACKOFF = 1.5; // exponential backoff multiplier

    private getWebSocketBaseUrl(): string {
        const protocol = window.location.protocol === 'https:' ? 'wss': 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}`;
    }

    private getReconnectDelay(attempts:number): number {
        return Math.min(
            this.RECONNECT_DELAY * Math.pow(this.RECONNECT_BACKOFF, attempts),
            30000
        );
    }

    private async handleClose(
        connectionId: string,
        event: CloseEvent,
        callbacks: WebSocketCallbacks
    ): Promise<void> {
        const connection = this.connections[connectionId];
        if (!connection) return;

        if (callbacks.onClose){
            callbacks.onClose(event);
        }

        switch(event.code){
            case 1000: // normal closure
            case 1001: //going away
                delete this.connections[connectionId];
                break;
            case 4001: // unauthorised
                await this.handleUnauthorized(connectionId,callbacks);
                break;
            case 1006://abnormal closure
            case 1013: // try again later
            default :
                this.attemptReconnect(connectionId,callbacks);
                break;
        }
    }

    private async handleUnauthorized (
        connectionId: string,
        callbacks: WebSocketCallbacks
    ): Promise<void> {
        try {
            const {default: authService} = await import('./authService');
            
            const refreshed = await authService.refreshToken();

            if(refreshed) {
                setTimeout(() => {
                    this.reconnectConnection(connectionId, callbacks);
                }, 1000);
            } else {
                delete this.connections[connectionId];
            }
        } catch(error) {
            delete this.connections[connectionId];
        }
    }

    private attemptReconnect(
        connectionId: string,
        callbacks: WebSocketCallbacks
    ): void {
        const connection = this.connections[connectionId];
        if(!connection) return;

        if(connection.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            delete this.connections[connectionId];
            return;
        }

        connection.reconnectAttempts++;
        const delay = this.getReconnectDelay(connection.reconnectAttempts);

        connection.reconnectTimer = window.setTimeout( () => {
            this.reconnectConnection(connectionId, callbacks);
        }, delay);
    }

    private reconnectConnection (
        connectionId: string,
        callbacks: WebSocketCallbacks
    ): void {
        if(connectionId === 'global') {
            this.connectToGlobal(callbacks);
        } else if (connectionId.startsWith('room_')) {
            const roomId = connectionId.replace('room_', '');
            this.connectToRoom(roomId, callbacks);
        }
    }
    
    private createConnection(
        connectionId: string,
        url: string,
        callbacks: WebSocketCallbacks
    ): void {

        if(this.connections[connectionId]) {
            this.closeConnection(connectionId);
        }

        const socket = new WebSocket(url);

        this.connections[connectionId] = {
            socket,
            callbacks,
            reconnectAttempts: 0,
        };

        socket.onopen = () => {
            if(this.connections[connectionId]) {
                this.connections[connectionId].reconnectAttempts = 0;
            }

            try {
                socket.send(JSON.stringify({type:'ping'}));
            } catch (err) {
                console.error(`Failed to send ping to ${connectionId}:`, err);
            }

            if(callbacks.onOpen) {
                callbacks.onOpen();
            }
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if(data.type !== 'pong') {
                   //some debug message if needed 
                }
                
                if(callbacks.onMessage) {
                    callbacks.onMessage(data);
                }
            } catch (error) {
                console.error(`Error parsing WebSocket message from ${connectionId}:`, error);
            }
        }

        socket.onclose = (event) => {
            this.handleClose(connectionId, event, callbacks);
        };

        socket.onerror = (error) => {
            if(callbacks.onError) {
                callbacks.onError(error);
            }
        };
    }

    connectToRoom(
        roomId: number | string,
        callbacks: WebSocketCallbacks = {}
    ): boolean {
        const connectionId = `room_${roomId}`;
        const url = `${this.getWebSocketBaseUrl()}/ws/rooms/${roomId}/`;

        this.createConnection(connectionId, url, callbacks);
        return true;
    }

    connectToGlobal(callbacks: WebSocketCallbacks = {}): boolean {
        const connectionId = 'global';
        const url = `${this.getWebSocketBaseUrl()}/ws/global/`;

        this.createConnection(connectionId, url, callbacks);
        return true;
    }

    getConnection(id: string): WebSocket | null {
        return this.connections[id]?.socket || null;
    }

    isConnected(id: string): boolean {
        const connection = this.connections[id];
        return connection?.socket?.readyState ===WebSocket.OPEN;
    }

    send(connectionId: string, data:any): boolean {
        const connection = this.connections[connectionId];

        if(!connection || connection.socket.readyState !== WebSocket.OPEN) {
            console.error(`Cannot send: ${connectionId} is not connected`);
            return false;
        }
        
        try {
            connection.socket.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error sending data to ${connectionId}:`, error);
            return false;
        }
    }

    closeConnection(id:string): void {
        const connection = this.connections[id];
        
        if(!connection) return;

        if(connection.reconnectTimer) {
            window.clearTimeout(connection.reconnectTimer);
        }

        if(connection.socket.readyState === WebSocket.OPEN ||
           connection.socket.readyState === WebSocket.CONNECTING) {

            connection.socket.close(1000,'Client disconnect');
        }

        delete this.connections[id];
        
    }

    disconnectAll():void {
        Object.keys(this.connections).forEach((id) => {
            this.closeConnection(id);
        })
    }

    reconnectAll():void {
        
        const connectionsToReconnect = Object.entries(this.connections).map(
            ([id,conn]) => ({
                id,
                callbacks: conn.callbacks
            })
        );

        this.disconnectAll();

        setTimeout(() => {
            connectionsToReconnect.forEach(({id, callbacks}) => {
                if(id === 'global'){
                    this.connectToGlobal(callbacks);
                } else if ( id.startsWith('room_')) {
                    const roomId = id.replace('room_', '');
                    this.connectToRoom(roomId, callbacks)
                }
            })
        }, 500);
    }

    getActiveConnections(): string[] {
        return Object.keys(this.connections);
    }

    getConnectionStats(): {
        total: number;
        connected: number;
        connecting: number;
        disconnected: number;
    } {
        const stats = {
            total:0,
            connected: 0,
            connecting: 0,
            disconnected:0,
        };

        Object.values(this.connections).forEach((conn) => {
            stats.total++;
            switch (conn.socket.readyState) {
                case WebSocket.OPEN:
                    stats.connected++;
                    break;
                case WebSocket.CONNECTING:
                    stats.connecting++;
                    break;
                case WebSocket.CLOSED:
                case WebSocket.CLOSING:
                    stats.disconnected++;
                    break;
            }
        });

        return stats;
    }
}

export default new WebSocketService();