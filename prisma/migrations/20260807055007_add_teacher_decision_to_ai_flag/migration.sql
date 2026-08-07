-- CreateEnum
CREATE TYPE "TeacherDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'EDITED');

-- AlterTable
ALTER TABLE "AiFlag" ADD COLUMN     "teacherDecidedAt" TIMESTAMP(3),
ADD COLUMN     "teacherDecision" "TeacherDecision",
ADD COLUMN     "teacherEditedText" TEXT;
