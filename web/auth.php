<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 30, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $raw = (string) file_get_contents(__DIR__ . '/private-config.php');
    $read = static function(string $key) use ($raw): string {
        if (!preg_match('/\\$config->' . preg_quote($key, '/') . '\\s*=\\s*[\'\"]([^\'\"]+)[\'\"]/', $raw, $m)) throw new RuntimeException('Configuration error');
        return $m[1];
    };
    $pdo = new PDO("mysql:host={$read('dbHost')};port={$read('dbPort')};dbname={$read('dbName')};charset=utf8mb4", $read('dbUser'), $read('dbPass'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $pdo->exec("CREATE TABLE IF NOT EXISTS sn_web_users (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(40) NOT NULL, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TIMESTAMP NULL, UNIQUE KEY username_unique (username)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    return $pdo;
}

function respond(array $data, int $status = 200): never { http_response_code($status); echo json_encode($data); exit; }
function currentUser(): ?array { return isset($_SESSION['user_id']) ? ['id' => (int) $_SESSION['user_id'], 'username' => (string) $_SESSION['username']] : null; }

$action = (string) ($_GET['action'] ?? 'status');
if ($action === 'status') respond(['ok' => true, 'user' => currentUser(), 'csrf' => $_SESSION['csrf'] ??= bin2hex(random_bytes(24))]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['ok' => false, 'error' => 'Method not allowed.'], 405);

$input = json_decode((string) file_get_contents('php://input'), true) ?: [];
if (!hash_equals((string) ($_SESSION['csrf'] ?? ''), (string) ($input['csrf'] ?? ''))) respond(['ok' => false, 'error' => 'Please refresh and try again.'], 403);
if ($action === 'logout') { $_SESSION = []; session_destroy(); respond(['ok' => true]); }

$username = trim((string) ($input['username'] ?? ''));
$password = (string) ($input['password'] ?? '');
if (!preg_match('/^[A-Za-z0-9_.-]{3,40}$/', $username)) respond(['ok' => false, 'error' => 'Username must be 3–40 letters, numbers, dots, dashes, or underscores.'], 422);
if (strlen($password) < 8 || strlen($password) > 200) respond(['ok' => false, 'error' => 'Password must be at least 8 characters.'], 422);

try {
    $pdo = db();
    if ($action === 'register') {
        $stmt = $pdo->prepare('INSERT INTO sn_web_users (username, password_hash) VALUES (?, ?)');
        try { $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]); }
        catch (PDOException $e) { if ((string) $e->getCode() === '23000') respond(['ok' => false, 'error' => 'That username is already taken.'], 409); throw $e; }
        $userId = (int) $pdo->lastInsertId();
    } elseif ($action === 'login') {
        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM sn_web_users WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !password_verify($password, $row['password_hash'])) { usleep(350000); respond(['ok' => false, 'error' => 'Incorrect username or password.'], 401); }
        $userId = (int) $row['id'];
        $username = (string) $row['username'];
        $pdo->prepare('UPDATE sn_web_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$userId]);
    } else respond(['ok' => false, 'error' => 'Unknown action.'], 404);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId; $_SESSION['username'] = $username; $_SESSION['csrf'] = bin2hex(random_bytes(24));
    respond(['ok' => true, 'user' => currentUser(), 'csrf' => $_SESSION['csrf']]);
} catch (Throwable $e) { respond(['ok' => false, 'error' => 'Account service is temporarily unavailable.'], 500); }
