CREATE TABLE `log_images` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`log_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`file_name` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `log_images_object_key` ON `log_images` (`object_key`);--> statement-breakpoint
CREATE INDEX `log_images_log` ON `log_images` (`tenant`,`log_id`);--> statement-breakpoint
CREATE INDEX `log_images_asset` ON `log_images` (`tenant`,`asset_id`,`created_at`);