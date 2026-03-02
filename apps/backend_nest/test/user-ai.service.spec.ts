import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserAiService } from '../src/modules/user-ai/user-ai.service';
import { UserAIKey } from '../src/libs/entities/ai/user-ai-key.entity';
import { CreateUserAIKeyDto } from '../src/libs/dtos/user/create-user-ai-key.dto';
import { UpdateUserAIKeyDto } from '../src/libs/dtos/user/update-user-ai-key.dto';
import { Encryption } from '../src/libs/utils/Encryption';

describe('UserAiService - Detailed Logic and Computation Tests', () => {
    let userAiService: UserAiService;
    let userAIRepoMock: jest.Mocked<Repository<UserAIKey>>;
    let encryptSpy: jest.SpiedFunction<(plainText: string) => string>;
let decryptSpy: jest.SpiedFunction<(data: string) => string>;

    const mockExistingKey: UserAIKey = {
        id: 10,
        userId: 1,
        encryptedKey: 'old_encrypted_key_123',
        model: 'gpt-4',
        apiEndpoint: 'https://api.openai.com',
        label: 'Default Key',
        provider: 'openai',
        isActive: true,
        isValid: false,
    } as UserAIKey;

    const mockCreatedKey: UserAIKey = {
        id: 20,
        userId: 1,
        encryptedKey: 'encrypted_mock_key',
        model: 'gpt-4o',
        apiEndpoint: 'https://api.openai.com',
        label: 'New Key',
        provider: 'openai',
        isActive: true,
        isValid: false,
    } as UserAIKey;

    const mockCreatedKey2: UserAIKey = {
        id: 21,
        userId: 1,
        encryptedKey: 'encrypted_mock_key_2',
        model: 'claude-3',
        apiEndpoint: 'https://api.anthropic.com',
        label: 'Claude Key',
        provider: 'anthropic',
        isActive: true,
        isValid: true,
    } as UserAIKey;

    const mockCreatedKey3: UserAIKey = {
        id: 22,
        userId: 2,
        encryptedKey: 'encrypted_user2_key',
        model: 'gpt-3.5-turbo',
        apiEndpoint: 'https://api.openai.com',
        label: 'User 2 Key',
        provider: 'openai',
        isActive: false,
        isValid: true,
    } as UserAIKey;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAiService,
                {
                    provide: getRepositoryToken(UserAIKey),
                    useValue: {
                        find: jest.fn(),
                        findOne: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();

        userAiService = module.get<UserAiService>(UserAiService);
        userAIRepoMock = module.get(getRepositoryToken(UserAIKey)) as jest.Mocked<Repository<UserAIKey>>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        encryptSpy = jest.spyOn(Encryption, 'encryptKey').mockReturnValue('encrypted_mock_key');
        decryptSpy = jest.spyOn(Encryption, 'decryptKey').mockReturnValue('plain_api_key_123');
    });

    // =====================================================
    // create - DETAILED LOGIC TESTS
    // =====================================================

    describe('create - Detailed Logic and Computation Tests', () => {
        it('USERAI_CREATE_VALID_FULL_001 - creates key with all fields and proper defaults', async () => {
            // Test: Verify complete key creation with all properties
            const dto: CreateUserAIKeyDto = {
                apiKey: 'sk-test-123456',
                model: 'gpt-4o',
                apiEndpoint: 'https://api.openai.com',
                label: 'Full Test Key',
                provider: 'openai',
            };

            userAIRepoMock.create.mockReturnValue(mockCreatedKey);
            userAIRepoMock.save.mockResolvedValue(mockCreatedKey);

            const result = await userAiService.create(1, dto);

            // Verify result structure
            expect(result).toEqual(mockCreatedKey);
            expect(result.id).toBe(20);
            expect(result.userId).toBe(1);
            expect(result.model).toBe('gpt-4o');
            expect(result.provider).toBe('openai');

            // Verify encryption was called
            expect(encryptSpy).toHaveBeenCalledWith('sk-test-123456');
            expect(encryptSpy).toHaveBeenCalledTimes(1);

            // Verify creation with correct mapped fields
            expect(userAIRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 1,
                    encryptedKey: 'encrypted_mock_key',
                    model: 'gpt-4o',
                    apiEndpoint: 'https://api.openai.com',
                    label: 'Full Test Key',
                    provider: 'openai',
                    isActive: true,
                    isValid: false,
                })
            );

            expect(userAIRepoMock.save).toHaveBeenCalledWith(mockCreatedKey);
        });

        it('USERAI_CREATE_VALID_MINIMAL_002 - creates key with only required fields', async () => {
            // Test: Verify minimal creation with optional fields omitted
            const dto: CreateUserAIKeyDto = {
                apiKey: 'sk-minimal',
                provider: 'openai',
            };

            const minimalCreated = {
                id: 23,
                userId: 1,
                encryptedKey: 'encrypted_mock_key',
                provider: 'openai',
                isActive: true,
                isValid: false,
                model: undefined,
                apiEndpoint: undefined,
                label: undefined,
            } as UserAIKey;

            userAIRepoMock.create.mockReturnValue(minimalCreated);
            userAIRepoMock.save.mockResolvedValue(minimalCreated);

            const result = await userAiService.create(1, dto);

            expect(result).toEqual(minimalCreated);
            expect(result.model).toBeUndefined();
            expect(result.label).toBeUndefined();
            expect(result.apiEndpoint).toBeUndefined();

            expect(encryptSpy).toHaveBeenCalledWith('sk-minimal');
            expect(userAIRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 1,
                    encryptedKey: 'encrypted_mock_key',
                    provider: 'openai',
                    isActive: true,
                    isValid: false,
                })
            );
        });

        it('USERAI_CREATE_ENCRYPTION_VERIFICATION_003 - verifies API key is encrypted, not stored plain', async () => {
            // Test: Security check - ensure plaintext never stored
            const dto: CreateUserAIKeyDto = {
                apiKey: 'sk-secret-do-not-leak-12345',
                provider: 'openai',
            };

            userAIRepoMock.create.mockReturnValue(mockCreatedKey);
            userAIRepoMock.save.mockResolvedValue(mockCreatedKey);

            await userAiService.create(1, dto);

            // Verify plaintext key never in create call
            const createCall = userAIRepoMock.create.mock.calls[0][0];
            expect(createCall).not.toHaveProperty('apiKey');
            expect(createCall).toHaveProperty('encryptedKey', 'encrypted_mock_key');

            // Verify encryption was called with original key
            expect(encryptSpy).toHaveBeenCalledWith('sk-secret-do-not-leak-12345');

            // Verify encrypted value is different from original
            expect('encrypted_mock_key').not.toEqual('sk-secret-do-not-leak-12345');
        });

        it('USERAI_CREATE_USERID_MAPPING_004 - correctly maps userId to created entity', async () => {
            // Test: Verify userId is properly transferred to entity
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider: 'openai' };

            userAIRepoMock.create.mockReturnValue({ ...mockCreatedKey, userId: 5 });
            userAIRepoMock.save.mockResolvedValue({ ...mockCreatedKey, userId: 5 });

            await userAiService.create(5, dto);

            expect(userAIRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 5 })
            );
        });

        it('USERAI_CREATE_DEFAULTSTATUS_005 - sets default status flags correctly', async () => {
            // Test: Verify isActive=true and isValid=false defaults
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider: 'openai' };

            userAIRepoMock.create.mockReturnValue(mockCreatedKey);
            userAIRepoMock.save.mockResolvedValue(mockCreatedKey);

            const result = await userAiService.create(1, dto);

            expect(result.isActive).toBe(true);
            expect(result.isValid).toBe(false);

            // Verify defaults set in create
            expect(userAIRepoMock.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                    isValid: false,
                })
            );
        });

        it('USERAI_CREATE_MISSING_USERID_ZERO_006 - throws NotFoundException when userId is 0', async () => {
            // Test: Verify userId validation - 0 is not valid
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider: 'openai' };

            await expect(userAiService.create(0, dto)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            expect(userAIRepoMock.create).not.toHaveBeenCalled();
        });

        it('USERAI_CREATE_MISSING_USERID_UNDEFINED_007 - throws NotFoundException when userId undefined', async () => {
            // Test: Verify userId presence check
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider: 'openai' };

            await expect(userAiService.create(undefined as any, dto)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );
        });

        it('USERAI_CREATE_MISSING_USERID_NEGATIVE_008 - throws NotFoundException for negative userId', async () => {
            // Test: Verify userId must be positive
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider: 'openai' };

            await expect(userAiService.create(-1, dto)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );
        });

        it('USERAI_CREATE_MISSING_DTO_NULL_009 - throws NotFoundException when dto is null', async () => {
            // Test: Verify DTO presence check
            await expect(userAiService.create(1, null as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            expect(userAIRepoMock.create).not.toHaveBeenCalled();
        });

        it('USERAI_CREATE_MISSING_DTO_NOT_OBJECT_010 - throws NotFoundException when dto is not object', async () => {
            // Test: Verify DTO type validation
            await expect(userAiService.create(1, 123 as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            await expect(userAiService.create(1, 'string' as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            await expect(userAiService.create(1, [] as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );
        });

        it('USERAI_CREATE_MISSING_APIKEY_011 - throws NotFoundException when apiKey missing', async () => {
            // Test: Verify apiKey is required
            await expect(userAiService.create(1, {} as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            await expect(userAiService.create(1, { model: 'gpt-4' } as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            expect(encryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_CREATE_APIKEY_EMPTY_STRING_012 - throws NotFoundException for empty apiKey', async () => {
            // Test: Verify apiKey cannot be empty
            await expect(userAiService.create(1, { apiKey: '', provider: 'openai' } as any)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );
        });

        it('USERAI_CREATE_REPO_SAVE_ERROR_013 - throws NotFoundException on save failure', async () => {
            // Test: Verify error handling from database
            const dto: CreateUserAIKeyDto = { apiKey: 'sk-error', provider: 'openai' };

            userAIRepoMock.create.mockReturnValue({} as any);
            userAIRepoMock.save.mockRejectedValue(new Error('DB save failed'));

            await expect(userAiService.create(1, dto)).rejects.toThrow(
                new NotFoundException('Failed to create user AI key')
            );

            expect(encryptSpy).toHaveBeenCalled();
            expect(userAIRepoMock.create).toHaveBeenCalled();
        });

        it('USERAI_CREATE_PROVIDER_VALIDATION_014 - stores provider field when provided', async () => {
            // Test: Verify provider is properly stored
            const providers = ['openai', 'anthropic', 'cohere', 'custom'];

            for (const provider of providers) {
                jest.clearAllMocks();
                encryptSpy = jest.spyOn(Encryption, 'encryptKey').mockReturnValue('encrypted_key');

                const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', provider };
                userAIRepoMock.create.mockReturnValue({ ...mockCreatedKey, provider } as any);
                userAIRepoMock.save.mockResolvedValue({ ...mockCreatedKey, provider } as any);

                await userAiService.create(1, dto);

                expect(userAIRepoMock.create).toHaveBeenCalledWith(
                    expect.objectContaining({ provider })
                );
            }
        });

        it('USERAI_CREATE_MODEL_FIELD_015 - correctly stores model when provided', async () => {
            // Test: Verify model field mapping
            const models = ['gpt-4', 'gpt-4o', 'claude-3', 'command'];

            for (const model of models) {
                jest.clearAllMocks();
                encryptSpy = jest.spyOn(Encryption, 'encryptKey').mockReturnValue('key');

                const dto: CreateUserAIKeyDto = { apiKey: 'sk-123', model, provider: 'openai' };
                userAIRepoMock.create.mockReturnValue({ ...mockCreatedKey, model } as any);
                userAIRepoMock.save.mockResolvedValue({ ...mockCreatedKey, model } as any);

                const result = await userAiService.create(1, dto);

                expect(result.model).toBe(model);
            }
        });
    });

    // =====================================================
    // findAll - DETAILED LOGIC TESTS
    // =====================================================

    describe('findAll - Detailed Logic and Computation Tests', () => {
        it('USERAI_FINDALL_VALID_SINGLE_001 - returns single key for user', async () => {
            // Test: Verify query and result for single key
            userAIRepoMock.find.mockResolvedValue([mockExistingKey]);

            const result = await userAiService.findAll(1);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockExistingKey);
            expect(result[0].userId).toBe(1);

            expect(userAIRepoMock.find).toHaveBeenCalledWith({
                where: { userId: 1 },
            });
        });

        it('USERAI_FINDALL_VALID_MULTIPLE_002 - returns multiple keys for user correctly', async () => {
            // Test: Verify multiple keys ordered correctly
            const keys = [mockExistingKey, mockCreatedKey2];
            userAIRepoMock.find.mockResolvedValue(keys);

            const result = await userAiService.findAll(1);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(10);
            expect(result[1].id).toBe(21);
            expect(result.every((k) => k.userId === 1)).toBe(true);
        });

        it('USERAI_FINDALL_EMPTY_ARRAY_003 - returns empty array when no keys exist', async () => {
            // Test: Verify empty state handling
            userAIRepoMock.find.mockResolvedValue([]);

            const result = await userAiService.findAll(1);

            expect(result).toEqual([]);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('USERAI_FINDALL_USERID_FILTER_004 - filters results by userId correctly', async () => {
            // Test: Verify only user's keys returned, not others
            const allKeys = [mockExistingKey, mockCreatedKey2, mockCreatedKey3];
            const user1Keys = allKeys.filter((k) => k.userId === 1);

            userAIRepoMock.find.mockResolvedValue(user1Keys);

            const result = await userAiService.findAll(1);

            expect(result).toHaveLength(2);
            expect(result.every((k) => k.userId === 1)).toBe(true);
            expect(result.some((k) => k.userId === 2)).toBe(false);

            // Verify correct query parameter
            expect(userAIRepoMock.find).toHaveBeenCalledWith({
                where: { userId: 1 },
            });
        });

        it('USERAI_FINDALL_DIFFERENT_USERS_005 - returns different keys for different users', async () => {
            // Test: Verify user isolation
            userAIRepoMock.find.mockResolvedValueOnce([mockExistingKey, mockCreatedKey2]);

            const result1 = await userAiService.findAll(1);
            expect(result1).toHaveLength(2);

            jest.clearAllMocks();
            userAIRepoMock.find.mockResolvedValue([mockCreatedKey3]);

            const result2 = await userAiService.findAll(2);
            expect(result2).toHaveLength(1);
            expect(result2[0].userId).toBe(2);
        });

        it('USERAI_FINDALL_MISSING_USERID_ZERO_006 - throws NotFoundException when userId is 0', async () => {
            // Test: Verify userId validation
            await expect(userAiService.findAll(0)).rejects.toThrow(
                new NotFoundException('Failed to get user AI keys')
            );

            expect(userAIRepoMock.find).not.toHaveBeenCalled();
        });

        it('USERAI_FINDALL_MISSING_USERID_UNDEFINED_007 - throws NotFoundException for undefined userId', async () => {
            // Test: Verify userId required
            await expect(userAiService.findAll(undefined as any)).rejects.toThrow(
                new NotFoundException('Failed to get user AI keys')
            );
        });

        it('USERAI_FINDALL_REPO_ERROR_008 - throws NotFoundException on repository error', async () => {
            // Test: Verify error handling
            userAIRepoMock.find.mockRejectedValue(new Error('DB connection failed'));

            await expect(userAiService.findAll(1)).rejects.toThrow(
                new NotFoundException('Failed to get user AI keys')
            );
        });

        it('USERAI_FINDALL_LARGE_DATASET_009 - handles large number of keys correctly', async () => {
            // Test: Verify performance with many keys
            const manyKeys = Array.from({ length: 100 }, (_, i) => ({
                ...mockExistingKey,
                id: 1000 + i,
                label: `Key ${i}`,
            }));

            userAIRepoMock.find.mockResolvedValue(manyKeys);

            const result = await userAiService.findAll(1);

            expect(result).toHaveLength(100);
            expect(result[0].id).toBe(1000);
            expect(result[99].id).toBe(1099);
        });
    });

    // =====================================================
    // findOne - DETAILED LOGIC TESTS
    // =====================================================

    describe('findOne - Detailed Logic and Computation Tests', () => {
        it('USERAI_FINDONE_VALID_FOUND_001 - returns key when found with correct params', async () => {
            // Test: Verify successful retrieval with proper filtering
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);

            const result = await userAiService.findOne(1, 10);

            expect(result).toEqual(mockExistingKey);
            expect(result.id).toBe(10);
            expect(result.userId).toBe(1);

            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: 10, userId: 1 },
            });
        });

        it('USERAI_FINDONE_COMPOSITE_KEY_002 - verifies both userId and id in query', async () => {
            // Test: Ensure both filters applied (composite key)
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);

            await userAiService.findOne(1, 10);

            // Verify query has both conditions
            const call = userAIRepoMock.findOne.mock.calls[0][0];
            expect(call.where).toHaveProperty('userId', 1);
            expect(call.where).toHaveProperty('id', 10);
        });

        it('USERAI_FINDONE_USERID_ZERO_003 - throws when userId is 0', async () => {
            // Test: Verify userId validation
            await expect(userAiService.findOne(0, 10)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
        });

        it('USERAI_FINDONE_ID_ZERO_004 - throws when id is 0', async () => {
            // Test: Verify id validation
            await expect(userAiService.findOne(1, 0)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
        });

        it('USERAI_FINDONE_BOTH_MISSING_005 - throws when both userId and id invalid', async () => {
            // Test: Verify both parameters required
            await expect(userAiService.findOne(0, 0)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );
        });

        it('USERAI_FINDONE_NOT_FOUND_006 - throws NotFoundException when key does not exist', async () => {
            // Test: Verify null check
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.findOne(1, 999)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );

            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: 999, userId: 1 },
            });
        });

        it('USERAI_FINDONE_WRONG_USER_007 - throws when key exists but belongs to different user', async () => {
            // Test: Verify user isolation - querying another user's key fails
            userAIRepoMock.findOne.mockResolvedValue(null);

            // User 1 tries to get User 2's key
            await expect(userAiService.findOne(1, mockCreatedKey3.id)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );

            // Verify query had correct composite filter
            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: mockCreatedKey3.id, userId: 1 },
            });
        });

        it('USERAI_FINDONE_REPO_ERROR_008 - throws NotFoundException on repository error', async () => {
            // Test: Verify error handling
            userAIRepoMock.findOne.mockRejectedValue(new Error('DB error'));

            await expect(userAiService.findOne(1, 10)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );
        });

        it('USERAI_FINDONE_NEGATIVE_ID_009 - throws when id is negative', async () => {
            // Test: Verify id must be positive
            await expect(userAiService.findOne(1, -1)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );
        });

        it('USERAI_FINDONE_NEGATIVE_USERID_010 - throws when userId is negative', async () => {
            // Test: Verify userId must be positive
            await expect(userAiService.findOne(-1, 10)).rejects.toThrow(
                new NotFoundException('Failed to get user AI key')
            );
        });
    });

    // =====================================================
    // update - DETAILED LOGIC TESTS
    // =====================================================

    describe('update - Detailed Logic and Computation Tests', () => {
        it('USERAI_UPDATE_VALID_NOAPIKEY_001 - updates non-key fields without encryption', async () => {
            // Test: Verify fields updated without touching API key
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = { ...mockExistingKey, model: 'claude-3', isActive: false };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = { model: 'claude-3', isActive: false };
            const result = await userAiService.update(1, 10, dto);

            expect(result).toEqual(updatedKey);
            expect(result.model).toBe('claude-3');
            expect(result.isActive).toBe(false);
            expect(result.encryptedKey).toBe('old_encrypted_key_123'); // Unchanged

            // Verify encryption NOT called when no apiKey
            expect(encryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_UPDATE_VALID_WITHAPIKEY_002 - re-encrypts and updates other fields', async () => {
            // Test: Verify API key re-encrypted when provided
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = {
                ...mockExistingKey,
                encryptedKey: 'encrypted_mock_key',
                label: 'Updated Label',
            };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = { apiKey: 'new-sk-456789', label: 'Updated Label' };
            const result = await userAiService.update(1, 10, dto);

            expect(result.encryptedKey).toBe('encrypted_mock_key');
            expect(result.label).toBe('Updated Label');

            // Verify encryption was called with new key
            expect(encryptSpy).toHaveBeenCalledWith('new-sk-456789');

            // Verify save was called with updated encrypted value
            expect(userAIRepoMock.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    encryptedKey: 'encrypted_mock_key',
                    label: 'Updated Label',
                })
            );
        });

        it('USERAI_UPDATE_APIKEY_ONLY_003 - updates only API key, preserves other fields', async () => {
            // Test: Verify selective API key update
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = {
                ...mockExistingKey,
                encryptedKey: 'encrypted_new_key',
            };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = { apiKey: 'new-sk-only' };
            const result = await userAiService.update(1, 10, dto);

            expect(result.model).toBe('gpt-4'); // Preserved
            expect(result.label).toBe('Default Key'); // Preserved
            expect(result.encryptedKey).toBe('encrypted_new_key'); // Updated

            expect(encryptSpy).toHaveBeenCalledWith('new-sk-only');
        });

        it('USERAI_UPDATE_LABEL_ONLY_004 - updates only label without encryption', async () => {
            // Test: Verify single field update
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = { ...mockExistingKey, label: 'New Label' };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = { label: 'New Label' };
            const result = await userAiService.update(1, 10, dto);

            expect(result.label).toBe('New Label');
            expect(result.encryptedKey).toBe('old_encrypted_key_123'); // Unchanged
            expect(encryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_UPDATE_MISSING_USERID_ZERO_005 - throws when userId is 0', async () => {
            // Test: Verify userId validation
            await expect(userAiService.update(0, 10, {} as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
        });

        it('USERAI_UPDATE_MISSING_ID_ZERO_006 - throws when id is 0', async () => {
            // Test: Verify id validation
            await expect(userAiService.update(1, 0, {} as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
        });

        it('USERAI_UPDATE_MISSING_DTO_NULL_007 - throws when dto is null', async () => {
            // Test: Verify DTO required
            await expect(userAiService.update(1, 10, null as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );
        });

        it('USERAI_UPDATE_MISSING_DTO_NOT_OBJECT_008 - throws when dto is not object', async () => {
            // Test: Verify DTO type validation
            await expect(userAiService.update(1, 10, 123 as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );

            await expect(userAiService.update(1, 10, 'string' as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );
        });

        it('USERAI_UPDATE_EMPTY_DTO_009 - throws when dto is empty object', async () => {
            // Test: Verify DTO is not empty
            await expect(userAiService.update(1, 10, {} as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );
        });

        it('USERAI_UPDATE_KEY_NOT_FOUND_010 - throws when key does not exist', async () => {
            // Test: Verify key exists before update
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.update(1, 999, { label: 'x' } as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );

            expect(userAIRepoMock.save).not.toHaveBeenCalled();
        });

        it('USERAI_UPDATE_WRONG_USER_KEY_011 - throws when key belongs to different user', async () => {
            // Test: Verify user isolation
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.update(1, mockCreatedKey3.id, { label: 'hack' } as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );

            // Verify query included userId filter
            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: mockCreatedKey3.id, userId: 1 },
            });
        });

        it('USERAI_UPDATE_REPO_ERROR_012 - throws NotFoundException on save failure', async () => {
            // Test: Verify error handling
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            userAIRepoMock.save.mockRejectedValue(new Error('DB error'));

            await expect(userAiService.update(1, 10, { label: 'x' } as any)).rejects.toThrow(
                new NotFoundException('Failed to update user AI key')
            );
        });

        it('USERAI_UPDATE_MULTIPLE_FIELDS_013 - updates multiple fields at once', async () => {
            // Test: Verify batch update
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = {
                ...mockExistingKey,
                encryptedKey: 'encrypted_new',
                model: 'claude-3',
                label: 'Multi Update',
                isActive: false,
            };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = {
                apiKey: 'new-key',
                model: 'claude-3',
                label: 'Multi Update',
                isActive: false,
            };

            const result = await userAiService.update(1, 10, dto);

            expect(result.encryptedKey).toBe('encrypted_new');
            expect(result.model).toBe('claude-3');
            expect(result.label).toBe('Multi Update');
            expect(result.isActive).toBe(false);

            expect(encryptSpy).toHaveBeenCalledWith('new-key');
        });

        it('USERAI_UPDATE_BOOLEAN_FLAGS_014 - correctly updates boolean flags', async () => {
            // Test: Verify boolean field updates
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            const updatedKey = { ...mockExistingKey, isActive: false, isValid: true };
            userAIRepoMock.save.mockResolvedValue(updatedKey);

            const dto: UpdateUserAIKeyDto = { isActive: false, isValid: true };
            const result = await userAiService.update(1, 10, dto);

            expect(result.isActive).toBe(false);
            expect(result.isValid).toBe(true);
        });
    });

    // =====================================================
    // remove - DETAILED LOGIC TESTS
    // =====================================================

    describe('remove - Detailed Logic and Computation Tests', () => {
        it('USERAI_REMOVE_VALID_001 - removes existing key successfully', async () => {
            // Test: Verify successful deletion
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            userAIRepoMock.remove.mockResolvedValue(undefined as any);

            await userAiService.remove(1, 10);

            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: 10, userId: 1 },
            });

            expect(userAIRepoMock.remove).toHaveBeenCalledWith(mockExistingKey);
        });

        it('USERAI_REMOVE_COMPOSITE_KEY_002 - verifies both userId and id in deletion', async () => {
            // Test: Ensure correct record is deleted
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            userAIRepoMock.remove.mockResolvedValue(undefined as any);

            await userAiService.remove(1, 10);

            // Verify query had composite filter
            const call = userAIRepoMock.findOne.mock.calls[0][0];
            expect(call.where).toHaveProperty('userId', 1);
            expect(call.where).toHaveProperty('id', 10);
        });

        it('USERAI_REMOVE_MISSING_USERID_ZERO_003 - throws when userId is 0', async () => {
            // Test: Verify userId validation
            await expect(userAiService.remove(0, 10)).rejects.toThrow(
                new NotFoundException('Failed to remove user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
            expect(userAIRepoMock.remove).not.toHaveBeenCalled();
        });

        it('USERAI_REMOVE_MISSING_ID_ZERO_004 - throws when id is 0', async () => {
            // Test: Verify id validation
            await expect(userAiService.remove(1, 0)).rejects.toThrow(
                new NotFoundException('Failed to remove user AI key')
            );

            expect(userAIRepoMock.remove).not.toHaveBeenCalled();
        });

        it('USERAI_REMOVE_NOT_FOUND_005 - throws when key does not exist', async () => {
            // Test: Verify key exists before deletion
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.remove(1, 999)).rejects.toThrow(
                new NotFoundException('Failed to remove user AI key')
            );

            expect(userAIRepoMock.remove).not.toHaveBeenCalled();
        });

        it('USERAI_REMOVE_WRONG_USER_006 - throws when key belongs to different user', async () => {
            // Test: Verify user isolation - cannot delete other user's keys
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.remove(1, mockCreatedKey3.id)).rejects.toThrow(
                new NotFoundException('Failed to remove user AI key')
            );

            expect(userAIRepoMock.remove).not.toHaveBeenCalled();
        });

        it('USERAI_REMOVE_REPO_ERROR_007 - throws on repository error', async () => {
            // Test: Verify error handling
            userAIRepoMock.findOne.mockRejectedValue(new Error('DB error'));

            await expect(userAiService.remove(1, 10)).rejects.toThrow(
                new NotFoundException('Failed to remove user AI key')
            );
        });

        it('USERAI_REMOVE_CONSECUTIVE_REMOVALS_008 - can remove multiple keys in sequence', async () => {
            // Test: Verify repeated removals work
            const keys = [mockExistingKey, mockCreatedKey];

            for (const key of keys) {
                jest.clearAllMocks();
                userAIRepoMock.findOne.mockResolvedValue(key);
                userAIRepoMock.remove.mockResolvedValue(undefined as any);

                await userAiService.remove(1, key.id);

                expect(userAIRepoMock.remove).toHaveBeenCalledWith(key);
            }
        });
    });

    // =====================================================
    // getDecryptedKey - DETAILED LOGIC TESTS
    // =====================================================

    describe('getDecryptedKey - Detailed Logic and Computation Tests', () => {
        it('USERAI_GETDECRYPTED_VALID_001 - decrypts and returns key correctly', async () => {
            // Test: Verify successful decryption flow
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);

            const result = await userAiService.getDecryptedKey(1, 10);

            expect(result).toEqual('plain_api_key_123');
            expect(userAIRepoMock.findOne).toHaveBeenCalledWith({
                where: { id: 10, userId: 1 },
            });
            expect(decryptSpy).toHaveBeenCalledWith('old_encrypted_key_123');
        });

        it('USERAI_GETDECRYPTED_ENCRYPTION_WORKFLOW_002 - verifies encrypted key is decrypted, not returned raw', async () => {
            // Test: Security check - never return encrypted key
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);

            const result = await userAiService.getDecryptedKey(1, 10);

            // Verify plaintext returned, not encrypted
            expect(result).toBe('plain_api_key_123');
            expect(result).not.toBe('old_encrypted_key_123');

            // Verify decryption was called
            expect(decryptSpy).toHaveBeenCalledWith(mockExistingKey.encryptedKey);
        });

        it('USERAI_GETDECRYPTED_COMPOSITE_KEY_003 - uses both userId and id for query', async () => {
            // Test: Verify composite key filtering
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);

            await userAiService.getDecryptedKey(1, 10);

            // Verify query had both filters
            const call = userAIRepoMock.findOne.mock.calls[0][0];
            expect(call.where).toHaveProperty('userId', 1);
            expect(call.where).toHaveProperty('id', 10);
        });

        it('USERAI_GETDECRYPTED_MISSING_USERID_ZERO_004 - throws when userId is 0', async () => {
            // Test: Verify userId validation
            await expect(userAiService.getDecryptedKey(0, 10)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );

            expect(userAIRepoMock.findOne).not.toHaveBeenCalled();
            expect(decryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_GETDECRYPTED_MISSING_ID_ZERO_005 - throws when id is 0', async () => {
            // Test: Verify id validation
            await expect(userAiService.getDecryptedKey(1, 0)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );
        });

        it('USERAI_GETDECRYPTED_NOT_FOUND_006 - throws when key does not exist', async () => {
            // Test: Verify key exists before decryption
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.getDecryptedKey(1, 999)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );

            expect(decryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_GETDECRYPTED_WRONG_USER_007 - throws when key belongs to different user', async () => {
            // Test: Verify user isolation
            userAIRepoMock.findOne.mockResolvedValue(null);

            await expect(userAiService.getDecryptedKey(1, mockCreatedKey3.id)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );

            expect(decryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_GETDECRYPTED_DECRYPT_ERROR_008 - throws on decryption failure', async () => {
            // Test: Verify error handling in decryption
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            decryptSpy.mockImplementation(() => {
                throw new Error('Decryption failed');
            });

            await expect(userAiService.getDecryptedKey(1, 10)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );
        });

        it('USERAI_GETDECRYPTED_REPO_ERROR_009 - throws on repository error', async () => {
            // Test: Verify repository error handling
            userAIRepoMock.findOne.mockRejectedValue(new Error('DB error'));

            await expect(userAiService.getDecryptedKey(1, 10)).rejects.toThrow(
                new NotFoundException('Failed to decrypt user AI key')
            );

            expect(decryptSpy).not.toHaveBeenCalled();
        });

        it('USERAI_GETDECRYPTED_DIFFERENT_KEYS_010 - returns different plaintext for different encrypted keys', async () => {
            // Test: Verify decryption correctness
            const key1 = { ...mockExistingKey, encryptedKey: 'enc_key_1' };
            const key2 = { ...mockExistingKey, id: 11, encryptedKey: 'enc_key_2' };

            // Setup different returns
            userAIRepoMock.findOne.mockResolvedValueOnce(key1);
            decryptSpy.mockReturnValueOnce('plain_key_1');

            const result1 = await userAiService.getDecryptedKey(1, 10);
            expect(result1).toBe('plain_key_1');

            jest.clearAllMocks();
            userAIRepoMock.findOne.mockResolvedValue(key2);
            decryptSpy.mockReturnValueOnce('plain_key_2');

            const result2 = await userAiService.getDecryptedKey(1, 11);
            expect(result2).toBe('plain_key_2');

            expect(result1).not.toBe(result2);
        });

        it('USERAI_GETDECRYPTED_MULTIPLE_CALLS_011 - handles multiple decryption calls', async () => {
            // Test: Verify repeated calls work correctly
            userAIRepoMock.findOne.mockResolvedValue(mockExistingKey);
            decryptSpy.mockReturnValue('plain_api_key_123');

            const result1 = await userAiService.getDecryptedKey(1, 10);
            const result2 = await userAiService.getDecryptedKey(1, 10);

            expect(result1).toBe('plain_api_key_123');
            expect(result2).toBe('plain_api_key_123');
            expect(decryptSpy).toHaveBeenCalledTimes(2);
        });
    });
});