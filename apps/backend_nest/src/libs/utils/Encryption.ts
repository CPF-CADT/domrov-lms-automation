import bcrypt from "bcrypt";
import crypto from 'crypto';

export class Encryption {
    // Hash a password with bcrypt
    static async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify a password against a stored bcrypt hash
    static async verifyPassword(storedHashedPassword: string, inputPassword: string): Promise<boolean> {
        return await bcrypt.compare(inputPassword, storedHashedPassword);
    }

    static encryptKey(plainText: string): string {
        const masterKey = Buffer.from(process.env.AI_KEY_MASTER_SECRET!, 'hex'); // 32 bytes
        const iv = crypto.randomBytes(12); // AES-GCM recommended 12-byte IV
        const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);

        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Combine iv + authTag + encrypted into a single hex string
        return Buffer.concat([iv, authTag, encrypted]).toString('hex');
    }

    static decryptKey(data: string): string {
        const buffer = Buffer.from(data, 'hex');
        const masterKey = Buffer.from(process.env.AI_KEY_MASTER_SECRET!, 'hex');

        const iv = buffer.slice(0, 12); // first 12 bytes
        const authTag = buffer.slice(12, 28); // next 16 bytes
        const encrypted = buffer.slice(28); // rest is ciphertext

        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    }
}
