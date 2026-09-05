<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$configFile = __DIR__ . '/config.php';
$config = file_exists($configFile) ? require $configFile : require __DIR__ . '/config.example.php';
if (!empty($config['allowed_origin'])) header('Access-Control-Allow-Origin: ' . $config['allowed_origin']);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function out(array $data, int $status = 200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $v = json_decode(file_get_contents('php://input') ?: '{}', true); return is_array($v) ? $v : []; }
function need(array $data, array $keys): void { foreach ($keys as $key) if (!isset($data[$key]) || $data[$key] === '') out(['error' => "Missing field: $key"], 422); }
function db(): PDO {
    global $config;
    static $pdo;
    if (!$pdo) {
        try {
            $dsn = "mysql:host={$config['db_host']};port={$config['db_port']};dbname={$config['db_name']};charset=utf8mb4";
            $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]);
        } catch (Throwable $e) { out(['error' => 'Database unavailable. Import database/schema.sql and check api/config.php.'], 503); }
    }
    return $pdo;
}
function query(string $sql, array $args = []): PDOStatement { $s = db()->prepare($sql); $s->execute($args); return $s; }
function authorizationHeader(): string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp((string)$name, 'Authorization') === 0) { $header = (string)$value; break; }
        }
    }
    return trim($header);
}
function auth(bool $admin = false): array {
    $header = authorizationHeader();
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) out(['error' => 'Authentication required'], 401);
    $user = query('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW()', [hash('sha256', $m[1])])->fetch();
    if (!$user) out(['error' => 'Session expired'], 401);
    if ($admin && $user['role'] !== 'admin') out(['error' => 'Admin access required'], 403);
    return $user;
}
function tokenFor(int $id): string { $token = bin2hex(random_bytes(32)); query('INSERT INTO sessions(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL 7 DAY))', [$id, hash('sha256', $token)]); return $token; }

function roboflowDetect(string $image): array {
    global $config;
    $key = trim((string)($config['roboflow_api_key'] ?? ''));
    $url = trim((string)($config['roboflow_workflow_url'] ?? ''));
    if ($key === '' || $url === '') out(['error' => 'Roboflow is not configured'], 503);
    if (!function_exists('curl_init')) out(['error' => 'PHP cURL extension is required'], 503);

    // The browser sends a JPEG data URL; Roboflow expects only its base64 body.
    if (preg_match('#^data:image/(?:jpeg|jpg|png|webp);base64,(.+)$#s', $image, $m)) $image = $m[1];
    if ($image === '' || strlen($image) > 8_000_000 || base64_decode($image, true) === false) {
        out(['error' => 'Invalid or oversized camera image'], 422);
    }

    $payload = json_encode(['inputs' => ['image' => ['type' => 'base64', 'value' => $image]]], JSON_UNESCAPED_SLASHES);
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
        CURLOPT_POSTFIELDS => $payload,
    ]);
    $response = curl_exec($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($curl);
    curl_close($curl);
    if ($response === false) out(['error' => 'Roboflow connection failed' . ($curlError ? ': ' . $curlError : '')], 502);
    $decoded = json_decode($response, true);
    if ($status < 200 || $status >= 300) {
        $message = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? null) : null;
        out(['error' => is_string($message) ? $message : "Roboflow request failed ($status)"], 502);
    }
    if (!is_array($decoded)) out(['error' => 'Invalid Roboflow response'], 502);
    return $decoded;
}

$route = trim($_GET['route'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($route === 'health') out(['ok' => true, 'database' => (bool)db()->query('SELECT 1')]);
    if ($route === 'setup' && $method === 'POST') {
        if ((int)query('SELECT COUNT(*) FROM users')->fetchColumn() > 0) out(['error' => 'Setup already completed'], 409);
        $b=body(); need($b,['name','email','password']); if(strlen($b['password'])<8) out(['error'=>'Password must be at least 8 characters'],422);
        query('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,"admin")', [trim($b['name']),strtolower(trim($b['email'])),password_hash($b['password'],PASSWORD_DEFAULT)]);
        $id=(int)db()->lastInsertId(); out(['token'=>tokenFor($id),'user'=>['id'=>$id,'name'=>$b['name'],'email'=>strtolower($b['email']),'role'=>'admin']],201);
    }
    if ($route === 'login' && $method === 'POST') {
        $b=body(); need($b,['email','password']); $u=query('SELECT * FROM users WHERE email=?',[strtolower(trim($b['email']))])->fetch();
        if(!$u || !password_verify($b['password'],$u['password_hash'])) out(['error'=>'Invalid email or password'],401);
        out(['token'=>tokenFor((int)$u['id']),'user'=>['id'=>$u['id'],'name'=>$u['name'],'email'=>$u['email'],'role'=>$u['role']]]);
    }
    if ($route === 'me') out(['user'=>auth()]);
    if ($route === 'logout' && $method === 'POST') { auth(); $t=preg_replace('/^Bearer\s+/i','',authorizationHeader()); query('DELETE FROM sessions WHERE token_hash=?',[hash('sha256',$t)]); out(['ok'=>true]); }
    if ($route === 'roboflow/detect' && $method === 'POST') {
        auth(); $b=body(); need($b, ['image']); out(['result' => roboflowDetect((string)$b['image'])]);
    }
    if ($route === 'users') {
        auth(true); if($method==='GET') out(['users'=>query('SELECT id,name,email,role,created_at FROM users ORDER BY name')->fetchAll()]);
        $b=body(); need($b,['name','email','password','role']); query('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)',[$b['name'],strtolower($b['email']),password_hash($b['password'],PASSWORD_DEFAULT),$b['role']==='admin'?'admin':'operator']); out(['id'=>(int)db()->lastInsertId()],201);
    }
    if ($route === 'batches') {
        $u=auth(); if($method==='GET') out(['batches'=>query('SELECT b.*,u.name creator,(SELECT COUNT(*) FROM scans s WHERE s.batch_id=b.id) scan_count FROM batches b JOIN users u ON u.id=b.created_by ORDER BY b.started_at DESC')->fetchAll()]);
        $b=body(); need($b,['name']); query('INSERT INTO batches(name,notes,created_by) VALUES(?,?,?)',[trim($b['name']),$b['notes']??null,$u['id']]); out(['id'=>(int)db()->lastInsertId()],201);
    }
    if (preg_match('#^batches/(\d+)/close$#',$route,$m) && $method==='PATCH') { auth(); query('UPDATE batches SET status="closed",closed_at=NOW() WHERE id=?',[$m[1]]); out(['ok'=>true]); }
    if ($route === 'devices') {
        $u=auth(); if($method==='GET') out(['devices'=>query('SELECT * FROM devices ORDER BY created_at DESC')->fetchAll()]);
        $b=body(); need($b,['name','target_distance_mm']); query('INSERT INTO devices(name,phone_model,mount_type,target_distance_mm,distance_tolerance_mm,alignment_tolerance_deg,notes,created_by) VALUES(?,?,?,?,?,?,?,?)',[$b['name'],$b['phone_model']??null,$b['mount_type']??null,$b['target_distance_mm'],$b['distance_tolerance_mm']??5,$b['alignment_tolerance_deg']??3,$b['notes']??null,$u['id']]); out(['id'=>(int)db()->lastInsertId()],201);
    }
    if ($route === 'calibrations') {
        $u=auth(); if($method==='GET') out(['calibrations'=>query('SELECT c.*,d.name device_name FROM calibrations c LEFT JOIN devices d ON d.id=c.device_id ORDER BY c.created_at DESC LIMIT 100')->fetchAll()]);
        $b=body(); need($b,['reference_area_px','distance_mm']); query('UPDATE calibrations SET is_valid=0'); query('INSERT INTO calibrations(device_id,reference_area_px,reference_width_mm,reference_height_mm,distance_mm,alignment_deg,sample_count,variation_percent,is_valid,created_by) VALUES(?,?,?,?,?,?,?,?,1,?)',[$b['device_id']?:null,$b['reference_area_px'],$b['reference_width_mm']??null,$b['reference_height_mm']??null,$b['distance_mm'],$b['alignment_deg']??0,$b['sample_count']??1,$b['variation_percent']??0,$u['id']]); out(['id'=>(int)db()->lastInsertId()],201);
    }
    if ($route === 'calibrations/active') { auth(); $c=query('SELECT * FROM calibrations WHERE is_valid=1 ORDER BY created_at DESC LIMIT 1')->fetch(); out(['calibration'=>$c?:null]); }
    if ($route === 'scans') {
        $u=auth(); if($method==='GET') { $limit=min(1000,max(1,(int)($_GET['limit']??200))); $batch=$_GET['batch_id']??null; $where=$batch?'WHERE s.batch_id=?':''; out(['scans'=>query("SELECT s.*,b.name batch_name,u.name operator FROM scans s JOIN batches b ON b.id=s.batch_id JOIN users u ON u.id=s.captured_by $where ORDER BY s.captured_at DESC LIMIT $limit",$batch?[$batch]:[])->fetchAll()]); }
        $b=body(); need($b,['batch_id','calibration_id','predicted_class','confidence','area_px','distance_mm']); query('INSERT INTO scans(batch_id,calibration_id,model_version_id,predicted_class,confidence,area_px,width_px,height_px,measured_width_mm,measured_height_mm,distance_mm,alignment_deg,stable,captured_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$b['batch_id'],$b['calibration_id'],$b['model_version_id']??null,$b['predicted_class'],$b['confidence'],$b['area_px'],$b['width_px']??null,$b['height_px']??null,$b['measured_width_mm']??null,$b['measured_height_mm']??null,$b['distance_mm'],$b['alignment_deg']??0,!empty($b['stable'])?1:0,$u['id']]); out(['id'=>(int)db()->lastInsertId()],201);
    }
    if (preg_match('#^scans/(\d+)/actual$#',$route,$m) && $method==='PATCH') { auth(); $b=body(); need($b,['actual_class']); query('UPDATE scans SET actual_class=? WHERE id=?',[$b['actual_class'],$m[1]]); out(['ok'=>true]); }
    if ($route === 'analytics') {
        auth(); $batch=$_GET['batch_id']??null; $w=$batch?'WHERE batch_id=?':''; $a=$batch?[$batch]:[];
        out(['summary'=>query("SELECT predicted_class class,COUNT(*) count,ROUND(AVG(confidence)*100,2) avg_confidence,ROUND(MIN(confidence)*100,2) min_confidence FROM scans $w GROUP BY predicted_class",$a)->fetchAll(),'daily'=>query("SELECT DATE(captured_at) day,COUNT(*) count,ROUND(AVG(confidence)*100,2) avg_confidence FROM scans $w GROUP BY DATE(captured_at) ORDER BY day",$a)->fetchAll(),'total'=>(int)query("SELECT COUNT(*) FROM scans $w",$a)->fetchColumn()]);
    }
    if ($route === 'accuracy') {
        auth(); $rows=query('SELECT predicted_class,actual_class FROM scans WHERE actual_class IS NOT NULL')->fetchAll(); $classes=['Small','Medium','Large','Extra Large']; $matrix=[];$correct=0;
        foreach($classes as $actual){foreach($classes as $pred)$matrix[$actual][$pred]=0;} foreach($rows as $r){$matrix[$r['actual_class']][$r['predicted_class']]++;if($r['actual_class']===$r['predicted_class'])$correct++;}
        $metrics=[]; foreach($classes as $c){$tp=$matrix[$c][$c];$fp=0;$fn=0;foreach($classes as $o){if($o!==$c){$fp+=$matrix[$o][$c];$fn+=$matrix[$c][$o];}}$p=$tp+$fp?$tp/($tp+$fp):0;$rec=$tp+$fn?$tp/($tp+$fn):0;$metrics[]=['class'=>$c,'precision'=>$p,'recall'=>$rec,'f1'=>$p+$rec?2*$p*$rec/($p+$rec):0,'support'=>array_sum($matrix[$c])];}
        out(['samples'=>count($rows),'accuracy'=>count($rows)?$correct/count($rows):0,'matrix'=>$matrix,'metrics'=>$metrics]);
    }
    if ($route === 'models') { $u=auth(); if($method==='GET') out(['models'=>query('SELECT * FROM model_versions ORDER BY is_active DESC,created_at DESC')->fetchAll()]); if($u['role']!=='admin')out(['error'=>'Admin access required'],403);$b=body();need($b,['name','version','type']);if(!empty($b['is_active']))query('UPDATE model_versions SET is_active=0');query('INSERT INTO model_versions(name,version,type,endpoint_url,notes,is_active) VALUES(?,?,?,?,?,?)',[$b['name'],$b['version'],$b['type'],$b['endpoint_url']??null,$b['notes']??null,!empty($b['is_active'])?1:0]);out(['id'=>(int)db()->lastInsertId()],201); }
    if ($route === 'backup' && $method==='GET') { auth(true); out(['exported_at'=>date(DATE_ATOM),'users'=>query('SELECT id,name,email,role,created_at FROM users')->fetchAll(),'batches'=>query('SELECT * FROM batches')->fetchAll(),'devices'=>query('SELECT * FROM devices')->fetchAll(),'calibrations'=>query('SELECT * FROM calibrations')->fetchAll(),'models'=>query('SELECT * FROM model_versions')->fetchAll(),'scans'=>query('SELECT * FROM scans')->fetchAll()]); }
    out(['error'=>'Route not found'],404);
} catch (PDOException $e) { out(['error'=>$e->getCode()==='23000'?'Duplicate or related record conflict':'Database request failed'],400); }
