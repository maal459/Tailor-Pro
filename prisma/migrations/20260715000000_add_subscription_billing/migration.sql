-- AlterTable: platform billing state on each tenant
ALTER TABLE `Tenant`
    ADD COLUMN `billingCycle` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'MONTHLY',
    ADD COLUMN `currentPeriodEnd` DATETIME(3) NULL,
    ADD COLUMN `autoCollect` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `gatewayProvider` VARCHAR(20) NULL,
    ADD COLUMN `gatewayPayerRef` VARCHAR(120) NULL;

-- CreateTable
CREATE TABLE `PlanPrice` (
    `id` VARCHAR(191) NOT NULL,
    `plan` ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE') NOT NULL,
    `monthlyPrice` DECIMAL(10, 2) NOT NULL,
    `yearlyPrice` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlanPrice_plan_key`(`plan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `plan` ENUM('FREE', 'BASIC', 'PRO', 'ENTERPRISE') NOT NULL,
    `billingCycle` ENUM('MONTHLY', 'YEARLY') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SubscriptionInvoice_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `SubscriptionInvoice_status_dueDate_idx`(`status`, `dueDate`),
    INDEX `SubscriptionInvoice_tenantId_periodStart_idx`(`tenantId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPayment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `method` ENUM('CASH', 'ZAAD', 'EDAHAB', 'BANK_TRANSFER', 'CARD', 'MANUAL', 'OTHER') NOT NULL DEFAULT 'MANUAL',
    `gatewayProvider` VARCHAR(20) NULL,
    `gatewayRef` VARCHAR(160) NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedBy` VARCHAR(190) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SubscriptionPayment_tenantId_paidAt_idx`(`tenantId`, `paidAt`),
    INDEX `SubscriptionPayment_invoiceId_idx`(`invoiceId`),
    INDEX `SubscriptionPayment_gatewayRef_idx`(`gatewayRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SubscriptionInvoice` ADD CONSTRAINT `SubscriptionInvoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionPayment` ADD CONSTRAINT `SubscriptionPayment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SubscriptionInvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
