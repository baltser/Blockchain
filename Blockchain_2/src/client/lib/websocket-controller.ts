import { Message, MessageTypes, UUID } from '../../shared/messages.js';
import { Block, Transaction } from './blockchain-node.js';
import { uuid } from './cryptography.js';

interface PromiseExecutor<T> {
  resolve: (value?: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class WebsocketController {
  private websocket: Promise<WebSocket>;
  private readonly messagesAwaitingReply = new Map<UUID, PromiseExecutor<Message>>();  //карта WebSocket-клиетовб ожидающих ответов

  constructor(private readonly messagesCallback: (messages: Message) => void) {     //передает конструкторе обратынй вызов
    this.websocket = this.connect();          //подключается к WebServer
  }

  private get url(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const hostname = window.location.host;
    return `${protocol}://${hostname}`;
  }

  private connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      ws.addEventListener('open', () => resolve(ws));       //присваивает обратные вызовы сообщениям WebSocket
      ws.addEventListener('error', err => reject(err));
      ws.addEventListener('message', this.onMessageReceived);
    });
  }

  private readonly onMessageReceived = (event: MessageEvent) => {       //Обрабатыет входящие сообщения
    const message = JSON.parse(event.data) as Message;

    if (this.messagesAwaitingReply.has(message.correlationId)) {
      this.messagesAwaitingReply.get(message.correlationId).resolve(message);
      this.messagesAwaitingReply.delete(message.correlationId);
    } else {
      this.messagesCallback(message); // an unexpected message from the server
    }
  }

  async send(message: Partial<Message>, awaitForReply: boolean = false): Promise<Message> {
    return new Promise<Message>(async (resolve, reject) => {
      if (awaitForReply) {
        this.messagesAwaitingReply.set(message.correlationId, { resolve, reject });       //хранит сообщения, нуждающиеся в ответе
      }
      this.websocket.then(
        ws => ws.send(JSON.stringify(message)),
        () => this.messagesAwaitingReply.delete(message.correlationId)
      );
    });
  }

  async requestLongestChain(): Promise<Block[]> {
    const reply = await this.send({
      type: MessageTypes.GetLongestChainRequest,
      correlationId: uuid()
    }, true);
    return reply.payload;
  }

  requestNewBlock(transactions: Transaction[]): void {
    this.send({
      type: MessageTypes.NewBlockRequest,
      correlationId: uuid(),
      payload: transactions
    });
  }

  announceNewBlock(block: Block): void {
    this.send({
      type: MessageTypes.NewBlockAnnouncement,
      correlationId: uuid(),
      payload: block
    });
  }
}
