-- AlterTable
ALTER TABLE `User` ADD COLUMN `permissions` JSON NULL;

-- CreateIndex
CREATE INDEX `User_tenantId_role_idx` ON `User`(`tenantId`, `role`);
