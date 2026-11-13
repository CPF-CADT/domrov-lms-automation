import { Body, Controller, Get, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import { AcademicService } from './academic.service';
import { AuthenticatedRequest, JwtBoundaryGuard } from './auth';
import { EvaluationPublisher } from './messaging/rabbitmq';

class ExecutionFileDto {
  @IsString() @MinLength(1) @MaxLength(300) path!: string;
  @IsString() @MaxLength(5_000_000) content!: string;
}

class CreateExecutionDto {
  @IsString() submissionId!: string;
  @IsOptional() @IsString() snapshotId?: string;
  @IsString() language!: string;
  @IsString() @MinLength(1) @MaxLength(1000) command!: string;
  @IsOptional() @IsString() @MaxLength(100_000) stdin?: string;
  @IsArray() files!: ExecutionFileDto[];
}

interface SnapshotFile { path: string; content: string; }
interface SnapshotNode { name: string; type: 'file' | 'folder'; children?: SnapshotNode[]; }

@Controller('executions')
@UseGuards(JwtBoundaryGuard)
export class ExecutionController {
  constructor(private readonly academic: AcademicService, private readonly publisher: EvaluationPublisher) {}

  @Post()
  async create(@Body() input: CreateExecutionDto, @Req() request: AuthenticatedRequest) {
    await this.academic.getSubmissionForUser(input.submissionId, request.user.sub);
    const executionId = randomUUID();
    await this.publisher.publishCodeExecution({
      executionId,
      submissionId: input.submissionId,
      snapshotId: input.snapshotId,
      teacherId: request.user.sub,
      language: input.language,
      command: input.command,
      stdin: input.stdin,
      files: input.files,
    });
    return { executionId, status: 'QUEUED' };
  }

  @Get('submission/:submissionId/folder-structure')
  async folderStructure(@Param('submissionId') submissionId: string, @Req() request: AuthenticatedRequest) {
    const files = await this.snapshotFiles(submissionId, request.user.sub);
    return { message: 'Submission folder structure loaded', data: { folder_structure: this.toTree(files), submissionId } };
  }

  @Get('submission/:submissionId/file')
  async file(@Param('submissionId') submissionId: string, @Query('file_path') filePath: string, @Req() request: AuthenticatedRequest) {
    const file = (await this.snapshotFiles(submissionId, request.user.sub)).find(item => item.path === filePath);
    if (!file) throw new NotFoundException('File not found');
    return { message: 'Submission file loaded', data: { file: { type: 'file', name: file.path.split('/').pop(), path: file.path, content: file.content.split('\n') } } };
  }

  private async snapshotFiles(submissionId: string, userId: string): Promise<SnapshotFile[]> {
    const resource = await this.academic.getSubmissionResource(submissionId, userId);
    const stored = await this.academic.getSubmissionResourceStream(submissionId, userId);
    const chunks: Buffer[] = [];
    for await (const chunk of stored.stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const buffer = Buffer.concat(chunks);
    if (resource.title.toLowerCase().endsWith('.zip') || resource.contentType === 'application/zip') {
      const zip = new AdmZip(buffer);
      return zip.getEntries().filter(entry => !entry.isDirectory && this.safeSnapshotPath(entry.entryName)).map(entry => ({ path: entry.entryName.replace(/\\/g, '/'), content: entry.getData().toString('utf8') }));
    }
    return [{ path: resource.title, content: buffer.toString('utf8') }];
  }

  private safeSnapshotPath(value: string): boolean {
    return !!value && !value.startsWith('/') && !value.split('/').some(part => part === '..' || part === '');
  }

  private toTree(files: SnapshotFile[]): SnapshotNode {
    const root: SnapshotNode = { name: '', type: 'folder', children: [] };
    for (const file of files) {
      let current = root;
      const parts = file.path.split('/');
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const existing = current.children!.find(child => child.name === part);
        if (existing) { current = existing; return; }
        const next: SnapshotNode = { name: part, type: isFile ? 'file' : 'folder', children: isFile ? undefined : [] };
        current.children!.push(next);
        current = next;
      });
    }
    return root;
  }
}
