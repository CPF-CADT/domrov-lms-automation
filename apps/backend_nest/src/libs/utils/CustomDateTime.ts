export function getDelayFromNow(destinationDate: Date | string): number {
    const target = new Date(destinationDate).getTime();
    const now = Date.now();

    const delay = target - now;

    return delay > 0 ? delay : 0;
}