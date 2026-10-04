DROP DATABASE IF EXISTS velora;
CREATE DATABASE velora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE velora;

CREATE TABLE users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','moderator','user') NOT NULL DEFAULT 'user',
    is_active TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY username_unique (username),
    KEY email_idx (email),
    KEY role_idx (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_tokens (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    jti TEXT NOT NULL,
    PRIMARY KEY (id),
    KEY user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(60) NOT NULL DEFAULT 'General',
    image_url VARCHAR(255) NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY category_idx (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (username, email, password, role, is_active, created_at, updated_at)
VALUES (
    'admin',
    'admin@velora.com',
    '$2y$12$AGWAwxoNVl4QvAhGZTQPaenKpCUnhdhzbtSy34PPtGE.xij7KLokK',
    'admin',
    1,
    NOW(),
    NULL
);

INSERT INTO products (product_name, description, price, quantity, category, image_url) VALUES
('Ceramic Brake Pad Set', 'Low-dust ceramic pads with quiet, progressive stopping power. Fits most compact and midsize sedans.', 89.99, 24, 'Brakes', '/parts/brake-pads.svg'),
('Slotted Brake Rotor', 'Vented, slotted rotor that sheds heat and gas for consistent bite on spirited drives.', 129.50, 12, 'Brakes', '/parts/brake-rotor.svg'),
('Turbocharger Kit', 'Ball-bearing turbo kit with intercooler piping for a clean, reliable power gain.', 1249.00, 4, 'Engine', '/parts/turbo.svg'),
('Iridium Spark Plug (4 pack)', 'Fine-wire iridium plugs for crisp ignition, better fuel economy and long service life.', 54.00, 60, 'Engine', '/parts/spark-plug.svg'),
('High-Flow Oil Filter', 'Synthetic-media oil filter with anti-drain valve and a high capacity for longer intervals.', 16.75, 120, 'Engine', '/parts/oil-filter.svg'),
('Coilover Suspension Kit', 'Height and damping adjustable coilovers that balance daily comfort and track grip.', 899.00, 6, 'Suspension', '/parts/coilover.svg'),
('LED Headlight Set', 'Plug-and-play 6000K LED headlight conversion with built-in cooling and sharp beam cutoff.', 149.99, 30, 'Lighting', '/parts/headlight.svg'),
('Forged Alloy Wheel 19"', 'Lightweight forged 19-inch alloy wheel in gloss graphite. Sold individually.', 389.00, 16, 'Wheels', '/parts/wheel.svg'),
('AGM Car Battery 70Ah', 'Maintenance-free AGM battery with strong cold-cranking power and start-stop support.', 219.00, 18, 'Electrical', '/parts/battery.svg');

SELECT 'Database setup complete.' AS status;
