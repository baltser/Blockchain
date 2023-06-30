import * as WebSocket from 'ws';
import { Message, MessageTypes, UUID } from '../shared/messages';
import { MessageServer } from './message-server';

type Replies = Map<WebSocket, Message>;

export class BlockchainServer extends MessageServer<Message> {
    private readonly receivedMessagesAwaitingResponse = new Map<UUID, WebSocket>(); //коллекция клиентских соощений, ожидающих ответов

    private readonly sentMessagesAwaitingReply = new Map<UUID, Replies>(); // Used as accumulator for replies from clients.

    protected handleMessage(sender: WebSocket, message: Message): void {       //обработчик для всех тихов сообщений
        switch (message.type) {
            case MessageTypes.GetLongestChainRequest : return this.handleGetLongestChainRequest(sender, message);
            case MessageTypes.GetLongestChainResponse: return this.handleGetLongestChainResponse(sender, message);
            case MessageTypes.NewBlockRequest        : return this.handleAddTransactionsRequest(sender, message);
            case MessageTypes.NewBlockAnnouncement   : return this.handleNewBlockAnnouncement(sender, message);
            default: {
                console.log(`Received message of unknown type: "${message.type}"`);
            }
        }
    }

    private handleGetLongestChainRequest(requestor: WebSocket, message: Message): void {
        // If there are other nodes in the network ask them about their chains.
        // Otherwise immediately reply to the requestor with an empty array.

        if (this.clientIsNotAlone) {
            this.receivedMessagesAwaitingResponse.set(message.correlationId, requestor);  //Сохраняет запрос клиента, используя в качестве ключа Id корреляции
            this.sentMessagesAwaitingReply.set(message.correlationId, new Map()); // Map накапливает отпеты от clients
            this.broadcastExcept(requestor, message);  //рассылает сообщения другим узлам
        } else {
            this.replyTo(requestor, {
                type: MessageTypes.GetLongestChainResponse,
                correlationId: message.correlationId,
                payload: []  //в блокчейне с одним узлом нет длинейших цепочек
            });
        }
    }

    private handleGetLongestChainResponse(sender: WebSocket, message: Message): void {
        if (this.receivedMessagesAwaitingResponse.has(message.correlationId)) {  //находит клиента запросившего длинейшую цепочку
            const requestor = this.receivedMessagesAwaitingResponse.get(message.correlationId);  //получает ссылку на объект сокета клиента

            if (this.everyoneReplied(sender, message)) {
                const allReplies = this.sentMessagesAwaitingReply.get(message.correlationId).values();
                const longestChain = Array.from(allReplies).reduce(this.selectTheLongestChain);    //находит длинейшею цепочку
                this.replyTo(requestor, longestChain);          //передает длинейшую цепочку
            }
        }
    }

    private handleAddTransactionsRequest(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    private handleNewBlockAnnouncement(requestor: WebSocket, message: Message): void {
        this.broadcastExcept(requestor, message);
    }

    // NOTE: naive implementation that assumes no clients added or removed after the server requested the longest chain.
    // Otherwise the server may await a reply from a client that has never received the request.
    private everyoneReplied(sender: WebSocket, message: Message): boolean {     //проверяет все ли узлы ответили на запрос
        const repliedClients = this.sentMessagesAwaitingReply
            .get(message.correlationId)
            .set(sender, message);

        const awaitingForClients = Array.from(this.clients).filter(c => !repliedClients.has(c));

        return awaitingForClients.length === 1; // 1 - все ли узлы овтетили.
    }

    private selectTheLongestChain(currentlyLongest: Message, current: Message, index: number) {     // этот метод используется при сокращении массивва длинейших цепочек
        return index > 0 && current.payload.length > currentlyLongest.payload.length ? current : currentlyLongest;
    }

    private get clientIsNotAlone(): boolean {
        return this.clients.size > 1;
    }
}


/*
import * as WebSocket from 'ws';
import { Message, MessageTypes, UUID } from '../shared/messages';
import { MessageServer } from './message-server';

export class BlockchainServer extends MessageServer<Message> {
  private readonly receivedMessagesAwaitingResponse = new Map<UUID, WebSocket>();

  protected handleMessage(sender: WebSocket, message: Message): void {
    switch (message.type) {
      case MessageTypes.GetLongestChainRequest : return this.handleGetLongestChainRequest(sender, message);
      case MessageTypes.GetLongestChainResponse: return this.handleGetLongestChainResponse(message);
      case MessageTypes.NewBlockRequest        : return this.handleNewBlockRequest(sender, message);
      case MessageTypes.NewBlockAnnouncement   : return this.handleNewBlockAnnouncement(sender, message);
      default: {
        console.log(`Received message of unknown type: "${message.type}"`);
      }
    }
  }

  private handleGetLongestChainRequest(requestor: WebSocket, message: Message): void {
    // If there are other nodes in the network ask them about their chains.
    // Otherwise immediately reply to the requestor with an empty array.

    if (this.clientIsNotAlone) {
      this.receivedMessagesAwaitingResponse.set(message.correlationId, requestor);
      this.broadcastExcept(requestor, message);
    } else {
      this.replyTo(requestor, {
        type: MessageTypes.GetLongestChainResponse,
        correlationId: message.correlationId,
        payload: []
      });
    }
  }

  private handleGetLongestChainResponse(message: Message): void {

    if (this.receivedMessagesAwaitingResponse.has(message.correlationId)) {
      const requestor = this.receivedMessagesAwaitingResponse.get(message.correlationId);
      this.replyTo(requestor, message);
    }
  }

  private handleNewBlockRequest(requestor: WebSocket, message: Message): void {
    this.broadcastExcept(requestor, message);
  }

  private handleNewBlockAnnouncement(requestor: WebSocket, message: Message): void {
    this.broadcastExcept(requestor, message);
  }

  private get clientIsNotAlone(): boolean {
    return this.clients.size > 1;
  }
}
*/
