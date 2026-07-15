-- CreateTable
CREATE TABLE `GatewayCharge` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `payerRef` VARCHAR(120) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `providerRef` VARCHAR(160) NULL,
    `message` TEXT NULL,
    `initiatedBy` VARCHAR(190) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GatewayCharge_tenantId_idx`(`tenantId`),
    INDEX `GatewayCharge_invoiceId_idx`(`invoiceId`),
    INDEX `GatewayCharge_providerRef_idx`(`providerRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GatewayCharge` ADD CONSTRAINT `GatewayCharge_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GatewayCharge` ADD CONSTRAINT `GatewayCharge_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `SubscriptionInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
