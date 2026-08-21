export class ResponseUtil {
    static error(status: number, message: string) {
        return {
            status,
            message
        };
    }
}