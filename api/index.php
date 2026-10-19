<?php
// Carga directa de FlightPHP
require 'flight/Flight.php';

// Conexión a MySQL con PDO (Asegúrate de que usuario 'root' y contraseña '' coincidan con tu XAMPP)
Flight::register('db', 'PDO', array('mysql:host=localhost;dbname=practica05_bioinformatica;charset=utf8mb4', 'root', ''), function($db) {
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
});

// Habilitar CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Route 1: Catálogo de Especies
Flight::route('GET /api/especies', function() {
    $stmt = Flight::db()->query("SELECT * FROM especies");
    Flight::json($stmt->fetchAll());
});

// Route 2: Guardar Simulación
Flight::route('POST /api/simulaciones', function() {
    $data = Flight::request()->data;
    
    $stmt = Flight::db()->prepare("
        INSERT INTO simulaciones (nombre, especie_id, modelo_matematico, temperatura_ambiente, humedad_suelo, duracion_ticks, biomasa_final, altura_final, notas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $data['nombre'],
        $data['especie_id'],
        $data['modelo_matematico'],
        $data['temperatura_ambiente'],
        $data['humedad_suelo'],
        $data['duracion_ticks'],
        $data['biomasa_final'],
        $data['altura_final'],
        $data['notas'] ?? ''
    ]);
    
    $simId = Flight::db()->lastInsertId();
    Flight::json(['success' => true, 'id' => $simId]);
});

// Route 3: Reporte Top Simulaciones
Flight::route('GET /api/reportes', function() {
    $topBiomasa = Flight::db()->query("
        SELECT s.nombre, e.nombre_comun, s.biomasa_final, s.altura_final, s.modelo_matematico 
        FROM simulaciones s 
        JOIN especies e ON s.especie_id = e.id 
        ORDER BY s.biomasa_final DESC LIMIT 5
    ")->fetchAll();

    $eficienciaEspecie = Flight::db()->query("
        SELECT e.nombre_comun, AVG(s.biomasa_final) as promedio_biomasa 
        FROM simulaciones s 
        JOIN especies e ON s.especie_id = e.id 
        GROUP BY e.id ORDER BY promedio_biomasa DESC LIMIT 1
    ")->fetch();

    Flight::json([
        'top_biomasa' => $topBiomasa,
        'especie_mas_eficiente' => $eficienciaEspecie
    ]);
});

Flight::start();