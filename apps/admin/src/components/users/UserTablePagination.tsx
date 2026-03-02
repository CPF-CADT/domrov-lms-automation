import { BaseButton } from '../base';

interface UserTablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    onGoToPage: (page: number) => void;
}

const UserTablePagination: React.FC<UserTablePaginationProps> = ({
    currentPage,
    totalPages,
    onPrevPage,
    onNextPage,
    onGoToPage,
}) => {
    return (
        <div className="flex justify-center items-center gap-2 mt-6">
            <BaseButton
                variant="secondary"
                size="sm"
                onClick={onPrevPage}
                disabled={currentPage === 1}
            >
                Previous
            </BaseButton>

            <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <BaseButton
                        key={page}
                        variant={currentPage === page ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => onGoToPage(page)}
                        className={currentPage === page ? '' : ''}
                    >
                        {page}
                    </BaseButton>
                ))}
            </div>

            <BaseButton
                variant="secondary"
                size="sm"
                onClick={onNextPage}
                disabled={currentPage === totalPages}
            >
                Next
            </BaseButton>
        </div>
    );
};

export default UserTablePagination;
