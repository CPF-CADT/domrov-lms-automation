import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { R2Service } from '../../services/r2.service';
import { ResourceType } from '../../libs/enums/Resource';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../../libs/entities/resource/resource.entity';
import { Readable } from 'stream';
import { CloudinaryService } from '../../services/cloudinary.service';
import { SubmissionService } from '../assessment/submission.service';
import { AssessmentService } from '../assessment/assessment.service';
import { SubmissionType } from '../../libs/enums/Assessment';
import { LocalStorageService } from '../../services/local-storage.service';
import { ClassPermissionService, AssessmentPermissionService } from '../../common/security';
import { createHash } from 'crypto';
import { MAX_FILE_SIZE } from '../../libs/const/system';

export type FileParentType = 'module' | 'topic' | 'assessment' | 'class' | 'submission';

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  mp4: ['video/mp4'],
  mov: ['video/quicktime'],
  avi: ['video/x-msvideo', 'video/avi'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/octet-stream'],
  java: ['text/plain', 'text/x-java-source'],
  js: ['text/javascript', 'application/javascript', 'text/plain'],
  py: ['text/plain', 'text/x-python'],
};

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  constructor(
    private readonly r2Service: R2Service,
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly submissionService: SubmissionService,
    private readonly assessmentService: AssessmentService,
    private readonly localStorageService: LocalStorageService,
    private readonly classPermissionService: ClassPermissionService,
    private readonly assessmentPermissionService: AssessmentPermissionService,
  ) { }

  async uploadFile(
    userId: number,
    file: Express.Multer.File,
    parentType: FileParentType,
    parentId: number,
  ) {
    if (!userId) throw new NotFoundException('User ID is required');
    if (!file) throw new BadRequestException('File is required');
    if (!parentType || !Number.isInteger(Number(parentId)) || Number(parentId) <= 0) {
      throw new BadRequestException('Parent type and ID are required');
    }

    await this.assertParentAccess(userId, parentType, Number(parentId));
    const { originalFilename, safeFilename, contentType, extension } = this.validateFile(file);
    const key = await this.buildStorageKey(userId, parentType, Number(parentId), safeFilename);
    const size = file.size ?? file.buffer?.length ?? 0;
    if (size > MAX_FILE_SIZE) throw new BadRequestException(`File exceeds the ${MAX_FILE_SIZE} byte limit`);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.localStorageService.assertCapacity(size);
    await this.localStorageService.saveFile(key, Readable.from(file.buffer));

    let resource = await this.resourceRepo.findOne({ where: { url: key } });
    const resourceData = {
      title: originalFilename,
      type: getResourceTypeFromExtension(extension),
      url: key,
      owner: `${userId}`,
      storageProvider: 'local',
      contentType,
      size,
      checksum,
    };

    if (resource) {
      Object.assign(resource, resourceData);
    } else {
      resource = this.resourceRepo.create(resourceData);
    }
    resource = await this.resourceRepo.save(resource);
    this.logger.log(JSON.stringify({ event: 'upload', resourceId: resource.id, provider: 'local', key }));

    return {
      resourceId: resource.id,
      key,
      originalFilename,
      contentType,
      size,
      checksum,
    };
  }

  private async assertParentAccess(userId: number, parentType: FileParentType, parentId: number): Promise<void> {
    if (parentType === 'class') {
      if (!(await this.classPermissionService.isInstructorOfClass(userId, parentId))) {
        throw new ForbiddenException('You do not have permission to upload to this class');
      }
      return;
    }

    if (parentType === 'assessment') {
      if (!(await this.assessmentPermissionService.isInstructorOfAssessmentClass(userId, parentId))) {
        throw new ForbiddenException('You do not have permission to upload to this assessment');
      }
      return;
    }

    if (parentType === 'submission') {
      const submission = await this.submissionService.getAssessmentBySubmissionId(parentId);
      if (submission.userId === userId || await this.submissionService.isSubmissionAccessibleByUser(parentId, userId)) {
        return;
      }
      throw new ForbiddenException('You do not have permission to upload to this submission');
    }

    throw new BadRequestException(`Unsupported upload parent type: ${parentType}`);
  }

  private async buildStorageKey(
    userId: number,
    parentType: FileParentType,
    parentId: number,
    safeFilename: string,
  ): Promise<string> {
    if (parentType !== 'submission') return `${userId}/${parentType}/${parentId}/${safeFilename}`;

    const submission = await this.submissionService.getAssessmentBySubmissionId(parentId);
    if (submission.assessment.submissionType === SubmissionType.TEAM) {
      if (!submission.teamId) throw new BadRequestException('Team submission is missing a team');
      return `Team${submission.teamId}/${parentType}/${parentId}/${safeFilename}`;
    }
    return `${userId}/${parentType}/${parentId}/${safeFilename}`;
  }

  private validateFile(file: Express.Multer.File): {
    originalFilename: string;
    safeFilename: string;
    contentType: string;
    extension: string;
  } {
    const originalFilename = file.originalname?.trim();
    if (!originalFilename || originalFilename.includes('\0') || /[\\/]/.test(originalFilename)) {
      throw new BadRequestException('Invalid filename');
    }

    const extension = originalFilename.split('.').pop()?.toLowerCase() || '';
    const allowedMimeTypes = ALLOWED_MIME_TYPES[extension];
    const contentType = file.mimetype?.toLowerCase();
    if (!allowedMimeTypes || !contentType || !allowedMimeTypes.includes(contentType)) {
      throw new BadRequestException('File extension and MIME type are not allowed to be used together');
    }

    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
      throw new BadRequestException('Invalid filename');
    }
    return { originalFilename, safeFilename, contentType, extension };
  }

  async generatePresignedUrl(
    userId: number,
    parentType: 'module' | 'topic' | 'assessment' | 'class' | 'submission',
    parentId: number,
    filename: string,
    contentType: string,
  ) {
    try {
      if (!userId) throw new NotFoundException('User ID is required');
      if (!parentType || !parentId) throw new NotFoundException('Parent type and ID are required');
      if (!filename || !contentType) throw new NotFoundException('Filename and content type are required');
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      let key = `${userId}/${parentType}/${parentId}/${safeName}`;
      if (parentType === 'submission') {
        const submission = await this.submissionService.getAssessmentBySubmissionId(parentId);
        if (!submission) throw new NotFoundException('Associated submission not found');
        if (submission.assessment.submissionType === SubmissionType.TEAM) {
          key = `Team${submission.teamId}/${parentType}/${parentId}/${safeName}`;
        }
      }

      const { uploadUrl } = await this.r2Service.getUploadUrl(key, contentType);
      return { presignedUrl: uploadUrl, key };
    } catch (err: any) {
      console.error('Error generating presigned URL:', err);
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Failed to generate presigned URL: ${err.message}`);
    }
  }

  async getPresignedUrlForCloudinary() {
    try {
      return await this.cloudinaryService.getPresignedUrl();
    } catch (err: any) {
      throw new NotFoundException('Failed to generate Cloudinary presigned URL');
    }
  }



  async notifyUploadSuccess(
    userId: number,
    key: string,
    filename: string,
  ) {
    try {
      if (!userId) throw new NotFoundException('User ID is required');
      if (!key || !filename) throw new NotFoundException('Key and filename are required');
      const isExternalUrl = /^https?:\/\//i.test(key);
      if (!isExternalUrl) {
        const exists = await this.r2Service.objectExists(key);
        if (!exists) throw new NotFoundException('File not found in storage');
      }
      const type = isExternalUrl ? ResourceType.URL : getResourceTypeFromFilename(filename);
      const resource = this.resourceRepo.create({
        title: filename,
        type,
        url: key,
        owner: `${userId}`,
        storageProvider: isExternalUrl ? 'external' : null,
        contentType: isExternalUrl ? 'text/uri-list' : null,
      });
      await this.resourceRepo.save(resource);
      return { message: 'Resource saved successfully', resourceId: resource.id };
    } catch (err: any) {
      console.error('Error notifying upload success:', err);
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Failed to notify upload success: ${err.message}`);
    }
  }

  async getResourceStream(userId: number, resourceId: number): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
  }> {
    try {
      if (!userId || !resourceId) throw new NotFoundException('User ID and resource ID are required');
      const resource = await this.resourceRepo.findOne({ where: { id: resourceId } });
      if (!resource) throw new NotFoundException('Resource not found');
      const canAccess = await this.canAccess(userId, resource);
      if (resource.owner !== `${userId}` && !canAccess) {
        throw new ForbiddenException('Unauthorized');
      }
      this.logger.log(JSON.stringify({ event: 'download', resourceId, provider: resource.storageProvider || 'legacy' }));
      if (resource.type === ResourceType.URL || resource.storageProvider === 'external') {
        throw new NotFoundException('External resources cannot be downloaded as files');
      }

      let stream: Readable;
      let contentType = resource.contentType || 'application/octet-stream';
      if (resource.storageProvider === 'local') {
        if (!(await this.localStorageService.fileExists(resource.url))) {
          throw new NotFoundException('File not found in local storage');
        }
        stream = this.localStorageService.readFile(resource.url);
      } else if (resource.storageProvider === 'r2') {
        const r2File = await this.r2Service.streamFile(resource.url);
        stream = r2File.stream;
        contentType = r2File.contentType;
      } else {
        throw new NotFoundException('Resource storage provider is not supported');
      }
      return {
        stream,
        filename: resource.title.trim(),
        contentType,
      };
    } catch (err: any) {
      console.error('Error getting resource stream:', err);
      if (err instanceof ForbiddenException || err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Failed to get resource stream: ${err.message}`);
    }
  }

  async getSubmissionDownloadStream(userId: number, submissionId: number): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
  }> {
    const classId = await this.submissionService.getSubmissionClassId(submissionId);
    if (!classId || !(await this.classPermissionService.isInstructorOfClass(userId, classId))) {
      throw new ForbiddenException('Only instructors can download submitted files');
    }

    const resource = await this.submissionService.getSubmissionDownloadResource(submissionId);
    return this.getResourceStream(userId, resource.id);
  }

  // Dummy permission check — implement your logic
  async canAccess(userId: number, resource: Resource): Promise<boolean> {
    resource.owner = resource.owner.trim();
    if (resource.owner === `${userId}`) return true;
    if (resource.url.includes('/submission/')) {
      const submissionId = parseInt(resource.url.split('/submission/')[1].split('/')[0]);
      const classId = await this.submissionService.getSubmissionClassId(submissionId);
      const isInstructor = classId
        ? await this.classPermissionService.isInstructorOfClass(userId, classId)
        : false;
      return isInstructor || await this.submissionService.isSubmissionAccessibleByUser(submissionId, userId);
    } else if (resource.url.includes('/assessment/')) {
      const assessmentId = parseInt(resource.url.split('/assessment/')[1].split('/')[0]);
      return await this.assessmentService.isAssessmentAccessibleByUser(assessmentId, userId);
    } else {
      return false;
    }
  }
}
function getResourceTypeFromExtension(extension: string): ResourceType {
  if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return ResourceType.IMAGE;
  if (['mp4', 'mov', 'avi'].includes(extension)) return ResourceType.VIDEO;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'java', 'js', 'py'].includes(extension)) return ResourceType.DOCUMENT;
  return ResourceType.FILE;
}

function getResourceTypeFromFilename(filename: string): ResourceType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return ResourceType.IMAGE;
  if (['mp4', 'mov', 'avi'].includes(ext)) return ResourceType.VIDEO;
  if (['pdf', 'doc', 'docx', 'txt', 'java', 'js', 'py'].includes(ext)) return ResourceType.DOCUMENT;
  return ResourceType.FILE;
}
