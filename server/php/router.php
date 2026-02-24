<?php
/**
 * Roteador para PHP built-in server
 * Permite /api/campaign (sem .php) e servir arquivos estáticos de public/
 *
 * Uso (na raiz do projeto doacao-animais):
 * php -S localhost:8080 server/php/router.php
 *
 * Ou a partir de server/php:
 * php -S localhost:8080 -t ../../public router.php
 * (e ajustar abaixo o path para api)
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Endpoint da API (simulado)
if ($uri === '/api/campaign') {
    require __DIR__ . '/api/campaign.php';
    return false;
}

// Encaminhar para public/index.html se for raiz
if ($uri === '/' || $uri === '') {
    $path = __DIR__ . '/../../public/index.html';
    if (file_exists($path)) {
        return false; // deixa o servidor servir o arquivo
    }
}

// Servir arquivos estáticos de public/
$publicPath = __DIR__ . '/../../public' . $uri;
if (file_exists($publicPath) && is_file($publicPath)) {
    return false;
}

// Fallback SPA: qualquer rota não encontrada -> index.html
$indexPath = __DIR__ . '/../../public/index.html';
if (file_exists($indexPath)) {
    $_SERVER['SCRIPT_NAME'] = '/index.html';
    include $indexPath;
    return true;
}

return false;
