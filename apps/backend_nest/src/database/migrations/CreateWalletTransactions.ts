import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWalletTransactions1771760000000 implements MigrationInterface {
    name = 'CreateWalletTransactions1771760000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create wallet_transactions table
        await queryRunner.createTable(
            new Table({
                name: 'wallet_transactions',
                columns: [
                    {
                        name: 'id',
                        type: 'integer',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'walletId',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'amount',
                        type: 'float',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['credit', 'debit', 'purchase'],
                        isNullable: false,
                    },
                    {
                        name: 'reason',
                        type: 'enum',
                        enum: ['ai_usage', 'purchase', 'refund', 'bonus', 'admin_adjustment'],
                        isNullable: true,
                    },
                    {
                        name: 'balanceBefore',
                        type: 'float',
                        isNullable: true,
                    },
                    {
                        name: 'balanceAfter',
                        type: 'float',
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'json',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_wallet_transactions_walletId',
                        columnNames: ['walletId'],
                    },
                    {
                        name: 'IDX_wallet_transactions_created_at',
                        columnNames: ['created_at'],
                    },
                ],
            }),
        );

        // Add foreign key constraint
        await queryRunner.createForeignKey(
            'wallet_transactions',
            new TableForeignKey({
                columnNames: ['walletId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'user_credit_balances',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('wallet_transactions');
        const foreignKey = table.foreignKeys.find(
            (fk) => fk.columnNames.indexOf('walletId') !== -1,
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey('wallet_transactions', foreignKey);
        }
        await queryRunner.dropTable('wallet_transactions');
    }
}
