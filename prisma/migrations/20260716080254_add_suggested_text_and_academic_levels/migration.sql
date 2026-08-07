-- AlterTable
ALTER TABLE "AiFlag" ADD COLUMN     "suggestedText" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "enrolledGradeLevel" TEXT;

-- CreateTable
CREATE TABLE "StudentSubjectLevel" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubjectLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSubjectLevel_studentId_idx" ON "StudentSubjectLevel"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSubjectLevel_studentId_subject_key" ON "StudentSubjectLevel"("studentId", "subject");

-- AddForeignKey
ALTER TABLE "StudentSubjectLevel" ADD CONSTRAINT "StudentSubjectLevel_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
