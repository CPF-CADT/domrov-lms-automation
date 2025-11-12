import { customAlphabet } from 'nanoid';

export const generateJoinCode = (): string => {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
    return nanoid();
};