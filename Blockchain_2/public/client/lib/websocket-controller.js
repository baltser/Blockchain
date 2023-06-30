import { MessageTypes } from '../../shared/messages.js';
import { uuid } from './cryptography.js';
export class WebsocketController {
    constructor(messagesCallback) {
        this.messagesCallback = messagesCallback;
        this.messagesAwaitingReply = new Map();
        this.onMessageReceived = (event) => {
            const message = JSON.parse(event.data);
            if (this.messagesAwaitingReply.has(message.correlationId)) {
                this.messagesAwaitingReply.get(message.correlationId).resolve(message);
                this.messagesAwaitingReply.delete(message.correlationId);
            }
            else {
                this.messagesCallback(message); // an unexpected message from the server
            }
        };
        this.websocket = this.connect();
    }
    get url() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const hostname = window.location.host;
        return `${protocol}://${hostname}`;
    }
    connect() {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            ws.addEventListener('open', () => resolve(ws));
            ws.addEventListener('error', err => reject(err));
            ws.addEventListener('message', this.onMessageReceived);
        });
    }
    async send(message, awaitForReply = false) {
        return new Promise(async (resolve, reject) => {
            if (awaitForReply) {
                this.messagesAwaitingReply.set(message.correlationId, { resolve, reject });
            }
            this.websocket.then(ws => ws.send(JSON.stringify(message)), () => this.messagesAwaitingReply.delete(message.correlationId));
        });
    }
    async requestLongestChain() {
        const reply = await this.send({
            type: MessageTypes.GetLongestChainRequest,
            correlationId: uuid()
        }, true);
        return reply.payload;
    }
    requestNewBlock(transactions) {
        this.send({
            type: MessageTypes.NewBlockRequest,
            correlationId: uuid(),
            payload: transactions
        });
    }
    announceNewBlock(block) {
        this.send({
            type: MessageTypes.NewBlockAnnouncement,
            correlationId: uuid(),
            payload: block
        });
    }
}
//# sourceMappingURL=websocket-controller.js.map