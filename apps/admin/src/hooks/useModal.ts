import { useState, useCallback } from 'react';

interface UseModalReturn {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    toggleModal: () => void;
}

export const useModal = (initialOpen: boolean = false): UseModalReturn => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    const openModal = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
    }, []);

    const toggleModal = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    return {
        isOpen,
        openModal,
        closeModal,
        toggleModal,
    };
};
