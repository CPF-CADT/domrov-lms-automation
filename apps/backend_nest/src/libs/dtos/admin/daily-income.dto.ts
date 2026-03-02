import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

/**
 * Daily Income Item DTO
 * Represents income data for a single day
 */
export class DailyIncomeItemDto {
    @ApiProperty({
        example: '2026-03-02',
        description: 'Date in ISO 8601 format (YYYY-MM-DD)',
        type: String,
    })
    @IsString()
    date: string;

    @ApiProperty({
        example: 210.50,
        description: 'Total income for the day in USD',
        type: Number,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    value: number;
}

/**
 * Daily Income Response DTO
 * Contains array of daily income data for the last 7 days
 * Suitable for dashboard charts (Income Daily chart)
 */
export class DailyIncomeResponseDto {
    @ApiProperty({
        description: 'Array of daily income data for the last 7 days, sorted by date ascending',
        type: [DailyIncomeItemDto],
        example: [
            { date: '2026-02-24', value: 120.0 },
            { date: '2026-02-25', value: 95.50 },
            { date: '2026-02-26', value: 0 },
            { date: '2026-02-27', value: 250.75 },
            { date: '2026-02-28', value: 180.25 },
            { date: '2026-03-01', value: 0 },
            { date: '2026-03-02', value: 210.0 },
        ],
    })
    dailyData: DailyIncomeItemDto[];
}
