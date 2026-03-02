import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import path from 'path';

// ==========================================
// 1. IMPORT YOUR ENTITIES HERE
// ==========================================
import { User } from './user/user.entity';
import { Class } from './classroom/class.entity';
import { Enrollment } from './classroom/enrollment.entity';
import { Team } from './classroom/team.entity';
import { TeamMember } from './classroom/user-team.entity';
import { Resource } from './resource/resource.entity';
import { Assessment } from './assessment/assessment.entity';
import { Rubrics } from './assessment/rubic.entity';
import { Submission } from './assessment/submission.entity';
import { Payment } from './ai/payment.entity';
import { AIUsageLog } from './ai/ai-usage-log.entity';
import { Currency, PaymentMethod } from '../enums/Payment';
import { PaymentStatus, SubmissionStatus, UserStatus, ClassStatus } from '../enums/Status';
import { SystemRole, UserRole } from '../enums/Role';
import { SubmissionType, SubmissionMethod, EvaluationType, AIModelSelectionMode } from '../enums/Assessment';
import { SubmissionResource } from './resource/submission-resource.entity';
import { Encryption } from '../utils/Encryption';
import { ResourceType } from '../enums/Resource';
import AppDataSource from '../../database/data-source';
import { CreditPackage } from './ai/credit-package.entity';
import { UserCreditBalance } from './ai/user-credit-balance.entity';
import { UserAIKey } from './ai/user-ai-key.entity';
import { Evaluation } from './assessment/evaluation.entity';
import { EvaluationFeedback, FeedbackType } from './assessment/evaluation-feedback.entity';
import { WalletTransaction, TransactionType, TransactionReason } from './ai/wallet-transaction.entity';
import { TeamAssessment } from './classroom/team-assessment.entity';



export async function seed() {
    await AppDataSource.initialize();
    console.log('🌱 DataSource initialized. Starting seeding...');
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Helper: get a random date within the last 2 months
    function randomDateWithinLast2Months() {
        const now = new Date();
        const twoMonthsAgo = new Date(now);
        twoMonthsAgo.setMonth(now.getMonth() - 2);
        return new Date(twoMonthsAgo.getTime() + Math.random() * (now.getTime() - twoMonthsAgo.getTime()));
    }

    try {
        // -----------------------
        // 1. CLEAR DATABASE
        // -----------------------
        console.log('🧹 Clearing existing data...');
        await queryRunner.query(`
            DO
            $$
            DECLARE
                tbl RECORD;
            BEGIN
                FOR tbl IN
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = current_schema()
                LOOP
                    EXECUTE 'TRUNCATE TABLE ' || quote_ident(tbl.tablename) || ' RESTART IDENTITY CASCADE;';
                END LOOP;
            END
            $$;
        `);

        // -----------------------
        // SEED STEP 1: CREDIT PACKAGES (No dependencies)
        // -----------------------
        console.log('💰 Step 1: Seeding Credit Packages...');
        const creditPackages: CreditPackage[] = [];
        const packageConfigs = [
            { name: 'Starter Pack', credits: 1000, price: 9.99, bonus: 100 },
            { name: 'Professional Pack', credits: 5000, price: 39.99, bonus: 500 },
            { name: 'Enterprise Pack', credits: 10000, price: 69.99, bonus: 2000 },
            { name: 'Student Pack', credits: 2000, price: 14.99, bonus: 300 },
            { name: 'Teacher Pack', credits: 8000, price: 49.99, bonus: 1500 },
        ];

        for (const config of packageConfigs) {
            const pkg = new CreditPackage();
            pkg.name = config.name;
            pkg.description = faker.lorem.sentence();
            pkg.credits = config.credits;
            pkg.price = config.price;
            pkg.currency = Currency.USD;
            pkg.bonusCredits = config.bonus;
            pkg.discountInPercent = faker.number.int({ min: 0, max: 20 });
            pkg.isActive = true;
            pkg.sortOrder = creditPackages.length + 1;
            creditPackages.push(await queryRunner.manager.save(pkg));
        }
        console.log(`✅ Created ${creditPackages.length} credit packages`);

        // -----------------------
        // SEED STEP 2: USERS (No dependencies, ~80-90 users)
        // -----------------------
        console.log('👤 Step 2: Seeding Users...');
        const khmerFirstNames = [
            'Sophea', 'Vannak', 'Sokha', 'Chanda', 'Ratha', 'Sreymom', 'Borey', 'Sophal', 'Rithy', 'Sokunthea',
            'Piseth', 'Dara', 'Sovanny', 'Sreyroth', 'Romam', 'Samorn', 'Khem', 'Mara', 'Kimheng', 'Soriya',
            'Mony', 'Vibol', 'Daravuth', 'Manoroth', 'Phanna', 'Narineak', 'Navuth', 'Keo', 'Sopheap', 'Tara',
            'Boriya', 'Chhay', 'Chamroeun', 'Sameth', 'Kanha', 'Siha', 'Naly', 'Sokry', 'Mohm', 'Yui'
        ];

        const khmerLastNames = [
            'Heng', 'Chhun', 'Meas', 'Ngin', 'Keo', 'Sok', 'Rith', 'Ouk', 'Touch', 'Ly',
            'Mok', 'Chheng', 'Ros', 'Neou', 'Komar', 'Poeur', 'Sakada', 'Leang', 'Phrom', 'Hann',
            'Duch', 'Sovannary', 'Sok', 'Keo', 'Chea', 'Ponn', 'Sar', 'Chim', 'Sar', 'Lim'
        ];

        const usersData: User[] = [];
        const totalUsers = 85;
        const teacherCount = 12;
        const studentCount = totalUsers - teacherCount - 1; // -1 for super admin

        // Pre-hash all passwords
        const userHashes = await Promise.all(
            Array.from({ length: totalUsers }).map(() => Encryption.hashPassword('password123'))
        );

        // Create Teachers
        for (let i = 0; i < teacherCount; i++) {
            const user = new User();
            const firstName = khmerFirstNames[i % khmerFirstNames.length];
            const lastName = khmerLastNames[i % khmerLastNames.length];

            user.firstName = firstName;
            user.lastName = `${lastName}_Teacher`;
            user.gender = faker.datatype.boolean() ? 'male' : 'female';
            user.dob = faker.date.birthdate({ min: 35, max: 60, mode: 'age' });
            user.phoneNumber = `855${faker.number.int({ min: 10000000, max: 99999999 })}`;
            user.status = i === teacherCount - 1 ? UserStatus.BANNED : UserStatus.ACTIVE;
            user.role = SystemRole.User;
            user.isVerified = true;
            user.isTwoFactorEnable = faker.datatype.boolean();
            user.email = `teacher.${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
            user.password = userHashes[i];

            usersData.push(await queryRunner.manager.save(user));
        }

        // Create Students
        for (let i = 0; i < studentCount; i++) {
            const user = new User();
            const firstName = khmerFirstNames[(teacherCount + i) % khmerFirstNames.length];
            const lastName = khmerLastNames[(teacherCount + i) % khmerLastNames.length];

            user.firstName = firstName;
            user.lastName = `${lastName}_Student`;
            user.gender = faker.datatype.boolean() ? 'male' : 'female';
            user.dob = faker.date.birthdate({ min: 18, max: 25, mode: 'age' });
            user.phoneNumber = `855${faker.number.int({ min: 10000000, max: 99999999 })}`;
            user.status = UserStatus.ACTIVE;
            user.role = SystemRole.User;
            user.isVerified = faker.datatype.boolean(0.85);
            user.isTwoFactorEnable = faker.datatype.boolean(0.3);
            user.email = `student.${firstName.toLowerCase()}.${lastName.toLowerCase()}${teacherCount + i}@example.com`;
            user.password = userHashes[teacherCount + i];

            usersData.push(await queryRunner.manager.save(user));
        }

        // Fixed Super Admin
        const superAdmin = new User();
        superAdmin.email = 'cpf.cadt@gmail.com';
        superAdmin.password = await Encryption.hashPassword('Admin@123');
        superAdmin.firstName = 'Super';
        superAdmin.lastName = 'Admin';
        superAdmin.status = UserStatus.ACTIVE;
        superAdmin.role = SystemRole.SuperAdmin;
        superAdmin.isVerified = true;
        superAdmin.isTwoFactorEnable = true;
        await queryRunner.manager.save(superAdmin);
        console.log(`✅ Created ${totalUsers + 1} users (${teacherCount} teachers, ${studentCount} students, 1 admin)`);

        // -----------------------
        // SEED STEP 3: USER CREDIT BALANCE (Depends on Users)
        // -----------------------
        console.log('💳 Step 3: Seeding User Credit Balance...');
        const allUsers = [...usersData, superAdmin];
        const walletMap = new Map<number, UserCreditBalance>();

        for (const user of allUsers) {
            const wallet = new UserCreditBalance();
            wallet.user = user;
            wallet.creditBalance = faker.number.int({ min: 500, max: 25000 });
            const savedWallet = await queryRunner.manager.save(wallet);
            walletMap.set(user.id, savedWallet);
        }
        console.log(`✅ Created ${allUsers.length} credit balances`);

        // -----------------------
        // SEED STEP 4: CLASSES (Depends on Users as owner, 10-18 classes)
        // -----------------------
        console.log('🏫 Step 4: Seeding Classes...');
        const classCount = faker.number.int({ min: 12, max: 16 });
        const classData: Class[] = [];
        const programmingLanguages = ['C', 'C++', 'Java', 'Python', 'JavaScript'];
        const courseNames = [
            'Data Structures',
            'Web Development',
            'Algorithms',
            'Database Design',
            'Software Engineering',
            'Mobile Development',
            'Advanced Programming',
            'System Design',
            'Competitive Programming',
            'OOP Concepts',
            'Functional Programming',
            'Cloud Computing',
            'DevOps Basics',
            'AI Fundamentals',
            'Machine Learning'
        ];

        const usedCodes = new Set<string>();

        for (let i = 0; i < classCount; i++) {
            const myClass = new Class();
            const teacher = usersData[i % teacherCount];
            const courseName = courseNames[i % courseNames.length];
            const language = programmingLanguages[i % programmingLanguages.length];

            myClass.name = `${courseName} - ${language} - Semester ${Math.ceil((i + 1) / 5)}`;
            let joinCode = faker.string.alphanumeric(6).toUpperCase();
            while (usedCodes.has(joinCode)) {
                joinCode = faker.string.alphanumeric(6).toUpperCase();
            }
            usedCodes.add(joinCode);
            myClass.joinCode = joinCode;
            myClass.owner = teacher;
            myClass.description = faker.lorem.paragraph();
            myClass.status = i < classCount - 1 ? ClassStatus.ACTIVE : ClassStatus.END;
            const savedClass = await queryRunner.manager.save(myClass);
            classData.push(savedClass);
        }
        console.log(`✅ Created ${classCount} classes`);

        // -----------------------
        // SEED STEP 5: ENROLLMENTS (Depends on Users and Classes, 300-400)
        // -----------------------
        console.log('📝 Step 5: Seeding Enrollments...');
        const enrollmentArray: Enrollment[] = [];
        let enrollmentCount = 0;

        for (const myClass of classData) {
            const studentsPerClass = faker.number.int({ min: 25, max: 45 });
            const classStudents = new Set<number>();

            while (classStudents.size < studentsPerClass && classStudents.size < usersData.length) {
                const randomStudent = usersData[faker.number.int({ min: 0, max: usersData.length - 1 })];
                classStudents.add(randomStudent.id);
            }

            for (const studentId of Array.from(classStudents)) {
                const student = usersData.find(u => u.id === studentId);
                if (!student) continue;

                const enrollment = new Enrollment();
                enrollment.user = student;
                enrollment.class = myClass;
                enrollment.role = UserRole.Student;
                enrollmentArray.push(await queryRunner.manager.save(enrollment));
                enrollmentCount++;
            }
        }
        console.log(`✅ Created ${enrollmentCount} enrollments`);

        // -----------------------
        // SEED STEP 6: TEAMS (Depends on Users as leader and Classes, 30-50 teams)
        // -----------------------
        console.log('🤝 Step 6: Seeding Teams...');
        const teamArray: Team[] = [];
        const teamNames = new Set<string>();
        const teamCodes = new Set<string>();
        let teamCount = 0;

        for (const myClass of classData) {
            const teamsPerClass = faker.number.int({ min: 2, max: 6 });

            for (let t = 0; t < teamsPerClass; t++) {
                const team = new Team();

                let teamName = `${faker.animal.type()} Team ${teamCount}`;
                while (teamNames.has(teamName)) {
                    teamName = `${faker.animal.type()} Team ${faker.number.int({ min: 0, max: 9999 })}`;
                }
                teamNames.add(teamName);
                team.name = teamName;

                let code = faker.string.alphanumeric(6).toUpperCase();
                while (teamCodes.has(code)) {
                    code = faker.string.alphanumeric(6).toUpperCase();
                }
                teamCodes.add(code);
                team.joinCode = code;

                team.maxMember = faker.number.int({ min: 2, max: 5 });
                // Select a leader from enrolled students in this class
                const classEnrollments = enrollmentArray.filter(e => e.class.id === myClass.id);
                if (classEnrollments.length > 0) {
                    const leader = classEnrollments[faker.number.int({ min: 0, max: classEnrollments.length - 1 })].user;
                    team.leader = leader;
                }
                team.class = myClass;

                teamArray.push(await queryRunner.manager.save(team));
                teamCount++;
            }
        }
        console.log(`✅ Created ${teamCount} teams`);

        // -----------------------
        // SEED STEP 7: TEAM MEMBERS (Depends on Teams and Users, 90-150)
        // -----------------------
        console.log('👥 Step 7: Seeding Team Members...');
        let teamMemberCount = 0;

        for (const team of teamArray) {
            const membersToAdd = faker.number.int({ min: 2, max: team.maxMember });
            const addedMembers = new Set<number>();

            if (team.leader) {
                const member = new TeamMember();
                member.team = team;
                member.user = team.leader;
                member.isApproved = true;
                member.enrollDate = randomDateWithinLast2Months();
                await queryRunner.manager.save(member);
                addedMembers.add(team.leader.id);
                teamMemberCount++;
            }

            while (addedMembers.size < membersToAdd) {
                const classEnrollments = enrollmentArray.filter(e => e.class.id === team.class.id);
                if (classEnrollments.length === 0) break;

                const randomEnrollment = classEnrollments[faker.number.int({ min: 0, max: classEnrollments.length - 1 })];
                if (addedMembers.has(randomEnrollment.user.id)) continue;

                const member = new TeamMember();
                member.team = team;
                member.user = randomEnrollment.user;
                member.isApproved = faker.datatype.boolean(0.7);
                member.enrollDate = randomDateWithinLast2Months();
                await queryRunner.manager.save(member);
                addedMembers.add(randomEnrollment.user.id);
                teamMemberCount++;
            }
        }
        console.log(`✅ Created ${teamMemberCount} team members`);

        // -----------------------
        // SEED STEP 8: ASSESSMENTS (Depends on Classes, 40-70)
        // -----------------------
        console.log('📊 Step 8: Seeding Assessments...');
        const assessmentArray: Assessment[] = [];
        const assessmentTitles = [
            'Library Management System',
            'E-commerce Platform',
            'Chat Application',
            'Task Management System',
            'Social Media Feed',
            'Hospital Management System',
            'Bank Account System',
            'Student Grading System',
            'Inventory Management',
            'Restaurant Booking',
            'Real Estate Portal',
            'Flight Booking System',
            'Movie Reservation',
            'Employee Management',
            'Performance Analysis'
        ];

        for (const myClass of classData) {
            const assessmentsPerClass = faker.number.int({ min: 3, max: 8 });

            for (let a = 0; a < assessmentsPerClass; a++) {
                const assessment = new Assessment();
                assessment.title = `${assessmentTitles[a % assessmentTitles.length]} - Week ${a + 1}`;
                assessment.instruction = faker.lorem.paragraphs(2);

                // Distribute assessment dates within last 2 months
                const startDate = randomDateWithinLast2Months();
                assessment.startDate = startDate;
                assessment.dueDate = new Date(startDate.getTime() + faker.number.int({ min: 7, max: 21 }) * 24 * 60 * 60 * 1000);

                assessment.maxScore = faker.number.int({ min: 50, max: 100 });
                assessment.session = faker.number.int({ min: 1, max: 3 });
                assessment.isPublic = faker.datatype.boolean(0.6);
                assessment.submissionType = faker.helpers.arrayElement([SubmissionType.INDIVIDUAL, SubmissionType.TEAM]);
                assessment.allowLate = faker.datatype.boolean(0.7);
                assessment.penaltyCriteria = faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null;
                assessment.aiEvaluationEnable = faker.datatype.boolean(0.6);
                assessment.user_exclude_files = faker.datatype.boolean(0.3) ? ['.env', 'node_modules/**'] : [];
                assessment.user_include_files = faker.datatype.boolean(0.3) ? ['src/**', '*.ts'] : [];
                assessment.aiModelSelectionMode = faker.helpers.arrayElement([
                    AIModelSelectionMode.SYSTEM,
                    AIModelSelectionMode.USER,
                    AIModelSelectionMode.NONE
                ]);
                assessment.allowedSubmissionMethod = faker.helpers.arrayElement([
                    SubmissionMethod.GITHUB,
                    SubmissionMethod.ZIP,
                    SubmissionMethod.ANY
                ]);
                assessment.class = myClass;

                const savedAssessment = await queryRunner.manager.save(assessment);
                assessmentArray.push(savedAssessment);

                // Add Rubrics
                const rubricCount = faker.number.int({ min: 3, max: 6 });
                const totalRubricScore = assessment.maxScore;
                const scorePerRubric = Math.round(totalRubricScore / rubricCount);

                for (let r = 0; r < rubricCount; r++) {
                    const rubric = new Rubrics();
                    rubric.definition = faker.lorem.sentence();
                    rubric.totalScore = r === rubricCount - 1 ? totalRubricScore - (scorePerRubric * r) : scorePerRubric;
                    rubric.assessment = savedAssessment;
                    await queryRunner.manager.save(rubric);
                }
            }
        }
        console.log(`✅ Created ${assessmentArray.length} assessments with rubrics`);

        // -----------------------
        // SEED STEP 9: SUBMISSIONS (Depends on Assessments, Users, Teams, 250-400)
        // Must respect submission_type (INDIVIDUAL vs TEAM)
        // -----------------------
        console.log('📋 Step 9: Seeding Submissions...');
        const submissionArray: Submission[] = [];
        let submissionCount = 0;

        for (const assessment of assessmentArray) {
            const classEnrollments = enrollmentArray.filter(e => e.class.id === assessment.class.id);
            if (classEnrollments.length === 0) continue;

            if (assessment.submissionType === SubmissionType.INDIVIDUAL) {
                // Generate submissions from 60-80% of enrolled students
                const submissionRate = faker.number.float({ min: 0.6, max: 0.85 });
                const submittersCount = Math.ceil(classEnrollments.length * submissionRate);
                const submitters = classEnrollments
                    .sort(() => Math.random() - 0.5)
                    .slice(0, submittersCount);

                for (const enrollment of submitters) {
                    const submission = new Submission();
                    submission.assessment = assessment;
                    submission.user = enrollment.user;
                    submission.team = null;
                    submission.userId = enrollment.user.id;
                    submission.teamId = null;

                    // Submission time within last 2 months, but after assessment start
                    let submissionDate = randomDateWithinLast2Months();
                    if (submissionDate < assessment.startDate) submissionDate = assessment.startDate;
                    if (submissionDate > assessment.dueDate) submissionDate = assessment.dueDate;
                    submission.submissionTime = submissionDate;

                    submission.status = faker.helpers.arrayElement([
                        SubmissionStatus.PENDING,
                        SubmissionStatus.SUBMITTED,
                        SubmissionStatus.GRADED,
                        SubmissionStatus.LATE,
                        SubmissionStatus.RESUBMITTED
                    ]);
                    submission.attemptNumber = submission.status === SubmissionStatus.RESUBMITTED ? faker.number.int({ min: 2, max: 5 }) : 1;
                    submission.comments = faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null;

                    submissionArray.push(await queryRunner.manager.save(submission));
                    submissionCount++;
                }
            } else {
                // TEAM submissions
                const classTeams = teamArray.filter(t => t.class.id === assessment.class.id);
                const submissionRate = faker.number.float({ min: 0.6, max: 0.8 });
                const submittingTeams = classTeams
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.ceil(classTeams.length * submissionRate));

                for (const team of submittingTeams) {
                    const submission = new Submission();
                    submission.assessment = assessment;
                    submission.team = team;
                    submission.user = null;
                    submission.teamId = team.id;
                    submission.userId = null;

                    // Submission time within last 2 months, but after assessment start
                    let submissionDate = randomDateWithinLast2Months();
                    if (submissionDate < assessment.startDate) submissionDate = assessment.startDate;
                    if (submissionDate > assessment.dueDate) submissionDate = assessment.dueDate;
                    submission.submissionTime = submissionDate;

                    submission.status = faker.helpers.arrayElement([
                        SubmissionStatus.PENDING,
                        SubmissionStatus.SUBMITTED,
                        SubmissionStatus.GRADED,
                        SubmissionStatus.LATE,
                        SubmissionStatus.RESUBMITTED
                    ]);
                    submission.attemptNumber = submission.status === SubmissionStatus.RESUBMITTED ? faker.number.int({ min: 2, max: 4 }) : 1;
                    submission.comments = faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null;

                    submissionArray.push(await queryRunner.manager.save(submission));
                    submissionCount++;
                }
            }
        }
        console.log(`✅ Created ${submissionCount} submissions`);

        // -----------------------
        // SEED STEP 10: RESOURCES & SUBMISSION RESOURCES (Depends on Submissions)
        // -----------------------
        console.log('📁 Step 10: Seeding Resources...');
        const githubUrls = [
            'https://github.com/user/project-week-1.git',
            'https://github.com/user/assignment-task.git',
            'https://github.com/user/database-system.git',
            'https://github.com/user/web-app.git',
            'https://github.com/user/mobile-app.git',
        ];

        for (let i = 0; i < submissionArray.length; i++) {
            const submission = submissionArray[i];
            const resourceType = faker.helpers.arrayElement([ResourceType.URL, ResourceType.FILE, ResourceType.DOCUMENT]);

            const resource = new Resource();
            resource.title = `${submission.user?.lastName || submission.team?.name} - Submission ${submission.attemptNumber}`;
            resource.type = resourceType;
            resource.url = resourceType === ResourceType.URL
                ? githubUrls[i % githubUrls.length] + `?ref=submission-${submission.id}`
                : `https://storage.example.com/submission-${submission.id}.zip`;
            resource.owner = submission.user
                ? `User:${submission.user.id}`
                : `Team:${submission.team.id}`;
            resource.description = `Submission resources for assessment`;

            const savedResource = await queryRunner.manager.save(resource);

            const submissionResource = new SubmissionResource();
            submissionResource.submission = submission;
            submissionResource.resource = savedResource;
            await queryRunner.manager.save(submissionResource);
        }
        console.log(`✅ Created ${submissionArray.length} submission resources`);

        // -----------------------
        // SEED STEP 11: EVALUATIONS (Depends on Submissions)
        // -----------------------
        console.log('🔍 Step 11: Seeding Evaluations...');
        let evaluationCount = 0;

        for (const submission of submissionArray) {
            // 70% of submissions have evaluations
            if (!faker.datatype.boolean(0.7)) continue;
            if (submission.status !== SubmissionStatus.GRADED && submission.status !== SubmissionStatus.SUBMITTED) continue;

            const evaluation = new Evaluation();
            evaluation.submission = submission;
            evaluation.evaluationType = submission.assessment.aiEvaluationEnable && faker.datatype.boolean()
                ? EvaluationType.AI
                : EvaluationType.MANUAL;

            evaluation.score = faker.number.int({ min: 0, max: submission.assessment.maxScore });
            evaluation.penaltyScore = faker.number.int({ min: 0, max: 20 });
            evaluation.isApproved = evaluation.evaluationType === EvaluationType.MANUAL;
            evaluation.isModified = faker.datatype.boolean(0.3);
            evaluation.feedback = faker.lorem.paragraphs(1);
            evaluation.aiOutput = evaluation.evaluationType === EvaluationType.AI
                ? faker.lorem.paragraphs(2)
                : null;
            evaluation.confidencePoint = evaluation.evaluationType === EvaluationType.AI
                ? `${faker.number.int({ min: 60, max: 99 })}%`
                : null;

            const savedEvaluation = await queryRunner.manager.save(evaluation);

            // Add Evaluation Feedbacks
            const feedbackCount = faker.number.int({ min: 1, max: 5 });
            for (let f = 0; f < feedbackCount; f++) {
                const feedback = new EvaluationFeedback();
                feedback.evaluation = savedEvaluation;
                feedback.filePath = `src/file${f}.${['ts', 'java', 'cpp', 'py'][f % 4]}`;
                feedback.startLine = faker.number.int({ min: 1, max: 50 });
                feedback.endLine = feedback.startLine + faker.number.int({ min: 1, max: 10 });
                feedback.message = faker.lorem.sentence();
                feedback.feedbackType = faker.helpers.arrayElement([
                    FeedbackType.ERROR,
                    FeedbackType.WARNING,
                    FeedbackType.SUGGESTION
                ]);
                await queryRunner.manager.save(feedback);
            }

            evaluationCount++;
        }
        console.log(`✅ Created ${evaluationCount} evaluations with feedback`);

        // -----------------------
        // SEED STEP 12: TEAM ASSESSMENTS (Depends on Teams and Assessments)
        // -----------------------
        console.log('🎯 Step 12: Seeding Team Assessments...');
        let teamAssessmentCount = 0;

        for (const assessment of assessmentArray) {
            if (assessment.submissionType !== SubmissionType.TEAM) continue;

            const classTeams = teamArray.filter(t => t.class.id === assessment.class.id);
            for (const team of classTeams) {
                const teamAssessment = new TeamAssessment();
                teamAssessment.assessment = assessment;
                teamAssessment.team = team;
                await queryRunner.manager.save(teamAssessment);
                teamAssessmentCount++;
            }
        }
        console.log(`✅ Created ${teamAssessmentCount} team assessments`);

        // -----------------------
        // SEED STEP 13: USER AI KEYS (Depends on Users, only for teachers, 8-12)
        // -----------------------
        console.log('🔐 Step 13: Seeding User AI Keys...');
        const aiKeyCount = faker.number.int({ min: 8, max: 12 });
        const teacherUsers = usersData.slice(0, teacherCount);
        const providers = ['openai', 'anthropic', 'openrouter', 'gemini', 'cohere'];
        const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2', 'llama-2', 'mistral'];

        for (let i = 0; i < Math.min(aiKeyCount, teacherUsers.length); i++) {
            const userAIKey = new UserAIKey();
            userAIKey.user = teacherUsers[i];
            userAIKey.userId = teacherUsers[i].id;
            userAIKey.provider = providers[i % providers.length];
            userAIKey.model = models[i % models.length];
            userAIKey.encryptedKey = `encrypted_key_${faker.string.alphanumeric(32)}`;
            userAIKey.apiEndpoint = `https://api.${userAIKey.provider}.com/v1`;
            userAIKey.isActive = i < aiKeyCount - 2;
            userAIKey.isValid = faker.datatype.boolean(0.9);
            userAIKey.label = `${userAIKey.provider} Key - ${userAIKey.model}`;
            await queryRunner.manager.save(userAIKey);
        }
        console.log(`✅ Created ${Math.min(aiKeyCount, teacherUsers.length)} AI keys`);

        // -----------------------
        // SEED STEP 14: AI USAGE LOGS (Depends on Users and UserAIKeys)
        // -----------------------
        console.log('📊 Step 14: Seeding AI Usage Logs...');
        let logCount = 0;

        for (const user of allUsers) {
            const logsPerUser = faker.number.int({ min: 0, max: 5 });
            for (let l = 0; l < logsPerUser; l++) {
                const log = new AIUsageLog();
                log.title = faker.helpers.arrayElement([
                    'Code Review',
                    'Syntax Check',
                    'Algorithm Analysis',
                    'Performance Review',
                    'Bug Detection'
                ]);
                log.usingDate = randomDateWithinLast2Months();
                log.inputTokenCount = faker.number.int({ min: 100, max: 2000 });
                log.outputTokenCount = faker.number.int({ min: 50, max: 1500 });
                log.user = user;
                log.userKey = null;

                await queryRunner.manager.save(log);
                logCount++;
            }
        }
        console.log(`✅ Created ${logCount} AI usage logs`);

        // -----------------------
        // SEED STEP 15: PAYMENTS (Depends on Users and CreditPackages, 100-150)
        // -----------------------
        console.log('💳 Step 15: Seeding Payments...');
        const paymentArray: Payment[] = [];
        let paymentCount = 0;

        for (let p = 0; p < 130; p++) {
            const payment = new Payment();
            const randomUser = allUsers[faker.number.int({ min: 0, max: allUsers.length - 1 })];
            payment.user = randomUser;
            payment.creditPackage = creditPackages[faker.number.int({ min: 0, max: creditPackages.length - 1 })];
            payment.paymentMethod = faker.helpers.arrayElement([
                PaymentMethod.CREDIT_CARD,
                PaymentMethod.PAYPAL,
                PaymentMethod.BAKOGN
            ]);
            payment.amount = faker.number.float({ min: 5, max: 100, fractionDigits: 2 });
            payment.currency = Currency.USD;

            // Payment date within last 2 months
            payment.created_at = randomDateWithinLast2Months();

            const statusDistribution = faker.number.int({ min: 0, max: 100 });
            if (statusDistribution < 70) {
                payment.status = PaymentStatus.COMPLETED;
            } else if (statusDistribution < 85) {
                payment.status = PaymentStatus.PENDING;
            } else {
                payment.status = PaymentStatus.FAILED;
            }

            if (payment.status === PaymentStatus.COMPLETED) {
                payment.transactionId = `TXN-${faker.string.alphanumeric(16)}`;
                if (payment.paymentMethod === PaymentMethod.BAKOGN) {
                    payment.transactionDetails = {
                        hash: faker.string.alphanumeric(32),
                        fromAccountId: faker.string.alphanumeric(20),
                        toAccountId: faker.string.alphanumeric(20),
                        currency: payment.currency,
                        amount: payment.amount,
                        description: `Purchase of ${payment.creditPackage.name}`,
                        createdDateMs: payment.created_at.getTime(),
                        acknowledgedDateMs: payment.created_at.getTime(),
                        trackingStatus: 'CONFIRMED',
                        receiverBank: 'ACLEDA',
                        receiverBankAccount: '****1234'
                    };
                }
            }

            if (payment.status === PaymentStatus.PENDING || faker.datatype.boolean(0.3)) {
                payment.imgProof = `https://storage.example.com/proof-${faker.string.alphanumeric(16)}.jpg`;
            }

            paymentArray.push(await queryRunner.manager.save(payment));
            paymentCount++;
        }
        console.log(`✅ Created ${paymentCount} payments`);

        // -----------------------
        // SEED STEP 16: WALLET TRANSACTIONS (Depends on UserCreditBalance, 150-250)
        // -----------------------
        console.log('💰 Step 16: Seeding Wallet Transactions...');
        let transactionCount = 0;

        for (const wallet of Array.from(walletMap.values())) {
            const transactionCount_ = faker.number.int({ min: 0, max: 5 });
            let currentBalance = wallet.creditBalance;

            for (let t = 0; t < transactionCount_; t++) {
                const transaction = new WalletTransaction();
                transaction.wallet = wallet;
                transaction.walletId = wallet.id;
                transaction.balanceBefore = currentBalance;

                const isCredit = faker.datatype.boolean(0.4);
                transaction.type = isCredit ? TransactionType.CREDIT : TransactionType.DEBIT;
                transaction.amount = faker.number.float({ min: 100, max: 5000, fractionDigits: 2 });

                if (isCredit) {
                    transaction.reason = faker.helpers.arrayElement([
                        TransactionReason.PURCHASE,
                        TransactionReason.BONUS,
                        TransactionReason.ADMIN_ADJUSTMENT
                    ]);
                    currentBalance += transaction.amount;
                } else {
                    transaction.reason = faker.helpers.arrayElement([
                        TransactionReason.AI_USAGE,
                        TransactionReason.REFUND
                    ]);
                    currentBalance = Math.max(0, currentBalance - transaction.amount);
                }

                transaction.balanceAfter = currentBalance;
                transaction.description = faker.lorem.sentence();
                transaction.metadata = {
                    source: transaction.reason,
                    timestamp: randomDateWithinLast2Months().toISOString()
                };

                transaction.created_at = randomDateWithinLast2Months();

                await queryRunner.manager.save(transaction);
                transactionCount++;
            }
        }
        console.log(`✅ Created ${transactionCount} wallet transactions`);

        // -----------------------
        // FINAL SUMMARY
        // -----------------------
        await queryRunner.commitTransaction();
        console.log('\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            '✅ SEEDING COMPLETED SUCCESSFULLY!\n' +
            '═══════════════════════════════════════════════════════════════\n' +
            `📊 Data Summary:\n` +
            `   • Users: ${allUsers.length}\n` +
            `   • Credit Packages: ${creditPackages.length}\n` +
            `   • Classes: ${classData.length}\n` +
            `   • Enrollments: ${enrollmentCount}\n` +
            `   • Teams: ${teamCount}\n` +
            `   • Team Members: ${teamMemberCount}\n` +
            `   • Assessments: ${assessmentArray.length}\n` +
            `   • Submissions: ${submissionCount}\n` +
            `   • Evaluations: ${evaluationCount}\n` +
            `   • Team Assessments: ${teamAssessmentCount}\n` +
            `   • AI Keys: ${Math.min(aiKeyCount, teacherUsers.length)}\n` +
            `   • AI Usage Logs: ${logCount}\n` +
            `   • Payments: ${paymentCount}\n` +
            `   • Wallet Transactions: ${transactionCount}\n` +
            `   • Total Records: ${allUsers.length + creditPackages.length + classData.length + enrollmentCount + teamCount + teamMemberCount + assessmentArray.length + submissionCount + evaluationCount + teamAssessmentCount + Math.min(aiKeyCount, teacherUsers.length) + logCount + paymentCount + transactionCount}\n` +
            '═══════════════════════════════════════════════════════════════\n'
        );
    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}
seed();