import { Test, TestingModule } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, it, jest, afterEach } from '@jest/globals';
import { Repository, ILike, UpdateResult } from 'typeorm';
import { User } from '../src/libs/entities/user/user.entity';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Encryption } from '../src/libs/utils/Encryption';
import {
    UpdateProfileDto,
    ChangePasswordDto,
    UserProfileResponseDto,
    UserListItemDto,
} from '../src/libs/dtos/user/user.dto';
import { UpdateUserDTO } from '../src/libs/dtos/update.user.dto';
import { UserService } from '../src/modules/user/user.service';
import { UserStatus } from '../src/libs/enums/Status';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OAuthAccount } from '../src/libs/entities/user/oauth-account.entity';
import { OAuthProvider } from '../src/libs/entities/user/oauth-provider.entity';

describe('UserService - Detailed Computation & Logic Tests', () => {
    let service: UserService;
    let userRepo: jest.Mocked<Repository<User>>;
    let oauthAccountRepo: jest.Mocked<Repository<OAuthAccount>>;
    let oauthProviderRepo: jest.Mocked<Repository<OAuthProvider>>;

    const mockUser: User = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        gender: 'male',
        dob: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        profilePictureUrl: 'https://example.com/pic.jpg',
        isVerified: true,
        isTwoFactorEnable: false,
        status: UserStatus.ACTIVE,
        password: '$2b$10$hashedpassword',
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-06-01'),
        aiKeys: [],
        classes: [],
        enrollments: [],
        leadTeams: [],
        teamMemberships: [],
        oauthAccounts: [],
        telegramChats: [],
        usageLogs: [],
        creditBalance: undefined,
        payments: [],
        submissions: [],
        refreshTokens: [],
        emailOtps: undefined,
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: {
                        findOne: jest.fn(),
                        find: jest.fn(),
                        save: jest.fn(),
                        update: jest.fn(),
                        create: jest.fn(),
                        count: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(OAuthAccount),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(OAuthProvider),
                    useValue: {
                        findOne: jest.fn(),
                        save: jest.fn(),
                        create: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        userRepo = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
        oauthAccountRepo = module.get(
            getRepositoryToken(OAuthAccount)
        ) as jest.Mocked<Repository<OAuthAccount>>;
        oauthProviderRepo = module.get(
            getRepositoryToken(OAuthProvider)
        ) as jest.Mocked<Repository<OAuthProvider>>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // =====================================================
    // getMyProfile - Detailed Logic Tests
    // =====================================================
    describe('getMyProfile - Detailed Tests', () => {
        describe('Input Validation Logic', () => {
            it('should reject ID value of 0', async () => {
                await expect(service.getMyProfile(0)).rejects.toThrow(BadRequestException);
                expect(userRepo.findOne).not.toHaveBeenCalled();
            });

            it('should reject negative ID values', async () => {
                await expect(service.getMyProfile(-1)).rejects.toThrow(BadRequestException);
                expect(userRepo.findOne).not.toHaveBeenCalled();
            });

            it('should reject non-integer ID values', async () => {
                const invalidIds = [NaN, Infinity, -Infinity];
                for (const id of invalidIds) {
                    await expect(service.getMyProfile(id)).rejects.toThrow(BadRequestException);
                }
            });

            it('should accept valid positive integer IDs', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const profile = await service.getMyProfile(1);
                expect(profile).toEqual(mockUser);
                expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            });
        });

        describe('Query Construction Logic', () => {
            it('should construct correct WHERE clause with user ID', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                await service.getMyProfile(42);
                expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 42 } });
                expect(userRepo.findOne).toHaveBeenCalledTimes(1);
            });

            it('should pass exact ID to query without modification', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const testId = 999;
                await service.getMyProfile(testId);
                const callArgs = userRepo.findOne.mock.calls[0][0] as any;
                expect(callArgs.where.id).toBe(testId);
            });
        });

        describe('Response Handling Logic', () => {
            it('should return user object when found', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const result = await service.getMyProfile(1);
                expect(result).toEqual(mockUser);
            });

            it('should preserve all user properties in response', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const result = await service.getMyProfile(1);
                expect(result.id).toBe(1);
                expect(result.firstName).toBe('John');
                expect(result.lastName).toBe('Doe');
                expect(result.email).toBe('john@example.com');
                expect(result.phoneNumber).toBe('1234567890');
                expect(result.status).toBe(UserStatus.ACTIVE);
                expect(result.isVerified).toBe(true);
                expect(result.isTwoFactorEnable).toBe(false);
            });

            it('should throw NotFoundException when user not exists', async () => {
                userRepo.findOne.mockResolvedValue(null);
                await expect(service.getMyProfile(1)).rejects.toThrow(NotFoundException);
            });

            it('should throw NotFoundException with correct error code', async () => {
                userRepo.findOne.mockResolvedValue(null);
                try {
                    await service.getMyProfile(1);
                    fail('Should have thrown NotFoundException');
                } catch (error) {
                    expect(error).toBeInstanceOf(NotFoundException);
                }
            });

            it('should not call repository multiple times for single request', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                await service.getMyProfile(1);
                expect(userRepo.findOne).toHaveBeenCalledTimes(1);
            });
        });

        describe('Edge Case Logic', () => {
            it('should handle user with minimal data', async () => {
                const minimalUser: User = {
                    id: 1,
                    email: 'test@example.com',
                    password: 'hash',
                    status: UserStatus.ACTIVE,
                } as User;
                userRepo.findOne.mockResolvedValue(minimalUser);
                const result = await service.getMyProfile(1);
                expect(result.id).toBe(1);
                expect(result.email).toBe('test@example.com');
            });

            it('should handle user with null/undefined optional fields', async () => {
                const userWithNulls: User = {
                    ...mockUser,
                    profilePictureUrl: null,
                    dob: null,
                } as User;
                userRepo.findOne.mockResolvedValue(userWithNulls);
                const result = await service.getMyProfile(1);
                expect(result.profilePictureUrl).toBeNull();
                expect(result.dob).toBeNull();
            });

            it('should handle very large ID numbers', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const largeId = Number.MAX_SAFE_INTEGER;
                const result = await service.getMyProfile(largeId);
                expect(result).toBeDefined();
                expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: largeId } });
            });
        });
    });

    // =====================================================
    // updateMyProfile - Detailed Logic Tests
    // =====================================================
    describe('updateMyProfile - Detailed Tests', () => {
        describe('Input Validation - DTO Logic', () => {
            it('should reject null DTO', async () => {
                await expect(service.updateMyProfile(1, null as any)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should reject undefined DTO', async () => {
                await expect(service.updateMyProfile(1, undefined as any)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should reject empty object DTO', async () => {
                const emptyDto = {};
                await expect(service.updateMyProfile(1, emptyDto as any)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should accept DTO with firstName only', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValue(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, firstName: 'Jane' });
                const result = await service.updateMyProfile(1, dto);
                expect(result).toBeDefined();
            });

            it('should accept DTO with multiple valid fields', async () => {
                const dto: UpdateProfileDto = {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    phoneNumber: '9876543210',
                };
                userRepo.findOne.mockResolvedValue(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });
                const result = await service.updateMyProfile(1, dto);
                expect(result).toBeDefined();
            });
        });

        describe('Phone Number Conflict Detection Logic', () => {
            it('should detect duplicate phone number from different user', async () => {
                const dto: UpdateProfileDto = { phoneNumber: '9999999999' };
                const otherUser = { ...mockUser, id: 2, phoneNumber: '9999999999' };

                userRepo.findOne
                    .mockResolvedValueOnce(mockUser) // Fetch current user
                    .mockResolvedValueOnce(otherUser); // Phone exists for different user

                await expect(service.updateMyProfile(1, dto)).rejects.toThrow(BadRequestException);
            });

            it('should allow phone number if it belongs to same user', async () => {
                const dto: UpdateProfileDto = { phoneNumber: mockUser.phoneNumber };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.findOne.mockResolvedValueOnce(mockUser); // Same user owns phone

                userRepo.save.mockResolvedValue(mockUser);
                const result = await service.updateMyProfile(1, dto);
                expect(result).toBeDefined();
            });

            it('should allow phone number if no existing user has it', async () => {
                const dto: UpdateProfileDto = { phoneNumber: '1111111111' };
                userRepo.findOne.mockResolvedValueOnce(mockUser); // Current user
                userRepo.findOne.mockResolvedValueOnce(null); // Phone not taken
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });

                const result = await service.updateMyProfile(1, dto);
                expect(result).toBeDefined();
            });

            it('should check phone uniqueness with exact value match', async () => {
                const dto: UpdateProfileDto = { phoneNumber: '1234567890' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.findOne.mockResolvedValueOnce(null);
                userRepo.save.mockResolvedValue(mockUser);

                await service.updateMyProfile(1, dto);
                const phoneCheckCall = userRepo.findOne.mock.calls[1][0] as any;
                expect(phoneCheckCall.where.phoneNumber).toBe('1234567890');
            });

            it('should not check phone if DTO does not contain phoneNumber', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });

                await service.updateMyProfile(1, dto);
                // Should only call findOne once (to get user), not twice
                expect(userRepo.findOne).toHaveBeenCalledTimes(1);
            });
        });

        describe('Data Persistence Logic', () => {
            it('should save updated user with correct merged data', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane', phoneNumber: '5555555555' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.findOne.mockResolvedValueOnce(null); // Phone check
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });

                await service.updateMyProfile(1, dto);

                expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                    id: 1,
                    firstName: 'Jane',
                    phoneNumber: '5555555555',
                }));
            });

            it('should preserve unmodified fields during save', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, firstName: 'Jane' });

                await service.updateMyProfile(1, dto);

                const savedUser = userRepo.save.mock.calls[0][0];
                expect(savedUser.lastName).toBe('Doe'); // Unchanged
                expect(savedUser.email).toBe('john@example.com'); // Unchanged
                expect(savedUser.password).toBe('$2b$10$hashedpassword'); // Unchanged
            });

            it('should update timestamp fields during save', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                const updatedUser = { ...mockUser, firstName: 'Jane' };
                userRepo.save.mockResolvedValue(updatedUser);

                const result = await service.updateMyProfile(1, dto);
                expect(result).toBeDefined();
            });
        });

        describe('Response Structure Logic', () => {
            it('should return response with message property', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });

                const result = await service.updateMyProfile(1, dto);
                expect(result).toHaveProperty('message');
                expect(result.message).toBe('Profile updated successfully');
            });

            it('should return updated user object in response', async () => {
                const dto: UpdateProfileDto = { firstName: 'Jane' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                const updated = { ...mockUser, firstName: 'Jane' };
                userRepo.save.mockResolvedValue(updated);

                const result = await service.updateMyProfile(1, dto);
                expect(result).toHaveProperty('user');
                expect(result.user.firstName).toBe('Jane');
            });

            it('should return consistent response structure', async () => {
                const dto: UpdateProfileDto = { lastName: 'Smith' };
                userRepo.findOne.mockResolvedValueOnce(mockUser);
                userRepo.save.mockResolvedValue({ ...mockUser, ...dto });

                const result = await service.updateMyProfile(1, dto);
                expect(result).toEqual(
                    expect.objectContaining({
                        message: expect.any(String),
                        user: expect.any(Object),
                    })
                );
            });
        });
    });

    // =====================================================
    // changePassword - Detailed Logic Tests
    // =====================================================
    describe('changePassword - Detailed Tests', () => {
        describe('Input Validation Logic', () => {
            const validDto: ChangePasswordDto = {
                currentPassword: 'oldPassword123',
                newPassword: 'newPassword456',
                confirmPassword: 'newPassword456',
            };

            it('should reject null DTO', async () => {
                await expect(service.changePassword(1, null as any)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should reject DTO with missing currentPassword', async () => {
                const invalidDto = {
                    newPassword: 'newPassword456',
                    confirmPassword: 'newPassword456',
                } as any;
                await expect(service.changePassword(1, invalidDto)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should reject DTO with missing newPassword', async () => {
                const invalidDto = {
                    currentPassword: 'oldPassword123',
                    confirmPassword: 'newPassword456',
                } as any;
                await expect(service.changePassword(1, invalidDto)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should reject DTO with missing confirmPassword', async () => {
                const invalidDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'newPassword456',
                } as any;
                await expect(service.changePassword(1, invalidDto)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should accept DTO with all required fields', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValue(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                const result = await service.changePassword(1, validDto);
                expect(result).toBeDefined();
            });
        });

        describe('Password Verification Logic', () => {
            const dto: ChangePasswordDto = {
                currentPassword: 'oldPassword123',
                newPassword: 'newPassword456',
                confirmPassword: 'newPassword456',
            };

            it('should verify current password against stored hash', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                const verifySpyon = jest.spyOn(Encryption, 'verifyPassword');
                verifySpyon.mockResolvedValue(true).mockResolvedValue(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                await service.changePassword(1, dto);

                expect(verifySpyon).toHaveBeenCalledWith(dto.currentPassword, mockUser.password);
            });

            it('should throw ForbiddenException when current password is incorrect', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValue(false);

                await expect(service.changePassword(1, dto)).rejects.toThrow(
                    ForbiddenException
                );
            });

            it('should throw ForbiddenException with proper error message for wrong password', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValue(false);

                try {
                    await service.changePassword(1, dto);
                    fail('Should have thrown ForbiddenException');
                } catch (error) {
                    expect(error).toBeInstanceOf(ForbiddenException);
                }
            });

            it('should not proceed with password hash if verification fails', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValue(false);
                const hashSpy = jest.spyOn(Encryption, 'hashPassword');

                try {
                    await service.changePassword(1, dto);
                } catch (e) {
                    // Expected
                }

                expect(hashSpy).not.toHaveBeenCalled();
            });
        });

        describe('Password Matching Logic (DTO confirmPassword)', () => {
            it('should reject when newPassword does not match confirmPassword', async () => {
                const mismatchDto: ChangePasswordDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'newPassword456',
                    confirmPassword: 'differentPassword789',
                };
                userRepo.findOne.mockResolvedValue(mockUser);

                await expect(service.changePassword(1, mismatchDto)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should accept when newPassword matches confirmPassword exactly', async () => {
                const matchDto: ChangePasswordDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'newPassword456',
                    confirmPassword: 'newPassword456',
                };
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                const result = await service.changePassword(1, matchDto);
                expect(result.message).toBe('Password changed successfully');
            });

            it('should be case-sensitive in password matching', async () => {
                const caseDto: ChangePasswordDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'NewPassword456',
                    confirmPassword: 'newPassword456', // Different case
                };
                userRepo.findOne.mockResolvedValue(mockUser);

                await expect(service.changePassword(1, caseDto)).rejects.toThrow(
                    BadRequestException
                );
            });
        });

        describe('New vs Current Password Logic', () => {
            it('should reject when new password is same as current password', async () => {
                const samePasswordDto: ChangePasswordDto = {
                    currentPassword: 'samePassword123',
                    newPassword: 'samePassword123',
                    confirmPassword: 'samePassword123',
                };
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValue(true); // Both calls return true

                await expect(service.changePassword(1, samePasswordDto)).rejects.toThrow(
                    BadRequestException
                );
            });

            it('should verify new password does not match current by hashing comparison', async () => {
                const dto: ChangePasswordDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'newPassword456',
                    confirmPassword: 'newPassword456',
                };
                userRepo.findOne.mockResolvedValue(mockUser);
                const verifySpyon = jest.spyOn(Encryption, 'verifyPassword');
                verifySpyon.mockResolvedValueOnce(true); // Current password matches
                verifySpyon.mockResolvedValueOnce(false); // New password does not match
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                const result = await service.changePassword(1, dto);
                expect(result.message).toBe('Password changed successfully');
                expect(verifySpyon).toHaveBeenCalledTimes(2);
            });

            it('should call verifyPassword twice - once for current, once for new', async () => {
                const dto: ChangePasswordDto = {
                    currentPassword: 'oldPassword123',
                    newPassword: 'newPassword456',
                    confirmPassword: 'newPassword456',
                };
                userRepo.findOne.mockResolvedValue(mockUser);
                const verifySpyon = jest.spyOn(Encryption, 'verifyPassword');
                verifySpyon.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                await service.changePassword(1, dto);
                expect(verifySpyon).toHaveBeenCalledTimes(2);
            });
        });

        describe('Password Hashing Logic', () => {
            const dto: ChangePasswordDto = {
                currentPassword: 'oldPassword123',
                newPassword: 'newPassword456',
                confirmPassword: 'newPassword456',
            };

            it('should hash the new password', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                const hashSpy = jest.spyOn(Encryption, 'hashPassword');
                hashSpy.mockResolvedValue('hashedNewPassword');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'hashedNewPassword' });

                await service.changePassword(1, dto);

                expect(hashSpy).toHaveBeenCalledWith(dto.newPassword);
                expect(hashSpy).toHaveBeenCalledTimes(1);
            });

            it('should use hashed password in save operation', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newSecureHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newSecureHash' });

                await service.changePassword(1, dto);

                expect(userRepo.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        password: 'newSecureHash',
                    })
                );
            });

            it('should never save plain-text password', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('hashedPassword');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'hashedPassword' });

                await service.changePassword(1, dto);

                const savedUser = userRepo.save.mock.calls[0][0];
                expect(savedUser.password).not.toBe(dto.newPassword);
            });
        });

        describe('Successful Password Change Logic', () => {
            const dto: ChangePasswordDto = {
                currentPassword: 'oldPassword123',
                newPassword: 'newPassword456',
                confirmPassword: 'newPassword456',
            };

            it('should return success message', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                const result = await service.changePassword(1, dto);
                expect(result.message).toBe('Password changed successfully');
            });

            it('should save user exactly once on success', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                await service.changePassword(1, dto);
                expect(userRepo.save).toHaveBeenCalledTimes(1);
            });

            it('should preserve user ID during password change', async () => {
                userRepo.findOne.mockResolvedValue(mockUser);
                jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
                jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
                userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

                await service.changePassword(1, dto);
                expect(userRepo.save).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 1,
                    })
                );
            });
        });
    });

    // =====================================================
    // getAllUsers - Detailed Logic Tests
    // =====================================================
    describe('getAllUsers - Detailed Tests', () => {
        describe('Data Retrieval Logic', () => {
            it('should retrieve all users from repository', async () => {
                userRepo.find.mockResolvedValue([mockUser]);
                const result = await service.getAllUsers();
                expect(userRepo.find).toHaveBeenCalled();
                expect(result).toEqual([mockUser]);
            });

            it('should return empty array when no users exist', async () => {
                userRepo.find.mockResolvedValue([]);
                const result = await service.getAllUsers();
                expect(result).toEqual([]);
                expect(result.length).toBe(0);
            });

            it('should return array with exact count of users', async () => {
                const users = [mockUser, { ...mockUser, id: 2 }, { ...mockUser, id: 3 }];
                userRepo.find.mockResolvedValue(users);
                const result = await service.getAllUsers();
                expect(result.length).toBe(3);
                expect(result).toHaveLength(3);
            });

            it('should return multiple users in correct order', async () => {
                const user1 = { ...mockUser, id: 1 };
                const user2 = { ...mockUser, id: 2 };
                const user3 = { ...mockUser, id: 3 };
                const users = [user1, user2, user3];

                userRepo.find.mockResolvedValue(users);
                const result = await service.getAllUsers();

                expect(result[0].id).toBe(1);
                expect(result[1].id).toBe(2);
                expect(result[2].id).toBe(3);
            });
        });

        describe('Data Integrity Logic', () => {
            it('should preserve all user properties in returned array', async () => {
                userRepo.find.mockResolvedValue([mockUser]);
                const result = await service.getAllUsers() as any;

                expect(result[0].id).toBe(mockUser.id);
                expect(result[0].email).toBe(mockUser.email);
                expect(result[0].firstName).toBe(mockUser.firstName);
                expect(result[0].password).toBe(mockUser.password);
                expect(result[0].status).toBe(mockUser.status);
            });

            it('should not modify user objects before returning', async () => {
                const originalUser = { ...mockUser };
                userRepo.find.mockResolvedValue([originalUser]);

                const result = await service.getAllUsers();

                expect(result[0]).toEqual(originalUser);
            });

            it('should handle users with null optional fields', async () => {
                const userWithNulls = {
                    ...mockUser,
                    profilePictureUrl: null,
                    
                };
                userRepo.find.mockResolvedValue([userWithNulls]);
                const result = await service.getAllUsers();

                expect(result[0].profilePictureUrl).toBeNull();
                
            });

            it('should handle mixed users with and without optional fields', async () => {
                const user1 = { ...mockUser, profilePictureUrl: 'url' };
                const user2 = { ...mockUser, id: 2, profilePictureUrl: null };
                userRepo.find.mockResolvedValue([user1, user2]);

                const result = await service.getAllUsers();

                expect(result[0].profilePictureUrl).toBe('url');
                expect(result[1].profilePictureUrl).toBeNull();
            });
        });

        describe('Performance & Query Logic', () => {
            it('should call find method exactly once per request', async () => {
                userRepo.find.mockResolvedValue([mockUser]);
                await service.getAllUsers();
                expect(userRepo.find).toHaveBeenCalledTimes(1);
            });

            it('should call find with no filtering parameters', async () => {
                userRepo.find.mockResolvedValue([mockUser]);
                await service.getAllUsers();
                expect(userRepo.find).toHaveBeenCalledWith();
            });

            it('should handle large result sets efficiently', async () => {
                const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({
                    ...mockUser,
                    id: i + 1,
                }));
                userRepo.find.mockResolvedValue(largeUserSet);

                const result = await service.getAllUsers();

                expect(result.length).toBe(1000);
                expect(result[0].id).toBe(1);
                expect(result[999].id).toBe(1000);
            });
        });

        describe('Error Handling Logic', () => {
            it('should throw error when repository fails', async () => {
                userRepo.find.mockRejectedValue(new Error('Database error'));
                await expect(service.getAllUsers()).rejects.toThrow('Database error');
            });

            it('should propagate repository exceptions', async () => {
                const dbError = new Error('Connection timeout');
                userRepo.find.mockRejectedValue(dbError);
                await expect(service.getAllUsers()).rejects.toBe(dbError);
            });
        });
    });

    // =====================================================
    // findByQuery - Detailed Logic Tests
    // =====================================================
    describe('findByQuery - Detailed Tests', () => {
        describe('Query Construction Logic', () => {
            it('should search by email field', async () => {
                const query = { email: 'john' };
                userRepo.find.mockResolvedValue([mockUser]);

                await service.findByQuery(query);

                const findCall = userRepo.find.mock.calls[0][0] as any;
                expect(findCall.where.email).toBeDefined();
            });

            it('should use ILike operator for case-insensitive search', async () => {
                const query = { email: 'JOHN' };
                userRepo.find.mockResolvedValue([mockUser]);

                await service.findByQuery(query);

                const findCall = userRepo.find.mock.calls[0][0] as any;
                expect(findCall.where.email).toEqual(ILike('%JOHN%'));
            });

            it('should wrap search term in LIKE wildcards', async () => {
                const query = { email: 'test' };
                userRepo.find.mockResolvedValue([]);

                await service.findByQuery(query);

                const findCall = userRepo.find.mock.calls[0][0] as any;
                // ILike('%test%') pattern
                expect(findCall.where.email.toString()).toContain('test');
            });

            it('should handle empty search query string', async () => {
                const query = { email: '' };
                userRepo.find.mockResolvedValue([]);

                await service.findByQuery(query);
                expect(userRepo.find).toHaveBeenCalled();
            });

            it('should handle special characters in search', async () => {
                const query = { email: 'test@example.com' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);
                expect(result).toBeDefined();
            });
        });

        describe('Search Result Handling Logic', () => {
            it('should return matching users', async () => {
                const query = { email: 'john' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result).toEqual([mockUser]);
                expect(result[0].email).toBe('john@example.com');
            });

            it('should return empty array for no matches', async () => {
                const query = { email: 'nonexistent' };
                userRepo.find.mockResolvedValue([]);

                const result = await service.findByQuery(query);

                expect(result).toEqual([]);
                expect(result.length).toBe(0);
            });

            it('should return multiple matching users', async () => {
                const query = { email: 'john' };
                const users = [
                    mockUser,
                    { ...mockUser, id: 2, email: 'john.doe@example.com' },
                    { ...mockUser, id: 3, email: 'johnny@example.com' },
                ];
                userRepo.find.mockResolvedValue(users);

                const result = await service.findByQuery(query);

                expect(result.length).toBe(3);
                expect(result[0].email).toContain('john');
            });

            it('should return results preserving all user data', async () => {
                const query = { email: 'john' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].id).toBe(1);
                expect(result[0].firstName).toBe('John');
                expect(result[0].status).toBe(UserStatus.ACTIVE);
                expect(result[0].password).toBe('$2b$10$hashedpassword');
            });
        });

        describe('Case Sensitivity Logic', () => {
            it('should find users regardless of case in email', async () => {
                const query = { email: 'JOHN' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email.toLowerCase()).toContain('john');
            });

            it('should find mixed case emails', async () => {
                const query = { email: 'JoHn' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result).toHaveLength(1);
            });

            it('should handle lowercase search for uppercase stored data', async () => {
                const query = { email: 'john' };
                const uppercaseUser = {
                    ...mockUser,
                    email: 'JOHN@EXAMPLE.COM',
                };
                userRepo.find.mockResolvedValue([uppercaseUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email).toContain('JOHN');
            });
        });

        describe('Partial Match Logic', () => {
            it('should match partial email addresses', async () => {
                const query = { email: 'example' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email).toContain('example');
            });

            it('should match email prefix', async () => {
                const query = { email: 'john' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email.startsWith('john'));
            });

            it('should match email domain', async () => {
                const query = { email: '@example.com' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email).toContain('@example.com');
            });

            it('should match single character in email', async () => {
                const query = { email: 'j' };
                userRepo.find.mockResolvedValue([mockUser]);

                const result = await service.findByQuery(query);

                expect(result[0].email).toContain('j');
            });
        });

        describe('Edge Cases Logic', () => {
            it('should handle null query', async () => {
                await expect(service.findByQuery(null as any)).rejects.toThrow();
            });

            it('should handle undefined query', async () => {
                await expect(service.findByQuery(undefined as any)).rejects.toThrow();
            });

            it('should handle query with special regex characters', async () => {
                const query = { email: '.*' };
                userRepo.find.mockResolvedValue([]);

                const result = await service.findByQuery(query);
                expect(result).toBeDefined();
            });

            it('should handle very long search strings', async () => {
                const longString = 'a'.repeat(1000);
                const query = { email: longString };
                userRepo.find.mockResolvedValue([]);

                const result = await service.findByQuery(query);
                expect(result).toEqual([]);
            });
        });
    });

    // =====================================================
    // Integration Logic Tests
    // =====================================================
    describe('Cross-Method Integration Logic', () => {
        it('should maintain user data consistency across getMyProfile and updateMyProfile', async () => {
            const dto: UpdateProfileDto = { firstName: 'Jane' };
            const updatedUser = { ...mockUser, firstName: 'Jane' };

            // First get profile
            userRepo.findOne.mockResolvedValueOnce(mockUser);
            const profile = await service.getMyProfile(1);
            expect(profile.firstName).toBe('John');

            // Update profile
            jest.clearAllMocks();
            userRepo.findOne.mockResolvedValueOnce(mockUser);
            userRepo.save.mockResolvedValue(updatedUser);
            const result = await service.updateMyProfile(1, dto);
            expect(result.user.firstName).toBe('Jane');
        });

        it('should verify password change affects subsequent operations', async () => {
            const changePasswordDto: ChangePasswordDto = {
                currentPassword: 'old',
                newPassword: 'new',
                confirmPassword: 'new',
            };

            userRepo.findOne.mockResolvedValue(mockUser);
            jest.spyOn(Encryption, 'verifyPassword').mockResolvedValueOnce(true).mockResolvedValueOnce(false);
            jest.spyOn(Encryption, 'hashPassword').mockResolvedValue('newHash');
            userRepo.save.mockResolvedValue({ ...mockUser, password: 'newHash' });

            const result = await service.changePassword(1, changePasswordDto);

            expect(result.message).toBe('Password changed successfully');
            expect(userRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    password: 'newHash',
                })
            );
        });
    });
});