-- CreateEnum
CREATE TYPE "Role" AS ENUM ('TEACHER', 'ACADEMIC_COORDINATOR', 'SCHOOL_ADMIN', 'THERAPIST');

-- CreateEnum
CREATE TYPE "AdminTitle" AS ENUM ('VP', 'PRINCIPAL', 'SCHOOL_DIRECTOR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Program" AS ENUM ('FULL_INCLUSION_NO_SERVICES', 'FULL_INCLUSION_SHADOW', 'PARTIAL_INCLUSION_PULLOUT', 'PARTIAL_INCLUSION_INTENSIVE', 'PRE_VOCATIONAL', 'EARLY_CHILDHOOD');

-- CreateEnum
CREATE TYPE "ProgramConfidence" AS ENUM ('INFERRED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "TherapistStatus" AS ENUM ('NONE', 'IN_HOUSE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "IepStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'REVISIONS_NEEDED', 'COORDINATOR_APPROVED', 'ADMIN_APPROVED', 'APPROVED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('STUDENT_PARENT_INFO', 'BACKGROUND_HISTORY', 'PRESENT_LEVEL_OF_PERFORMANCE', 'ANNUAL_GOALS', 'QUARTERLY_ACADEMIC_GOALS', 'ACCOMMODATIONS', 'MODIFICATIONS', 'RECOMMENDATIONS_AND_CONSENT');

-- CreateEnum
CREATE TYPE "FlagStake" AS ENUM ('LOW', 'HIGH');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDING_COORDINATOR', 'VISIBLE_TO_TEACHER', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('UPLOAD', 'PARSE_COMPLETE', 'AI_REVIEW_COMPLETE', 'FLAG_APPROVED', 'FLAG_DISMISSED', 'COMMENT_ADDED', 'COMMENT_REPLIED', 'COMMENT_RESOLVED', 'COORDINATOR_APPROVAL', 'ADMIN_APPROVAL', 'FINAL_APPROVED', 'STATUS_CHANGED', 'PROGRAM_CONFIRMED', 'USER_APPROVED', 'USER_SUSPENDED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role",
    "adminTitle" "AdminTitle",
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "program" "Program",
    "programConfidence" "ProgramConfidence" NOT NULL DEFAULT 'INFERRED',
    "programConfirmedById" TEXT,
    "programConfirmedAt" TIMESTAMP(3),
    "therapistStatus" "TherapistStatus" NOT NULL DEFAULT 'NONE',
    "therapistNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTeacher" (
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTeacher_pkey" PRIMARY KEY ("studentId","userId")
);

-- CreateTable
CREATE TABLE "Iep" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "quarter" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "status" "IepStatus" NOT NULL DEFAULT 'DRAFT',
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Iep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IepSection" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "rawHtml" TEXT NOT NULL,
    "plainText" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "structuredData" JSONB,
    "changedFromPrevVersion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IepSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiFlag" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "stake" "FlagStake" NOT NULL,
    "status" "FlagStatus" NOT NULL,
    "category" TEXT NOT NULL,
    "highlightStart" INTEGER NOT NULL,
    "highlightEnd" INTEGER NOT NULL,
    "highlightText" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "coordinatorNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "highlightStart" INTEGER NOT NULL,
    "highlightEnd" INTEGER NOT NULL,
    "highlightText" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReply" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "adminTitle" "AdminTitle",
    "note" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionHistory" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_accountStatus_idx" ON "User"("role", "accountStatus");

-- CreateIndex
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Iep_studentId_status_idx" ON "Iep"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Iep_studentId_schoolYear_quarter_version_key" ON "Iep"("studentId", "schoolYear", "quarter", "version");

-- CreateIndex
CREATE INDEX "IepSection_iepId_idx" ON "IepSection"("iepId");

-- CreateIndex
CREATE UNIQUE INDEX "IepSection_iepId_sectionType_key" ON "IepSection"("iepId", "sectionType");

-- CreateIndex
CREATE INDEX "AiFlag_iepId_status_idx" ON "AiFlag"("iepId", "status");

-- CreateIndex
CREATE INDEX "AiFlag_status_idx" ON "AiFlag"("status");

-- CreateIndex
CREATE INDEX "Comment_iepId_status_idx" ON "Comment"("iepId", "status");

-- CreateIndex
CREATE INDEX "Approval_iepId_idx" ON "Approval"("iepId");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_iepId_stage_key" ON "Approval"("iepId", "stage");

-- CreateIndex
CREATE INDEX "ActionHistory_iepId_createdAt_idx" ON "ActionHistory"("iepId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionHistory_actorId_idx" ON "ActionHistory"("actorId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_programConfirmedById_fkey" FOREIGN KEY ("programConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTeacher" ADD CONSTRAINT "StudentTeacher_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTeacher" ADD CONSTRAINT "StudentTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Iep" ADD CONSTRAINT "Iep_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Iep" ADD CONSTRAINT "Iep_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IepSection" ADD CONSTRAINT "IepSection_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFlag" ADD CONSTRAINT "AiFlag_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFlag" ADD CONSTRAINT "AiFlag_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "IepSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFlag" ADD CONSTRAINT "AiFlag_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "IepSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionHistory" ADD CONSTRAINT "ActionHistory_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionHistory" ADD CONSTRAINT "ActionHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
