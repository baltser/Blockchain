import * as crypto from "crypto";

class Block {
    readonly nonce: number;
    readonly hash: string;
    constructor(
        readonly index: number,       //полседовательный номер этого блока
        readonly previousHash: string,     //Хеш предыдущего блока
        readonly timestamp: number,         //Время создания блока
        readonly data: string               //данные приложения
    ) {
        const { nonce, hash } = this.mine();
        this.nonce = nonce;
        this.hash = hash;
    }
    private calculateHash(nonce: number): string {
        const data = this.index + this.previousHash + this.timestamp + this.data + nonce; // nonce является частью вводя для вычисленяи
        return crypto
            .createHash('sha256')           //создает экземпляр объекта  Hash  для генерации SHA256 хешей
            .update(data)                            //вычисляет и обновляет хэш значение внутри объекта Hash
            .digest('hex')                  //преобразует хэш значение в шеснадцатеричную строку
    }
    private mine(): {nonce: number, hash: string} {
        let hash: string;
        let nonce = 0;
        do {
            hash = this.calculateHash(++nonce);       // использует полный перебор для добычи данных
        } while (!hash.startsWith('00000'));          //выполняет цикл пока кеш не будет начинаться с 00000
        return { nonce, hash }
    }
}

class Blockchain {
    private readonly chain: Block[] = [];

    private get lastBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    constructor() {
        this.chain.push(
            new Block(0, '0', Date.now(),
                'Genesis block'));
    }
    addBlock(data: string): void {
        const block = new Block(
            this.lastBlock.index + 1,
            this.lastBlock.hash,
            Date.now(),
            data
        );
        this.chain.push(block)
    }
}
const blockchain = new Blockchain();
console.log('Mining block #1........');
blockchain.addBlock('First block');

console.log('Mining block #2........');
blockchain.addBlock('Second block');

console.log(JSON.stringify(blockchain, null, 2));