<?php
/**
 * Endpoint simulado: retorna metas e valor arrecadado (JSON)
 * Uso com PHP built-in: php -S localhost:8080 -t public ../router.php
 * Ou configurar Apache/Nginx para apontar document root para server/php e acessar /api/campaign.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Dados simulados (futuro: consulta ao banco)
$campaign = [
    'goal'         => 50000,
    'goalExtended' => 200000,
    'collected'    => 42500
];

echo json_encode($campaign);
