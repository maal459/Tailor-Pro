/*
  Warnings:

  - Made the column `tenantId` on table `ActivityLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `ExpenseCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `GarmentType` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Measurement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `MeasurementProfile` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Payment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `PaymentMethod` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `ProductCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenantId` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenantId` on table `Salary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Setting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Supplier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ActivityLog` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Customer` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Employee` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Expense` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `ExpenseCategory` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `GarmentType` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Measurement` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `MeasurementProfile` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Order` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `OrderItem` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `PaymentMethod` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `ProductCategory` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Purchase` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `PurchaseItem` ADD COLUMN `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Salary` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Setting` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `Supplier` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `tenantId` VARCHAR(36) NOT NULL;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `ownerName` VARCHAR(150) NULL,
    `email` VARCHAR(190) NULL,
    `phone` VARCHAR(30) NULL,
    `address` VARCHAR(255) NULL,
    `logo` VARCHAR(255) NULL,
    `subscriptionPlan` ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'FREE',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    INDEX `Tenant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DataMigration: provision the default tenant for all pre-existing data.
-- The id matches the tenantId ('tenant_demo') already stored on every legacy row,
-- so the foreign keys added below validate without touching existing data.
INSERT INTO `Tenant` (`id`, `businessName`, `slug`, `ownerName`, `subscriptionPlan`, `status`, `createdAt`, `updatedAt`)
VALUES ('tenant_demo', 'Tailor Pro', 'tailor-pro', 'Shop Admin', 'PRO', 'ACTIVE', NOW(3), NOW(3));

-- CreateIndex
CREATE INDEX `ActivityLog_tenantId_entityType_entityId_idx` ON `ActivityLog`(`tenantId`, `entityType`, `entityId`);

-- CreateIndex
CREATE INDEX `Customer_tenantId_createdAt_idx` ON `Customer`(`tenantId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Expense_tenantId_categoryId_idx` ON `Expense`(`tenantId`, `categoryId`);

-- CreateIndex
CREATE INDEX `Order_tenantId_customerId_idx` ON `Order`(`tenantId`, `customerId`);

-- CreateIndex
CREATE INDEX `Product_tenantId_categoryId_idx` ON `Product`(`tenantId`, `categoryId`);

-- CreateIndex
CREATE INDEX `PurchaseItem_tenantId_purchaseId_idx` ON `PurchaseItem`(`tenantId`, `purchaseId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GarmentType` ADD CONSTRAINT `GarmentType_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MeasurementProfile` ADD CONSTRAINT `MeasurementProfile_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measurement` ADD CONSTRAINT `Measurement_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentMethod` ADD CONSTRAINT `PaymentMethod_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseCategory` ADD CONSTRAINT `ExpenseCategory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Salary` ADD CONSTRAINT `Salary_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCategory` ADD CONSTRAINT `ProductCategory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
