import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { R2Service } from '../../services/r2.service';
import { ResourceType } from '../../libs/enums/Resource';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../../libs/entities/resource/resource.entity';
import { Readable } from 'stream';
import { CloudinaryService } from '../../services/cloudinary.service';
import { SubmissionService } from '../assessment/submission.service';
import { AssessmentService } from '../assessment/assessment.service';

@Injectable()
export class FileService {
  constructor(
    private readonly r2Service: R2Service,
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly submissionService: SubmissionService,
    private readonly assessmentService: AssessmentService,
  ) { }

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
      const key = `${userId}/${parentType}/${parentId}/${safeName}`;
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
      const exists = await this.r2Service.objectExists(key);
      if (!exists) throw new NotFoundException('File not found in storage');
      const type = getResourceTypeFromFilename(filename);
      const resource = this.resourceRepo.create({
        title: filename,
        type,
        url: key,
        owner: `${userId}`,
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
      const { stream, contentType } = await this.r2Service.streamFile(resource.url);
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

  // Dummy permission check — implement your logic
  async canAccess(userId: number, resource: Resource): Promise<boolean> {
    resource.owner = resource.owner.trim();
    if (resource.owner === `${userId}`) return true;
    if (resource.url.includes('/submission/')) {
      const submissionId = parseInt(resource.url.split('/submission/')[1].split('/')[0]);
      return await this.submissionService.isSubmissionAccessibleByUser(submissionId, userId);
    } else if (resource.url.includes('/assessment/')) {
      const assessmentId = parseInt(resource.url.split('/assessment/')[1].split('/')[0]);
      return await this.assessmentService.isAssessmentAccessibleByUser(assessmentId, userId);
    } else {
      return false;
    }
  }
}
function getResourceTypeFromFilename(filename: string): ResourceType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return ResourceType.IMAGE;
  if (['mp4', 'mov', 'avi'].includes(ext)) return ResourceType.VIDEO;
  if (['pdf', 'doc', 'docx', 'txt', 'java', 'js', 'py'].includes(ext)) return ResourceType.DOCUMENT;
  return ResourceType.FILE;
}
