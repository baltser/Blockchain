import { html } from '../../../node_modules/lit-html/lit-html.js';
import { formatTransactions, UI } from './common.js';
export class PendingTransactionsPanel {
    constructor(requestRendering) {
        this.requestRendering = requestRendering;
    }
    render(node) {
        const shouldDisableGenerate = node.noPendingTransactions || node.isMining;
        const formattedTransactions = node.hasPendingTransactions
            ? formatTransactions(node.pendingTransactions)
            : 'No pending transactions yet.';
        return html `
      <h2>Pending transactions</h2>
      <pre class="pending-transactions__list">${formattedTransactions}</pre>
      <div class="pending-transactions__form">${UI.button('GENERATE BLOCK', shouldDisableGenerate)}</form>
      <div class="clear"></div>
    `;
    }
}
//# sourceMappingURL=pending-transactions-panel.js.map