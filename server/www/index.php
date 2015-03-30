<?php

use Silex\Application;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Encoder\MessageDigestPasswordEncoder;
use Uplabs\DatabaseManager;

//Require Autoloader
require_once __DIR__.'/../vendor/autoload.php';

//Load Configuration File
$yaml = new \Symfony\Component\Yaml\Parser();
$config = $yaml->parse(file_get_contents(__DIR__ . "/../config/local.yml"));
$encoder = new MessageDigestPasswordEncoder();
//Silex Application which will handle routing
$app = new Application();

$app['debug'] =true;

//Register twig service provider (render engine)
$app->register(new Silex\Provider\TwigServiceProvider(), array(
    'twig.path' => __DIR__ . '/../views',
));

//Register Security provider (Temporary until a custom provider is designed)
$app->register(new Silex\Provider\SecurityServiceProvider());

$app['security.firewalls'] = array(
    'admin' => array(
        'pattern' => 'addUser',
        'http' => true,
        'users' => array(
            $config['http-user'] => array('ROLE_ADMIN', $encoder->encodePassword($config['http-pass'], '')),
        ),
    ),
);

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

    error_log($request->request->get('timestamp'));

    $post['experimentName'] = $request->request->get('experiment_name');
    $post['deviceNumber'] = intval($request->request->get('device_number'));
    $post['portNumber'] = intval($request->request->get('port_number'));
    $post['timestamp'] = $request->request->get('timestamp');
    $post['value'] = floatval($request->request->get('value'));
    $post['unit'] = $request->request->get('unit');

    $result = $dbm->insert($post);

    return $app->json($result, 201);
});

$app->get('/api/retrieveAll', function() use ($app, $dbm) {
    $result = $dbm->retrieveAll();

    return $app->json($result, 200);
});

$app->get('/api/experiments/get/{name}', function($name) use($app, $dbm) {
    $result = $dbm->retrieveExperimentData($name);

    return $app->json($result, 200);
});

$app->get('/api/experiments/names', function() use($app, $dbm) {
    $result = $dbm->retrieveExperimentNames();

    return $app->json($result, 200);
});

$app->post('/api/addUser', function (Request $request) use ($app, $dbm) {
    $post['username'] = $request->request->get('username');
    $post['password'] = $request->request->get('password');


    $result = $dbm->addUser($post);

    if($result) {
        return $app->json([$result], 201);
    }

    return $app->json([$result], 302);
});

$app->post('/api/authUser', function(Request $request) use ($app, $dbm) {
    $post['user'] = $request->request->get('username');
    $post['pass'] = $request->request->get('password');

    $result = $dbm->authUser($post);

    if ($result) {
        return $app->json([true],200);
    }
    return $app->json([$result],200);
});

$app->get('/addUser', function () use ($app) {
   return $app['twig']->render('addUser.twig');
});

$app->get('/home', function() use($app) {
    return $app['twig']->render('index.twig');
});

$app->get('/', function () use ($app) {
   return $app->redirect('/home');
});

$app->after(function (Request $request, Response $response) {
    $response->headers->set('Access-Control-Allow-Origin', '*');
});

$app->run();