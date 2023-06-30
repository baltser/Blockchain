import { html } from '../../../node_modules/lit-html/lit-html.js';
import { UI } from './common.js';
export class TransactionForm {
    constructor(requestRendering) {
        this.requestRendering = requestRendering;
        this.onFieldChange = (event) => {
            const { type, name, value } = event.target;
            this.transaction[name] = type === 'number' ? parseInt(value) : value;
            this.requestRendering();
        };
        this.resetForm();
    }
    render(node) {
        const { sender, recipient, amount } = this.transaction;
        const shouldDisableField = node.isMining || node.chainIsEmpty;
        return html `
      <h2>New transaction</h2>
      <form class="add-transaction-form" @submit=${event => this.enqueueTransaction(event, node)}>
        ${UI.formField('sender', sender, this.onFieldChange, shouldDisableField)}<span class="hidden-xs">→</span>
        ${UI.formField('recipient', recipient, this.onFieldChange, shouldDisableField)}
        ${UI.formField('amount', amount, this.onFieldChange, shouldDisableField, 'number')}
        ${UI.button('ADD TRANSACTION', node.isMining || !this.formValid)}
      </form>
    `;
    }
    get formValid() {
        return !!(this.transaction &&
            this.transaction.sender &&
            this.transaction.amount &&
            this.transaction.recipient);
    }
    enqueueTransaction(event, node) {
        event.preventDefault();
        node.addTransaction(this.transaction);
        this.resetForm();
    }
    resetForm() {
        this.transaction = { sender: null, recipient: null, amount: null };
        this.requestRendering();
    }
}
//# sourceMappingURL=transaction-form.js.map