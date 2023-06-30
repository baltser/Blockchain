import { html } from '../../../node_modules/lit-html/lit-html.js';
import { MessageTypes } from '../../shared/messages.js';
import { BlockchainNode } from '../lib/blockchain-node.js';
import { WebsocketController } from '../lib/websocket-controller.js';
import { BlocksPanel } from './blocks-panel.js';
import { PendingTransactionsPanel } from './pending-transactions-panel.js';
import { TransactionForm } from './transaction-form.js';
export class Application {
    constructor(requestRendering) {
        this.requestRendering = requestRendering;
        // UI components:
        this.transactionForm = new TransactionForm(this.requestRendering);
        this.pendingTransactionsPanel = new PendingTransactionsPanel(this.requestRendering);
        this.blocksPanel = new BlocksPanel(this.requestRendering);
        this.generateBlock = async (event) => {
            event.preventDefault();
            // Let everyone in the network know about transactions need to be added to the blockchain.
            // Every node will try to generate a new block first for the provided transactions.
            this.server.requestNewBlock(this.node.pendingTransactions);
            const miningProcessIsDone = this.node.mineBlockWith(this.node.pendingTransactions);
            // Updates status and disables forms.
            this.requestRendering();
            const newBlock = await miningProcessIsDone;
            this.addBlock(newBlock);
        };
        this.handleServerMessages = (message) => {
            switch (message.type) {
                case MessageTypes.GetLongestChainRequest: return this.handleGetLongestChainRequest(message);
                case MessageTypes.NewBlockRequest: return this.handleNewBlockRequest(message);
                case MessageTypes.NewBlockAnnouncement: return this.handleNewBlockAnnouncement(message);
                default: {
                    console.log(`Received message of unknown type: "${message.type}"`);
                }
            }
        };
        this.server = new WebsocketController(this.handleServerMessages);
        this.node = new BlockchainNode();
        this.requestRendering();
        this.initializeBlockchain();
    }
    async initializeBlockchain() {
        const blocks = await this.server.requestLongestChain();
        if (blocks.length > 0) {
            this.node.initializeWith(blocks);
        }
        else {
            await this.node.initializeWithGenesisBlock();
        }
        this.requestRendering();
    }
    render() {
        return html `
      <main>
        <h1>Blockchain node</h1>
        <aside>${this.statusLine}</aside>
        <section>${this.transactionForm.render(this.node)}</section>
        <section>
          <form @submit="${this.generateBlock}">
            ${this.pendingTransactionsPanel.render(this.node)}
          </form>
        </section>
        <section>${this.blocksPanel.render(this.node.chain)}</section>
      </main>
    `;
    }
    get statusLine() {
        return html `
      <p>${this.node.chainIsEmpty ? '⏳ Initializing the blockchain...' :
            this.node.isMining ? '⏳ Mining a new block...' :
                this.node.noPendingTransactions ? '📩 Add one or more transactions.' :
                    '✅ Ready to mine a new block.'}</p>
    `;
    }
    async addBlock(block, notifyOthers = true) {
        // The addBlock() method returns a promise that is  rejected if the block cannot be added
        // to the chain. Hence wrap the addBlock() call in the try / catch.
        try {
            await this.node.addBlock(block);
            if (notifyOthers) {
                this.server.announceNewBlock(block);
            }
        }
        catch (error) {
            console.log(error.message);
        }
        // Updates status, enables forms and renders the new block.
        this.requestRendering();
    }
    handleGetLongestChainRequest(message) {
        this.server.send({
            type: MessageTypes.GetLongestChainResponse,
            correlationId: message.correlationId,
            payload: this.node.chain
        });
    }
    async handleNewBlockRequest(message) {
        const transactions = message.payload;
        const newBlock = await this.node.mineBlockWith(transactions);
        this.addBlock(newBlock);
    }
    async handleNewBlockAnnouncement(message) {
        const newBlock = message.payload;
        this.addBlock(newBlock, false);
    }
}
//# sourceMappingURL=application.js.map