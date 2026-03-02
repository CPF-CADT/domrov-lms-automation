import { BaseStatusBadge } from '../base';

const UserStatusBadge = ({ status }: { status: string }) => (
    <BaseStatusBadge status={status} variant="default" />
);

export default UserStatusBadge;
