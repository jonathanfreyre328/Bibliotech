SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

DROP DATABASE IF EXISTS bibliotech;
CREATE DATABASE bibliotech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bibliotech;

CREATE USER IF NOT EXISTS 'bibliotech'@'localhost' IDENTIFIED BY 'bibliotech';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON bibliotech.* TO 'bibliotech'@'localhost';

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    dni VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(40) NOT NULL,
    birth_date DATE NOT NULL,
    career_id INT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    duracion_años TINYINT UNSIGNED NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    career_id INT NOT NULL,
    año TINYINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_subject (career_id, año, name),
    FOREIGN KEY (career_id) REFERENCES careers(id)
);

CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    professor_id INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (professor_id) REFERENCES users(id),
    INDEX idx_classes_professor (professor_id),
    INDEX idx_classes_subject (subject_id)
);

CREATE TABLE student_subject_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'removed') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    UNIQUE KEY uq_student_class_request (student_id, class_id),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_requests_class_status (class_id, status),
    INDEX idx_requests_student_status (student_id, status)
);

CREATE TABLE materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    original_filename VARCHAR(255) NOT NULL,
    author VARCHAR(180) NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_materials_owner (uploaded_by)
);

CREATE TABLE material_classes (
    material_id INT NOT NULL,
    class_id INT NOT NULL,
    PRIMARY KEY (material_id, class_id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

ALTER TABLE users ADD CONSTRAINT fk_users_career FOREIGN KEY (career_id) REFERENCES careers(id);

INSERT INTO roles (name) VALUES ('admin'), ('professor'), ('student');
INSERT INTO users (username, password, first_name, last_name, dni, email, phone, birth_date)
VALUES ('admin', '$2b$10$.n0s847tiSxBqDvIo6Vg5ujXC5zIUmm98bTjBWnRdqX9CxxbIo7wS',
    'Administrador', 'Principal', 'ADMIN-001', 'admin@bibliotech.local', '0000000000', '2000-01-01');
INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.username = 'admin' AND r.name = 'admin';

-- Seed demo: carrera, materia y clase del profesor demo (flujo completo probado sin panel admin)
INSERT INTO careers (`name`, `duracion_años`) VALUES ('Tecnicatura Superior en Análisis de Sistemas', 3);

INSERT INTO users (username, password, first_name, last_name, dni, email, phone, birth_date)
VALUES ('profesor', '$2b$10$.n0s847tiSxBqDvIo6Vg5ujXC5zIUmm98bTjBWnRdqX9CxxbIo7wS',
    'Profesor', 'Principal', '22233344', 'profesor@bibliotech.local', '0000000000', '1990-01-01');

INSERT INTO users (username, password, first_name, last_name, dni, email, phone, birth_date, career_id)
SELECT 'alumno', '$2b$10$.n0s847tiSxBqDvIo6Vg5ujXC5zIUmm98bTjBWnRdqX9CxxbIo7wS',
    'Alumno', 'Principal', '111222333', 'alumno@bibliotech.local', '0000000000', '2001-01-01', c.id
FROM careers c WHERE c.name = 'Tecnicatura Superior en Análisis de Sistemas';

INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.username = 'profesor' AND r.name = 'professor';

INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.username = 'alumno' AND r.name = 'student';

INSERT INTO subjects (career_id, `año`, `name`)
SELECT id, 2, 'Prácticas II' FROM careers WHERE name = 'Tecnicatura Superior en Análisis de Sistemas';

INSERT INTO classes (subject_id, professor_id)
SELECT s.id, u.id
FROM subjects s
JOIN users u ON u.username = 'profesor'
WHERE s.name = 'Prácticas II';

SET foreign_key_checks = 1;