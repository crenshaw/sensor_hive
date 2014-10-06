<?php

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;
use Uplabs\DatabaseManager;

//Require Autoloader
require_once __DIR__.'/../vendor/autoload.php';

//Load Configuration File
$yaml = new \Symfony\Component\Yaml\Parser();
$config = $yaml->parse(file_get_contents(__DIR__ . "/../config/local.yml"));

//Silex Application which will handle routing
$app = new Application();

//Database Manager to handle DB interaction
$dbm = new DatabaseManager();

//Allow for JSON request data and create DB Connection
$app->before(function (Request $request) use($dbm,$config) {
    if (0 === strpos($request->headers->get('Content-Type'), 'application/json')) {
        $data = json_decode($request->getContent(), true);
        $request->request->replace(is_array($data) ? $data : array());
    }

    $dsn = $config['dsn'];
    $user = $config['user'];
    $pass = $config['pass'];
    $pdo = new PDO($dsn,$user,$pass);

    $dbm->pdo = $pdo;
});

$app->post('/api/insert', function(Request $request) use($app, $dbm) {

    $post[0] = $experimentName = $request->request->get('experiment_name');
    $post[1] = $deviceNumber = intval($request->request->get('device_number'));
    $post[2] = $portNumber = intval($request->request->get('port_number'));
    $post[3] = $timestamp = $request->request->get('timestamp');
    $post[4] = $value = floatval($request->request->get('value'));
    $post[5] = $unit = $request->request->get('unit');

    $result = $dbm->insert($post);

    return $app->json($result, 201);
});

$app->get('/api/retrieveAll', function() use ($app, $dbm) {
   $result = $dbm->retrieveAll();

    return $app->json($result, 200);
});

$app->run();