import { html, TemplateResult } from '../../../node_modules/lit-html/lit-html.js';
import { Message, MessageTypes } from '../../shared/messages.js';
import { Block, BlockchainNode, Transaction } from '../lib/blockchain-node.js';
import { WebsocketController } from '../lib/websocket-controller.js';
import { BlocksPanel } from './blocks-panel.js';
import { Callback, Renderable } from './common.js';
import { PendingTransactionsPanel } from './pending-transactions-panel.js';
import { TransactionForm } from './transaction-form.js';

export class Application implements Renderable<void> {
  private readonly node: BlockchainNode;
  private readonly server: WebsocketController;    //этот объект отвечает за обмен данными через WebSocket

  // UI components:
  private readonly transactionForm = new TransactionForm(this.requestRendering);                            //   |  Передает на обратный
  private readonly pendingTransactionsPanel = new PendingTransactionsPanel(this.requestRendering);   //   |  вызов верхнего уровня
  private readonly blocksPanel = new BlocksPanel(this.requestRendering);                                        //   |каждому UI-компоненту

  constructor(readonly requestRendering: Callback) {        // ссылка на обратный вызов будет храниться в свойсве requestRendering
    this.server = new WebsocketController(this.handleServerMessages);    //подключается к  WebSocket-серверу
    this.node = new BlockchainNode();                   //вся логика создания блокчейна и узлов рассположена здесь

    this.requestRendering();
    this.initializeBlockchain();              //инициализирует блокчейн
  }

  private async initializeBlockchain() {
    const blocks = await this.server.requestLongestChain();       //запрашивает у всех узлов длиннейшую цепочку
    if (blocks.length > 0) {
      this.node.initializeWith(blocks);
    } else {
      await this.node.initializeWithGenesisBlock();
    }

    this.requestRendering();
  }

  render(): TemplateResult {                  //отображает компоненты UI
    return html`
      <main>
        <h1>Blockchain node</h1>
        <aside>${this.statusLine}</aside>
        <section>${this.transactionForm.render(this.node)}</section>
        <section>
          <form @submit="${this.generateBlock}">                                                //повторно отображает дочерний компонент
            ${this.pendingTransactionsPanel.render(this.node)}
          </form>
        </section>
        <section>${this.blocksPanel.render(this.node.chain)}</section>
      </main>
    `;
  }

  private get statusLine(): TemplateResult {
    return html`
      <p>${
        this.node.chainIsEmpty          ? '⏳ Initializing the blockchain...' :
        this.node.isMining              ? '⏳ Mining a new block...' :
        this.node.noPendingTransactions ? '📩 Add one or more transactions.' :
                                          '✅ Ready to mine a new block.'
      }</p>
    `;
  }

  private readonly generateBlock = async (event: Event): Promise<void> => {
    event.preventDefault();             //предотвращает обновление страницы

    // Let everyone in the network know about transactions need to be added to the blockchain.
    // Every node will try to generate a new block first for the provided transactions.
    this.server.requestNewBlock(this.node.pendingTransactions);         //сообщает всем другим узлам что один из них начал добычу
    const miningProcessIsDone = this.node.mineBlockWith(this.node.pendingTransactions);    //начинает добычу блока

    // Updates status and disables forms.
    this.requestRendering();      //обновляте статус UI

    const newBlock = await miningProcessIsDone;         //ожидает завершение добычи
    this.addBlock(newBlock);                              //добавляет блок в локальный блокчейн
  };

  private async addBlock(block: Block, notifyOthers = true): Promise<void> {
    // The addBlock() method returns a promise that is  rejected if the block cannot be added
    // to the chain. Hence wrap the addBlock() call in the try / catch.
    try {
      await this.node.addBlock(block);
      if (notifyOthers) {
        this.server.announceNewBlock(block);
      }
    } catch (error) {
      console.log(error.message);
    }

    // Updates status, enables forms and renders the new block.
    this.requestRendering();
  }

  private readonly handleServerMessages = (message: Message) => {       //Отправляет сообщения от WebSocket-сервера
    switch (message.type) {         //передает сообщение соответсвеющему обработчику
      case MessageTypes.GetLongestChainRequest: return this.handleGetLongestChainRequest(message);
      case MessageTypes.NewBlockRequest       : return this.handleNewBlockRequest(message);
      case MessageTypes.NewBlockAnnouncement  : return this.handleNewBlockAnnouncement(message);
      default: {
        console.log(`Received message of unknown type: "${message.type}"`);
      }
    }
  }

  private handleGetLongestChainRequest(message: Message): void {        //узел отправляет свою цепочку серверу
    this.server.send({
      type: MessageTypes.GetLongestChainResponse,
      correlationId: message.correlationId,
      payload: this.node.chain
    });
  }

  private async handleNewBlockRequest(message: Message): Promise<void> {
    const transactions = message.payload as Transaction[];
    const newBlock = await this.node.mineBlockWith(transactions);
    this.addBlock(newBlock);
  }

  private async handleNewBlockAnnouncement(message: Message): Promise<void> {
    const newBlock = message.payload as Block;
    this.addBlock(newBlock, false);
  }
}
