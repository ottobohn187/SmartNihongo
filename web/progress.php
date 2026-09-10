<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime' => 2592000, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
    http_response_code(405);
    echo json_encode(['ok' => false]);
    exit;
}

$input = $_SERVER['REQUEST_METHOD'] === 'POST' ? json_decode((string) file_get_contents('php://input'), true) : $_GET;
$learnerId = (string) ($input['learnerId'] ?? '');
$state = $input['state'] ?? null;
if (!preg_match('/^[a-f0-9-]{36}$/', $learnerId) || ($_SERVER['REQUEST_METHOD'] === 'POST' && !is_array($state))) {
    http_response_code(422);
    echo json_encode(['ok' => false]);
    exit;
}

$rawConfig = (string) file_get_contents(__DIR__ . '/private-config.php');
$readConfig = static function (string $key) use ($rawConfig): string {
    if (!preg_match('/\\$config->' . preg_quote($key, '/') . '\\s*=\\s*[\'\"]([^\'\"]+)[\'\"]/', $rawConfig, $match)) {
        throw new RuntimeException('Missing database configuration');
    }
    return $match[1];
};
$dbHost = $readConfig('dbHost');
$dbPort = $readConfig('dbPort');
$dbName = $readConfig('dbName');
$dbUser = $readConfig('dbUser');
$dbPass = $readConfig('dbPass');

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
    );
    $pdo->exec("CREATE TABLE IF NOT EXISTS sn_web_progress (
        learner_id CHAR(36) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        learning_goal VARCHAR(32) NOT NULL DEFAULT '',
        progress_json MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    try { $pdo->exec('ALTER TABLE sn_web_progress ADD COLUMN user_id BIGINT UNSIGNED NULL, ADD INDEX user_progress (user_id)'); } catch (Throwable $ignored) {}
    $userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $userId ? $pdo->prepare('SELECT progress_json FROM sn_web_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1') : $pdo->prepare('SELECT progress_json FROM sn_web_progress WHERE learner_id = ? LIMIT 1');
        $stmt->execute([$userId ?: $learnerId]);
        $saved = $stmt->fetchColumn();
        echo json_encode(['ok' => true, 'state' => $saved ? json_decode($saved, true) : null]); exit;
    }
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > 262144) throw new RuntimeException('Invalid progress');
    $stmt = $pdo->prepare('INSERT INTO sn_web_progress (learner_id, user_id, learning_goal, progress_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), learning_goal=VALUES(learning_goal), progress_json=VALUES(progress_json)');
    $stmt->execute([$learnerId, $userId, substr((string) ($state['learningGoal'] ?? ''), 0, 32), $json]);
    echo json_encode(['ok' => true]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['ok' => false]);
}
