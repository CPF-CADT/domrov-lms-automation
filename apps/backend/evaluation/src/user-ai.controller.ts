import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { logger } from './logging';
import { UserAiKey } from './user-ai.entity';
import { UserAiJwtGuard } from './user-ai.guard';

const PROVIDERS = [
  { provider: 'openai', description: 'OpenAI-compatible models' },
  { provider: 'gemini', description: 'Google Gemini models' },
  { provider: 'openrouter', description: 'OpenRouter models' },
  { provider: 'ollama', description: 'Local Ollama models' },
  { provider: 'grok', description: 'xAI Grok models' },
  { provider: 'custom', description: 'Custom OpenAI-compatible endpoint' },
];

type AuthenticatedRequest = { user?: { sub?: string } };

@Controller('user-ai')
@UseGuards(UserAiJwtGuard)
export class UserAiController {
  constructor(@InjectRepository(UserAiKey) private readonly keys: Repository<UserAiKey>) {}

  @Get('providers') providers() { return PROVIDERS; }

  @Get()
  async list(@Req() request: AuthenticatedRequest) { return (await this.keys.find({ where: { userId: this.userId(request) }, order: { createdAt: 'DESC' } })).map((key) => this.publicKey(key)); }

  @Get(':id')
  async get(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) { return this.publicKey(await this.findOwned(request, id)); }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() input: { provider: string; model: string; apiKey: string; label: string; apiEndpoint?: string }) {
    if (!input.provider || !input.model || !input.apiKey || !input.label) throw new BadRequestException('provider, model, apiKey, and label are required');
    const key = this.keys.create({ ...input, userId: this.userId(request), isActive: true, isValid: false });
    const saved = await this.keys.save(key);
    logger.info('evaluation.credential_changed', 'AI credential created', { operation: 'create' });
    return this.publicKey(saved);
  }

  @Patch(':id')
  async update(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: Partial<{ provider: string; model: string; apiKey: string; label: string; apiEndpoint: string; isActive: boolean }>) {
    const key = await this.findOwned(request, id);
    Object.assign(key, input);
    if (input.apiKey) key.isValid = false;
    const saved = await this.keys.save(key);
    logger.info('evaluation.credential_changed', 'AI credential updated', { operation: 'update' });
    return this.publicKey(saved);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    await this.keys.remove(await this.findOwned(request, id));
    logger.info('evaluation.credential_changed', 'AI credential deleted', { operation: 'delete' });
    return { message: 'AI key deleted successfully' };
  }

  private userId(request: AuthenticatedRequest) { if (!request.user?.sub) throw new Error('Authenticated user is missing'); return String(request.user.sub); }
  private async findOwned(request: AuthenticatedRequest, id: number) {
    const key = await this.keys.findOne({ where: { id, userId: this.userId(request) } });
    if (!key) throw new NotFoundException('AI key not found');
    return key;
  }
  private publicKey(key: UserAiKey) { const { apiKey: _secret, ...safe } = key; return safe; }
}
