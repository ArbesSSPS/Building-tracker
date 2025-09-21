-- AlterTable
ALTER TABLE "public"."registration_codes" ADD COLUMN     "roomId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."registration_codes" ADD CONSTRAINT "registration_codes_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
