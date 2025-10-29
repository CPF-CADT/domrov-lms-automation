import bcrypt from "bcrypt";

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
}
1