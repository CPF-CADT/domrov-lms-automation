// Utility for conditional class names

export const classNames = (...classes: (string | false | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};

export const conditionalClass = (
    condition: boolean,
    trueClass: string,
    falseClass?: string
): string => {
    return condition ? trueClass : falseClass || '';
};

// Merge class names intelligently
export const mergeClasses = (base: string, override?: string): string => {
    if (!override) return base;
    return `${base} ${override}`;
};
