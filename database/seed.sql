CREATE DATABASE IF NOT EXISTS practica05_bioinformatica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE practica05_bioinformatica;

DROP TABLE IF EXISTS decisiones;
DROP TABLE IF EXISTS mediciones;
DROP TABLE IF EXISTS simulaciones;
DROP TABLE IF EXISTS especies;

CREATE TABLE especies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_comun VARCHAR(100) NOT NULL,
    nombre_cientifico VARCHAR(100) NOT NULL,
    tasa_crecimiento_base FLOAT NOT NULL,
    capacidad_carga_base FLOAT NOT NULL,
    temp_optima FLOAT NOT NULL,
    humedad_optima FLOAT NOT NULL,
    dias_madurez INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE simulaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    especie_id INT NOT NULL,
    modelo_matematico ENUM('lineal', 'exponencial', 'logistico', 'gompertz') NOT NULL DEFAULT 'logistico',
    temperatura_ambiente FLOAT NOT NULL,
    humedad_suelo FLOAT NOT NULL,
    duracion_ticks INT NOT NULL DEFAULT 0,
    biomasa_final FLOAT DEFAULT 0.0,
    altura_final FLOAT DEFAULT 0.0,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (especie_id) REFERENCES especies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE mediciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    simulacion_id INT NOT NULL,
    tick INT NOT NULL,
    altura FLOAT NOT NULL,
    biomasa FLOAT NOT NULL,
    estres_termico FLOAT NOT NULL,
    estres_hidrico FLOAT NOT NULL,
    icr FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (simulacion_id) REFERENCES simulaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE decisiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    simulacion_id INT NOT NULL,
    tick INT NOT NULL,
    alerta VARCHAR(255) NOT NULL,
    recomendacion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (simulacion_id) REFERENCES simulaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Datos iniciales obligatorios
INSERT INTO especies (nombre_comun, nombre_cientifico, tasa_crecimiento_base, capacidad_carga_base, temp_optima, humedad_optima, dias_madurez) VALUES
('Azucena', 'Lilium candidum', 0.08, 2.50, 20.0, 60.0, 90),
('Maíz', 'Zea mays', 0.12, 3.20, 25.0, 65.0, 100),
('Arabidopsis', 'Arabidopsis thaliana', 0.15, 0.80, 22.0, 55.0, 45),
('Tomate', 'Solanum lycopersicum', 0.10, 2.10, 23.0, 70.0, 80);