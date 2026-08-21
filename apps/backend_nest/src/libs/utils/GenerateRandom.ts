// libs/utils/GenerateRandom.ts
const { customAlphabet } = require('nanoid');

export const generateJoinCode = (): string => {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
    return nanoid();
};