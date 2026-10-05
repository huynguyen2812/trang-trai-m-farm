CREATE TABLE `customer_message_channels` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`customer_id` text NOT NULL,
	`channel` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`account_ref` text NOT NULL,
	`thread_ref` text NOT NULL,
	`consent_source` text NOT NULL,
	`granted_at` text,
	`withdrawn_at` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_message_channel_target` ON `customer_message_channels` (`tenant`,`customer_id`,`channel`,`provider`);--> statement-breakpoint
CREATE INDEX `customer_message_channel_customer` ON `customer_message_channels` (`tenant`,`customer_id`);--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`customer_id` text NOT NULL,
	`asset_id` text,
	`event` text NOT NULL,
	`channel` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`provider_message_id` text NOT NULL,
	`error_code` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`available_at` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_outbox_idempotency` ON `notification_outbox` (`tenant`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `notification_outbox_status` ON `notification_outbox` (`tenant`,`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `notification_outbox_customer` ON `notification_outbox` (`tenant`,`customer_id`);