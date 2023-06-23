import * as crypto from "crypto";

class Block {
    readonly hash: string;
    constructor(
        readonly index: number,       //полседовательный номер этого блока
        readonly previousHash: string,     //Хеш предыдущего блока
        readonly timestamp: number,         //Время создания блока
        readonly data: string               //данные приложения
    ) {
        this.hash = this.calculateHash();       //вычисляет хэш этого блока при его создании
    }
    private calculateHash(): string {
        const data = this.index + this.previousHash + this.timestamp + this.data;
        return crypto
            .createHash('sha256')           //создает экземпляр объекта  Hash  для генерации SHA256 хешей
            .update(data)                            //вычисляет и обновляет хэш значение внутри объекта Hash
            .digest('hex')                  //преобразует хэш значение в шеснадцатеричную строку
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