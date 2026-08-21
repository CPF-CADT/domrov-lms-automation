import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== FILE/FOLDER STRUCTURE DTOs ====================

export class FileContentDto {
    @ApiProperty({ description: 'Type of item', example: 'file' })
    type: 'file';

    @ApiProperty({ description: 'File name', example: 'main.cpp' })
    name: string;

    @ApiProperty({ description: 'File path relative to submission root', example: '1a502673e8870d73/main.cpp' })
    path: string;

    @ApiProperty({ 
        description: 'File content as array of lines', 
        type: [String],
        example: ['#include <iostream>', 'int main() {', '    return 0;', '}'] 
    })
    content: string[];
}

export class ProcessSubmissionResponseDto {
    @ApiProperty({ description: 'File details with content', type: FileContentDto })
    file: FileContentDto;
}

export class FolderNodeDto {
    @ApiProperty({ description: 'Name of file or folder', example: 'src' })
    name: string;

    @ApiProperty({ description: 'Type: file or folder', enum: ['file', 'folder'], example: 'folder' })
    type: 'file' | 'folder';

    @ApiPropertyOptional({ description: 'Child nodes (for folders)', type: [FolderNodeDto] })
    children?: FolderNodeDto[];
}

export class FolderStructureResponseDto {
    @ApiProperty({ description: 'Folder structure tree', type: FolderNodeDto })
    folder_structure: FolderNodeDto;
}

// ==================== QUEUE DTOs ====================

export class AddQueueResponseDto {
    @ApiProperty({ description: 'Status message', example: 'Task queued successfully' })
    message: string;
}

// ==================== AI EVALUATION DTOs ====================

export class AIEvaluationResponseDto {
    @ApiProperty({ description: 'Success message', example: 'Evaluation created successfully' })
    message: string;

    @ApiProperty({ description: 'Created evaluation ID', example: 1 })
    evaluationId: number;
}
