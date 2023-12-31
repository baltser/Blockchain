import * as WebSocket from 'ws';

export abstract class MessageServer<T> {
  constructor(private readonly wsServer: WebSocket.Server) {
    this.wsServer.on('connection', this.subscribeToMessages);     //подписка на сообщения только что подключенного клиента
    this.wsServer.on('error', this.cleanupDeadClients);           //очишает ссылки на отключившихся клиентов
  }

  protected abstract handleMessage(sender: WebSocket, message: T): void;        //этот метод реализован в классе BlockChainServer

  protected readonly subscribeToMessages = (ws: WebSocket): void => {
    ws.on('message', (data: WebSocket.Data) => {            //Полученно сообщение от клиента
      if (typeof data === 'string') {
        this.handleMessage(ws, JSON.parse(data));                 //передает сообщение обработчику
      } else {
        console.log('Received data of unsupported type.');
      }
    });
  };

  private readonly cleanupDeadClients = (): void => {               // производит очистку отключившихся клиентов
    this.wsServer.clients.forEach(client => {
      if (this.isDead(client)) {
        this.wsServer.clients.delete(client);
      }
    });
  };

  protected broadcastExcept(currentClient: WebSocket, message: Readonly<T>): void {      //производит рассылку по всем узлам
    this.wsServer.clients.forEach(client => {
      if (this.isAlive(client) && client !== currentClient) {
        client.send(JSON.stringify(message));
      }
    });
  }

  protected replyTo(client: WebSocket, message: Readonly<T>): void {      //Отправиляет сообщение одному узлу
    client.send(JSON.stringify(message));
  }

  protected get clients(): Set<WebSocket> {
    return this.wsServer.clients;
  }

  private isAlive(client: WebSocket): boolean {
    return !this.isDead(client);
  }

  private isDead(client: WebSocket): boolean {              //проверяет не отключен ли конкретный клиет
    return (
      client.readyState === WebSocket.CLOSING ||
      client.readyState === WebSocket.CLOSED
    );
  }
}
