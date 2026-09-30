CREATE TABLE `assets` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`kind` text NOT NULL,
	`location` text NOT NULL,
	`status` text NOT NULL,
	`health` text NOT NULL,
	`progress` integer NOT NULL,
	`weight` text NOT NULL,
	`started_at` text NOT NULL,
	`expected_at` text NOT NULL,
	`customer_id` text,
	`package_id` text,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE INDEX `assets_customer` ON `assets` (`tenant`,`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`email_verified` integer NOT NULL,
	`phone_verified` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE TABLE `demo_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`asset_id` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`kind` text NOT NULL,
	`metric` text NOT NULL,
	`image_url` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE INDEX `logs_asset` ON `logs` (`tenant`,`asset_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`asset_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`package_id` text NOT NULL,
	`package_name` text NOT NULL,
	`price` integer NOT NULL,
	`days` integer NOT NULL,
	`terms` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`expected_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_order_per_asset` ON `orders` (`tenant`,`asset_id`);--> statement-breakpoint
CREATE INDEX `orders_customer` ON `orders` (`tenant`,`customer_id`);--> statement-breakpoint
CREATE TABLE `packages` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`kind` text NOT NULL,
	`price` integer NOT NULL,
	`days` integer NOT NULL,
	`description` text NOT NULL,
	`benefits` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`asset_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`kind` text NOT NULL,
	`note` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE INDEX `requests_customer` ON `requests` (`tenant`,`customer_id`);