-- AlterTable
ALTER TABLE "AiFlag" ADD COLUMN     "teacherDecidedById" TEXT;

-- AddForeignKey
ALTER TABLE "AiFlag" ADD CONSTRAINT "AiFlag_teacherDecidedById_fkey" FOREIGN KEY ("teacherDecidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
