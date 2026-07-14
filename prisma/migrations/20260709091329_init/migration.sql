-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(60) NOT NULL DEFAULT 'admin',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `customerNumber` VARCHAR(40) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `alternativePhone` VARCHAR(30) NULL,
    `email` VARCHAR(190) NULL,
    `address` VARCHAR(255) NULL,
    `city` VARCHAR(120) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_customerNumber_key`(`customerNumber`),
    INDEX `Customer_tenantId_phone_idx`(`tenantId`, `phone`),
    INDEX `Customer_tenantId_fullName_idx`(`tenantId`, `fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GarmentType` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GarmentType_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MeasurementProfile` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `garmentTypeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `notes` TEXT NULL,
    `measuredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MeasurementProfile_tenantId_customerId_idx`(`tenantId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Measurement` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `measurementProfileId` VARCHAR(191) NOT NULL,
    `fieldName` VARCHAR(120) NOT NULL,
    `fieldValue` VARCHAR(120) NOT NULL,
    `unit` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Measurement_tenantId_measurementProfileId_idx`(`tenantId`, `measurementProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveryDate` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('PENDING', 'CUTTING', 'SEWING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `overpaymentAllowed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_tenantId_orderDate_idx`(`tenantId`, `orderDate`),
    INDEX `Order_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `garmentTypeId` VARCHAR(191) NOT NULL,
    `measurementProfileId` VARCHAR(191) NULL,
    `fabric` VARCHAR(120) NULL,
    `color` VARCHAR(60) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `tailoringInstructions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_tenantId_orderId_idx`(`tenantId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMethod` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `code` ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER') NOT NULL,
    `label` VARCHAR(60) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentMethod_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `paymentMethodId` VARCHAR(191) NOT NULL,
    `receivedById` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `referenceNo` VARCHAR(120) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Payment_tenantId_orderId_idx`(`tenantId`, `orderId`),
    INDEX `Payment_tenantId_customerId_idx`(`tenantId`, `customerId`),
    INDEX `Payment_tenantId_paymentDate_idx`(`tenantId`, `paymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `actorUserId` VARCHAR(191) NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `action` VARCHAR(60) NOT NULL,
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `key` VARCHAR(120) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_tenantId_key_key`(`tenantId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MeasurementProfile` ADD CONSTRAINT `MeasurementProfile_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MeasurementProfile` ADD CONSTRAINT `MeasurementProfile_garmentTypeId_fkey` FOREIGN KEY (`garmentTypeId`) REFERENCES `GarmentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Measurement` ADD CONSTRAINT `Measurement_measurementProfileId_fkey` FOREIGN KEY (`measurementProfileId`) REFERENCES `MeasurementProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_garmentTypeId_fkey` FOREIGN KEY (`garmentTypeId`) REFERENCES `GarmentType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_measurementProfileId_fkey` FOREIGN KEY (`measurementProfileId`) REFERENCES `MeasurementProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
