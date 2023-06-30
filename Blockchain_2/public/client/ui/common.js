import { html } from '../../../node_modules/lit-html/lit-html.js';
export function titleize(text) {
    return text.toLowerCase().replace(/(?:^|\s|-)\S/g, x => x.toUpperCase());
}
export function formatTransactions(transactions) {
    return transactions.map(t => `${t.sender} → ${t.recipient}: $${t.amount}`).join('\n');
}
export function randomDelay(maxMilliseconds = 100) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), Math.floor(Math.random() * Math.floor(maxMilliseconds)));
    });
}
export var UI;
(function (UI) {
    function button(label, disabled = false) {
        return html `
      <button type="submit" ?disabled=${disabled} class="ripple">${label}</button>
    `;
    }
    UI.button = button;
    function formField(name, value, changeHandler, disabled = false, type = 'text') {
        return html `
      <input name=${name}
             type=${type}
             .value=${value}
             @change=${changeHandler}
             ?disabled=${disabled}
             placeholder=${titleize(name)}
             autocomplete="off">
    `;
    }
    UI.formField = formField;
})(UI || (UI = {}));
//# sourceMappingURL=common.js.map