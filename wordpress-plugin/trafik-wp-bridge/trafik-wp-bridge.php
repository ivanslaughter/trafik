<?php
/**
 * Plugin Name: Trafik WP Bridge
 * Plugin URI: https://trafik.velocity.web.id
 * Description: Menjembatani aplikasi Trafik (React SPA) dengan database MySQL/MariaDB & autentikasi pengguna WordPress via REST API (/wp-json/trafik/v1).
 * Version: 1.0.0
 * Author: Velocity Digital
 * Author URI: https://velocity.web.id
 * License: GPLv2 or later
 * Text Domain: trafik-wp-bridge
 */

if (!defined('ABSPATH')) {
    exit;
}

define('TRAFIK_BRIDGE_VERSION', '1.0.0');
define('TRAFIK_BRIDGE_DB_VERSION', '1.0.0');

/**
 * 1. ACTIVATION & DATABASE SCHEMA (MySQL / MariaDB)
 */
function trafik_bridge_install() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset_collate = $wpdb->get_charset_collate();
    $table_campaigns = $wpdb->prefix . 'trafik_campaigns';
    $table_logs      = $wpdb->prefix . 'trafik_anticheat_logs';

    $sql_campaigns = "CREATE TABLE {$table_campaigns} (
        id varchar(64) NOT NULL,
        title varchar(255) NOT NULL,
        url text NOT NULL,
        category varchar(32) NOT NULL DEFAULT 'blog',
        duration_sec int(11) NOT NULL DEFAULT 30,
        target_region varchar(32) NOT NULL DEFAULT 'nasional',
        target_device varchar(16) NOT NULL DEFAULT 'all',
        points_cost_per_visit decimal(10,2) NOT NULL DEFAULT 1.00,
        daily_hit_limit int(11) NOT NULL DEFAULT 100,
        hits_delivered_today int(11) NOT NULL DEFAULT 0,
        total_hits_delivered int(11) NOT NULL DEFAULT 0,
        allocated_points decimal(12,2) NOT NULL DEFAULT 0.00,
        status varchar(20) NOT NULL DEFAULT 'active',
        audit_status varchar(20) NOT NULL DEFAULT 'approved',
        audit_score int(11) NOT NULL DEFAULT 0,
        audit_violations text DEFAULT NULL,
        detected_keywords text DEFAULT NULL,
        audit_notes text DEFAULT NULL,
        reported_count int(11) NOT NULL DEFAULT 0,
        submitted_by_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
        preview_content longtext DEFAULT NULL,
        created_at date NOT NULL,
        PRIMARY KEY  (id),
        KEY idx_status (status),
        KEY idx_audit_status (audit_status),
        KEY idx_user (submitted_by_user_id)
    ) {$charset_collate};";

    $sql_logs = "CREATE TABLE {$table_logs} (
        id varchar(64) NOT NULL,
        user_id bigint(20) unsigned NOT NULL DEFAULT 0,
        type varchar(48) NOT NULL,
        title varchar(255) NOT NULL,
        details text NOT NULL,
        severity varchar(16) NOT NULL DEFAULT 'info',
        metric_value varchar(128) DEFAULT NULL,
        created_at bigint(20) NOT NULL,
        PRIMARY KEY  (id),
        KEY idx_user_created (user_id, created_at)
    ) {$charset_collate};";

    dbDelta($sql_campaigns);
    dbDelta($sql_logs);

    update_option('trafik_bridge_db_version', TRAFIK_BRIDGE_DB_VERSION);

    if (get_option('trafik_bridge_allowed_origins') === false) {
        update_option('trafik_bridge_allowed_origins', "https://trafik.velocity.web.id\nhttps://velocity.web.id\n*");
    }
}
register_activation_hook(__FILE__, 'trafik_bridge_install');

add_action('plugins_loaded', function () {
    if (get_option('trafik_bridge_db_version') !== TRAFIK_BRIDGE_DB_VERSION) {
        trafik_bridge_install();
    }
});

/**
 * 2. CORS HEADERS FOR CROSS-SUBDOMAIN ACCESS (trafik.velocity.web.id -> velocity.web.id)
 */
function trafik_bridge_send_cors_headers() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? trim($_SERVER['HTTP_ORIGIN']) : '';
    $allowed_raw = get_option('trafik_bridge_allowed_origins', '*');
    $allowed_list = array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $allowed_raw)));

    $allow_origin = '*';
    if ($origin && !in_array('*', $allowed_list, true)) {
        if (in_array($origin, $allowed_list, true)) {
            $allow_origin = $origin;
        } else {
            $allow_origin = $allowed_list[0] ?? 'https://trafik.velocity.web.id';
        }
    } elseif ($origin) {
        $allow_origin = $origin;
    }

    header("Access-Control-Allow-Origin: {$allow_origin}");
    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-Trafik-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

add_action('init', function () {
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/wp-json/trafik/') !== false) {
        trafik_bridge_send_cors_headers();
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit;
        }
    }
}, 1);

add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        trafik_bridge_send_cors_headers();
        return $value;
    });
}, 15);

/**
 * 3. STATELESS HMAC-SHA256 TOKEN AUTH (ZERO THIRD-PARTY PLUGIN NEEDED)
 */
function trafik_bridge_b64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function trafik_bridge_b64url_decode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

function trafik_bridge_issue_token($user_id) {
    $payload = wp_json_encode([
        'uid' => (int) $user_id,
        'iat' => time(),
        'exp' => time() + (7 * DAY_IN_SECONDS),
    ]);
    $payload_b64 = trafik_bridge_b64url_encode($payload);
    $sig = hash_hmac('sha256', $payload_b64, wp_salt('auth'), true);
    return $payload_b64 . '.' . trafik_bridge_b64url_encode($sig);
}

function trafik_bridge_extract_token($request = null) {
    if ($request instanceof WP_REST_Request) {
        $custom = $request->get_header('x-trafik-token');
        if (!empty($custom)) {
            return trim($custom);
        }
        $auth = $request->get_header('authorization');
        if (!empty($auth) && stripos($auth, 'Bearer ') === 0) {
            return trim(substr($auth, 7));
        }
    }

    $server_headers = [
        $_SERVER['HTTP_X_TRAFIK_TOKEN'] ?? '',
        $_SERVER['HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
    ];
    foreach ($server_headers as $h) {
        if (!empty($h)) {
            if (stripos($h, 'Bearer ') === 0) {
                return trim(substr($h, 7));
            }
            return trim($h);
        }
    }
    return '';
}

function trafik_bridge_verify_token($token) {
    if (empty($token) || strpos($token, '.') === false) {
        return null;
    }
    list($payload_b64, $sig_b64) = explode('.', $token, 2);
    $expected_sig = trafik_bridge_b64url_encode(hash_hmac('sha256', $payload_b64, wp_salt('auth'), true));
    if (!hash_equals($expected_sig, $sig_b64)) {
        return null;
    }
    $payload = json_decode(trafik_bridge_b64url_decode($payload_b64), true);
    if (!is_array($payload) || empty($payload['uid']) || empty($payload['exp'])) {
        return null;
    }
    if ((int) $payload['exp'] < time()) {
        return null;
    }
    $user = get_user_by('id', (int) $payload['uid']);
    return $user ?: null;
}

function trafik_bridge_get_current_user($request) {
    $token = trafik_bridge_extract_token($request);
    $user = trafik_bridge_verify_token($token);
    if ($user) {
        return $user;
    }
    if (is_user_logged_in()) {
        return wp_get_current_user();
    }
    return null;
}

function trafik_bridge_permission_user($request) {
    $user = trafik_bridge_get_current_user($request);
    if (!$user) {
        return new WP_Error('trafik_unauthorized', 'Sesi login tidak valid atau telah berakhir. Silakan login ulang.', ['status' => 401]);
    }
    return true;
}

function trafik_bridge_permission_admin($request) {
    $user = trafik_bridge_get_current_user($request);
    if (!$user) {
        return new WP_Error('trafik_unauthorized', 'Autentikasi diperlukan.', ['status' => 401]);
    }
    if (!user_can($user, 'manage_options')) {
        return new WP_Error('trafik_forbidden', 'Hanya Administrator WordPress yang dapat mengakses fitur ini.', ['status' => 403]);
    }
    return true;
}

/**
 * 4. USER & CAMPAIGN FORMATTERS (MAPPING WP MYSQL -> REACT TYPES)
 */
function trafik_bridge_init_user_meta_if_needed($user_id, $wp_user = null) {
    if (!$wp_user) {
        $wp_user = get_user_by('id', $user_id);
    }
    $is_admin = $wp_user && user_can($wp_user, 'manage_options');

    if (get_user_meta($user_id, 'tn_traffic_points', true) === '') {
        update_user_meta($user_id, 'tn_traffic_points', $is_admin ? 5000 : 1500);
    }
    if (get_user_meta($user_id, 'tn_membership', true) === '') {
        update_user_meta($user_id, 'tn_membership', $is_admin ? 'pro_nusantara' : 'gratis');
    }
    if (get_user_meta($user_id, 'tn_surf_ratio', true) === '') {
        update_user_meta($user_id, 'tn_surf_ratio', $is_admin ? '1.0' : '0.7');
    }
    if (get_user_meta($user_id, 'tn_status', true) === '') {
        update_user_meta($user_id, 'tn_status', 'active');
    }
    if (get_user_meta($user_id, 'tn_city', true) === '') {
        update_user_meta($user_id, 'tn_city', 'Indonesia');
    }
    if (get_user_meta($user_id, 'tn_referral_code', true) === '') {
        $prefix = $wp_user ? strtoupper(preg_replace('/[^A-Za-z0-9]/', '', substr($wp_user->user_login, 0, 4))) : 'USR';
        update_user_meta($user_id, 'tn_referral_code', ($prefix ?: 'TRK') . '-' . $user_id . wp_rand(10, 99));
    }
    if (get_user_meta($user_id, 'tn_website_slots', true) === '') {
        update_user_meta($user_id, 'tn_website_slots', $is_admin ? 20 : 3);
    }
}

function trafik_bridge_format_user($wp_user) {
    $uid = (int) $wp_user->ID;
    trafik_bridge_init_user_meta_if_needed($uid, $wp_user);

    $is_admin = user_can($wp_user, 'manage_options');
    $membership = get_user_meta($uid, 'tn_membership', true) ?: 'gratis';
    $points = floatval(get_user_meta($uid, 'tn_traffic_points', true));

    return [
        'id'                   => 'wp_' . $uid,
        'wpUserId'             => $uid,
        'name'                 => $wp_user->display_name ?: $wp_user->user_login,
        'email'                => $wp_user->user_email,
        'role'                 => $is_admin ? 'admin' : 'user',
        'status'               => get_user_meta($uid, 'tn_status', true) ?: 'active',
        'suspendReason'        => get_user_meta($uid, 'tn_suspend_reason', true) ?: '',
        'city'                 => get_user_meta($uid, 'tn_city', true) ?: 'Indonesia',
        'points'               => round($points, 2),
        'membership'           => $membership,
        'surfRatio'            => floatval(get_user_meta($uid, 'tn_surf_ratio', true) ?: ($membership === 'pro_nusantara' ? 1.0 : 0.7)),
        'totalHitsGiven'       => intval(get_user_meta($uid, 'tn_total_hits_given', true) ?: 0),
        'totalHitsReceived'    => intval(get_user_meta($uid, 'tn_total_hits_received', true) ?: 0),
        'dailySurfedSeconds'   => intval(get_user_meta($uid, 'tn_daily_surfed_seconds', true) ?: 0),
        'dailyTargetSeconds'   => intval(get_user_meta($uid, 'tn_daily_target_seconds', true) ?: 1800),
        'streakDays'           => intval(get_user_meta($uid, 'tn_streak_days', true) ?: 1),
        'referralCode'         => get_user_meta($uid, 'tn_referral_code', true) ?: ('WP-' . $uid),
        'referredCount'        => intval(get_user_meta($uid, 'tn_referred_count', true) ?: 0),
        'referralPointsEarned' => floatval(get_user_meta($uid, 'tn_referral_points_earned', true) ?: 0),
        'websiteSlots'         => intval(get_user_meta($uid, 'tn_website_slots', true) ?: ($membership === 'pro_nusantara' ? 20 : 3)),
        'joinedDate'           => substr($wp_user->user_registered, 0, 10),
        'lastActive'           => get_user_meta($uid, 'tn_last_active', true) ?: 'Aktif di WordPress MySQL',
    ];
}

function trafik_bridge_format_campaign($row) {
    $violations = $row->audit_violations ? json_decode($row->audit_violations, true) : [];
    $keywords   = $row->detected_keywords ? json_decode($row->detected_keywords, true) : [];
    $preview    = $row->preview_content ? json_decode($row->preview_content, true) : null;

    return [
        'id'                  => $row->id,
        'title'               => $row->title,
        'url'                 => $row->url,
        'category'            => $row->category,
        'durationSec'         => (int) $row->duration_sec,
        'targetRegion'        => $row->target_region,
        'targetDevice'        => $row->target_device,
        'pointsCostPerVisit'  => (float) $row->points_cost_per_visit,
        'dailyHitLimit'       => (int) $row->daily_hit_limit,
        'hitsDeliveredToday'  => (int) $row->hits_delivered_today,
        'totalHitsDelivered'  => (int) $row->total_hits_delivered,
        'allocatedPoints'     => (float) $row->allocated_points,
        'status'              => $row->status,
        'createdAt'           => $row->created_at,
        'auditStatus'         => $row->audit_status,
        'auditScore'          => (int) $row->audit_score,
        'auditViolations'     => is_array($violations) ? $violations : [],
        'detectedKeywords'    => is_array($keywords) ? $keywords : [],
        'auditNotes'          => $row->audit_notes ?: '',
        'reportedCount'       => (int) $row->reported_count,
        'submittedByUserId'   => $row->submitted_by_user_id ? ('wp_' . (int) $row->submitted_by_user_id) : '',
        'previewContent'      => $preview,
    ];
}

function trafik_bridge_parse_wp_uid($raw_id) {
    if (is_numeric($raw_id)) {
        return (int) $raw_id;
    }
    if (is_string($raw_id) && strpos($raw_id, 'wp_') === 0) {
        return (int) substr($raw_id, 3);
    }
    return 0;
}

/**
 * 5. REST API ROUTES (/wp-json/trafik/v1/...)
 */
add_action('rest_api_init', function () {
    $ns = 'trafik/v1';

    // Health & DB Check
    register_rest_route($ns, '/health', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            global $wpdb;
            $table_campaigns = $wpdb->prefix . 'trafik_campaigns';
            $table_logs      = $wpdb->prefix . 'trafik_anticheat_logs';

            $campaigns_exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_campaigns)) === $table_campaigns;
            $logs_exists      = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_logs)) === $table_logs;

            return rest_ensure_response([
                'ok'        => $campaigns_exists && $logs_exists,
                'plugin'    => 'trafik-wp-bridge',
                'version'   => TRAFIK_BRIDGE_VERSION,
                'siteName'  => get_bloginfo('name'),
                'siteUrl'   => home_url(),
                'wpVersion' => get_bloginfo('version'),
                'dbReady'   => $campaigns_exists && $logs_exists,
                'counts'    => [
                    'campaigns' => $campaigns_exists ? (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_campaigns}") : 0,
                    'logs'      => $logs_exists ? (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_logs}") : 0,
                    'users'     => (int) count_users()['total_users'],
                ],
            ]);
        },
    ]);

    // Login via WordPress wp_users
    register_rest_route($ns, '/auth/login', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => function (WP_REST_Request $request) {
            $params   = $request->get_json_params() ?: $request->get_params();
            $username = sanitize_text_field($params['username'] ?? '');
            $password = $params['password'] ?? '';

            if (empty($username) || empty($password)) {
                return new WP_Error('missing_credentials', 'Username/Email dan Password wajib diisi.', ['status' => 400]);
            }

            if (is_email($username)) {
                $user_by_email = get_user_by('email', $username);
                if ($user_by_email) {
                    $username = $user_by_email->user_login;
                }
            }

            $user = wp_authenticate($username, $password);
            if (is_wp_error($user)) {
                return new WP_Error('invalid_login', 'Username/Email atau Password WordPress salah.', ['status' => 401]);
            }

            update_user_meta($user->ID, 'tn_last_active', current_time('mysql'));
            $token = trafik_bridge_issue_token($user->ID);

            return rest_ensure_response([
                'success' => true,
                'token'   => $token,
                'user'    => trafik_bridge_format_user($user),
            ]);
        },
    ]);

    // Register new WordPress subscriber
    register_rest_route($ns, '/auth/register', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'callback'            => function (WP_REST_Request $request) {
            $params   = $request->get_json_params() ?: $request->get_params();
            $name     = sanitize_text_field($params['name'] ?? '');
            $email    = sanitize_email($params['email'] ?? '');
            $password = $params['password'] ?? '';
            $city     = sanitize_text_field($params['city'] ?? 'Indonesia');

            if (empty($email) || !is_email($email) || strlen($password) < 6) {
                return new WP_Error('invalid_registration', 'Email valid dan password minimal 6 karakter diperlukan.', ['status' => 400]);
            }
            if (email_exists($email)) {
                return new WP_Error('email_exists', 'Email sudah terdaftar di WordPress.', ['status' => 409]);
            }

            $base_login = sanitize_user(current(explode('@', $email)), true);
            $login = $base_login ?: 'member';
            while (username_exists($login)) {
                $login = $base_login . wp_rand(100, 999);
            }

            $user_id = wp_create_user($login, $password, $email);
            if (is_wp_error($user_id)) {
                return $user_id;
            }

            wp_update_user([
                'ID'           => $user_id,
                'display_name' => $name ?: $login,
                'role'         => 'subscriber',
            ]);

            update_user_meta($user_id, 'tn_city', $city);
            update_user_meta($user_id, 'tn_last_active', current_time('mysql'));
            $wp_user = get_user_by('id', $user_id);
            $token = trafik_bridge_issue_token($user_id);

            return rest_ensure_response([
                'success' => true,
                'token'   => $token,
                'user'    => trafik_bridge_format_user($wp_user),
            ]);
        },
    ]);

    // Current User Profile (GET / PATCH)
    register_rest_route($ns, '/me', [
        [
            'methods'             => 'GET',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                $user = trafik_bridge_get_current_user($request);
                return rest_ensure_response([
                    'user' => trafik_bridge_format_user($user),
                ]);
            },
        ],
        [
            'methods'             => 'PATCH',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                $user   = trafik_bridge_get_current_user($request);
                $uid    = (int) $user->ID;
                $params = $request->get_json_params() ?: [];

                if (!empty($params['name'])) {
                    wp_update_user([
                        'ID'           => $uid,
                        'display_name' => sanitize_text_field($params['name']),
                    ]);
                }
                if (isset($params['city'])) {
                    update_user_meta($uid, 'tn_city', sanitize_text_field($params['city']));
                }
                if (!empty($params['addPoints'])) {
                    $delta = max(0, floatval($params['addPoints']));
                    $cur   = floatval(get_user_meta($uid, 'tn_traffic_points', true));
                    update_user_meta($uid, 'tn_traffic_points', round($cur + $delta, 2));
                }
                if (!empty($params['upgradeVip'])) {
                    update_user_meta($uid, 'tn_membership', 'pro_nusantara');
                    update_user_meta($uid, 'tn_surf_ratio', '1.0');
                    update_user_meta($uid, 'tn_website_slots', 20);
                }

                update_user_meta($uid, 'tn_last_active', current_time('mysql'));
                $fresh_user = get_user_by('id', $uid);
                return rest_ensure_response([
                    'user' => trafik_bridge_format_user($fresh_user),
                ]);
            },
        ],
    ]);

    // Atomic Surf Completion (Credit surfer + Deduct campaign)
    register_rest_route($ns, '/surf/complete', [
        'methods'             => 'POST',
        'permission_callback' => 'trafik_bridge_permission_user',
        'callback'            => function (WP_REST_Request $request) {
            global $wpdb;
            $user   = trafik_bridge_get_current_user($request);
            $uid    = (int) $user->ID;
            $params = $request->get_json_params() ?: [];

            if (get_user_meta($uid, 'tn_status', true) === 'suspended') {
                return new WP_Error('account_suspended', 'Akun Anda ditangguhkan oleh sistem Anti-Cheat.', ['status' => 403]);
            }

            $site_id      = sanitize_text_field($params['siteId'] ?? '');
            $earned       = max(0, floatval($params['earnedPoints'] ?? 0));
            $cost         = max(0, floatval($params['cost'] ?? 1));
            $duration_sec = max(5, intval($params['durationSec'] ?? 30));

            // Credit surfer
            $cur_points = floatval(get_user_meta($uid, 'tn_traffic_points', true));
            $cur_given  = intval(get_user_meta($uid, 'tn_total_hits_given', true));
            $cur_secs   = intval(get_user_meta($uid, 'tn_daily_surfed_seconds', true));

            update_user_meta($uid, 'tn_traffic_points', round($cur_points + $earned, 2));
            update_user_meta($uid, 'tn_total_hits_given', $cur_given + 1);
            update_user_meta($uid, 'tn_daily_surfed_seconds', $cur_secs + $duration_sec);
            update_user_meta($uid, 'tn_last_active', current_time('mysql'));

            // Deduct campaign points in MySQL
            $updated_campaign = null;
            if (!empty($site_id)) {
                $table = $wpdb->prefix . 'trafik_campaigns';
                $row   = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));
                if ($row) {
                    $new_allocated = max(0, floatval($row->allocated_points) - $cost);
                    $new_status    = ($new_allocated < floatval($row->points_cost_per_visit)) ? 'depleted' : $row->status;

                    $wpdb->update(
                        $table,
                        [
                            'allocated_points'     => $new_allocated,
                            'hits_delivered_today' => (int) $row->hits_delivered_today + 1,
                            'total_hits_delivered' => (int) $row->total_hits_delivered + 1,
                            'status'               => $new_status,
                        ],
                        ['id' => $site_id]
                    );

                    if ((int) $row->submitted_by_user_id > 0) {
                        $owner_id  = (int) $row->submitted_by_user_id;
                        $owner_rec = intval(get_user_meta($owner_id, 'tn_total_hits_received', true));
                        update_user_meta($owner_id, 'tn_total_hits_received', $owner_rec + 1);
                    }

                    $fresh_row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));
                    $updated_campaign = $fresh_row ? trafik_bridge_format_campaign($fresh_row) : null;
                }
            }

            return rest_ensure_response([
                'success'  => true,
                'user'     => trafik_bridge_format_user(get_user_by('id', $uid)),
                'campaign' => $updated_campaign,
            ]);
        },
    ]);

    // Websites Collection (GET / POST)
    register_rest_route($ns, '/websites', [
        [
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $table = $wpdb->prefix . 'trafik_campaigns';
                $rows  = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC, id DESC");
                $user  = trafik_bridge_get_current_user($request);
                $uid   = $user ? (int) $user->ID : 0;

                $community = [];
                $mine      = [];
                foreach ($rows as $row) {
                    $formatted = trafik_bridge_format_campaign($row);
                    $community[] = $formatted;
                    if ($uid > 0 && ((int) $row->submitted_by_user_id === $uid || user_can($user, 'manage_options'))) {
                        $mine[] = $formatted;
                    }
                }

                return rest_ensure_response([
                    'myWebsites'        => $mine,
                    'communityWebsites' => $community,
                ]);
            },
        ],
        [
            'methods'             => 'POST',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $user   = trafik_bridge_get_current_user($request);
                $uid    = (int) $user->ID;
                $params = $request->get_json_params() ?: [];

                $allocated = max(0, floatval($params['allocatedPoints'] ?? 0));
                $cur_pts   = floatval(get_user_meta($uid, 'tn_traffic_points', true));

                if ($cur_pts < $allocated) {
                    return new WP_Error('insufficient_points', 'Saldo poin tidak mencukupi untuk alokasi website ini.', ['status' => 400]);
                }

                $site_id = 'site_' . substr(md5(uniqid((string) wp_rand(), true)), 0, 9);
                $table   = $wpdb->prefix . 'trafik_campaigns';

                $inserted = $wpdb->insert($table, [
                    'id'                    => $site_id,
                    'title'                 => sanitize_text_field($params['title'] ?? 'Website Tanpa Judul'),
                    'url'                   => esc_url_raw($params['url'] ?? ''),
                    'category'              => sanitize_text_field($params['category'] ?? 'blog'),
                    'duration_sec'          => max(10, intval($params['durationSec'] ?? 30)),
                    'target_region'         => sanitize_text_field($params['targetRegion'] ?? 'nasional'),
                    'target_device'         => sanitize_text_field($params['targetDevice'] ?? 'all'),
                    'points_cost_per_visit' => max(0.5, floatval($params['pointsCostPerVisit'] ?? 1.0)),
                    'daily_hit_limit'       => max(10, intval($params['dailyHitLimit'] ?? 100)),
                    'hits_delivered_today'  => 0,
                    'total_hits_delivered'  => 0,
                    'allocated_points'      => $allocated,
                    'status'                => sanitize_text_field($params['status'] ?? 'active'),
                    'audit_status'          => sanitize_text_field($params['auditStatus'] ?? 'approved'),
                    'audit_score'           => intval($params['auditScore'] ?? 0),
                    'audit_violations'      => wp_json_encode($params['auditViolations'] ?? []),
                    'detected_keywords'     => wp_json_encode($params['detectedKeywords'] ?? []),
                    'audit_notes'           => sanitize_textarea_field($params['auditNotes'] ?? ''),
                    'reported_count'        => 0,
                    'submitted_by_user_id'  => $uid,
                    'preview_content'       => isset($params['previewContent']) ? wp_json_encode($params['previewContent']) : null,
                    'created_at'            => current_time('Y-m-d'),
                ]);

                if ($inserted === false) {
                    return new WP_Error('db_insert_error', 'Gagal menyimpan website ke MySQL.', ['status' => 500]);
                }

                update_user_meta($uid, 'tn_traffic_points', round($cur_pts - $allocated, 2));
                $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));

                return rest_ensure_response([
                    'website' => trafik_bridge_format_campaign($row),
                    'user'    => trafik_bridge_format_user(get_user_by('id', $uid)),
                ]);
            },
        ],
    ]);

    // Single Website Actions (PATCH / DELETE)
    register_rest_route($ns, '/websites/(?P<id>[a-zA-Z0-9_-]+)', [
        [
            'methods'             => 'PATCH',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $user    = trafik_bridge_get_current_user($request);
                $uid     = (int) $user->ID;
                $is_adm  = user_can($user, 'manage_options');
                $site_id = sanitize_text_field($request['id']);
                $params  = $request->get_json_params() ?: [];
                $action  = sanitize_text_field($params['action'] ?? '');

                $table = $wpdb->prefix . 'trafik_campaigns';
                $row   = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));
                if (!$row) {
                    return new WP_Error('not_found', 'Website tidak ditemukan di database.', ['status' => 404]);
                }

                $is_owner = ((int) $row->submitted_by_user_id === $uid) || $is_adm;

                if ($action === 'toggle_status') {
                    if (!$is_owner) {
                        return new WP_Error('forbidden', 'Tidak memiliki izin mengubah status situs ini.', ['status' => 403]);
                    }
                    $new_status = $row->status === 'active' ? 'paused' : 'active';
                    $wpdb->update($table, ['status' => $new_status], ['id' => $site_id]);
                } elseif ($action === 'add_points') {
                    if (!$is_owner) {
                        return new WP_Error('forbidden', 'Tidak memiliki izin menambah poin situs ini.', ['status' => 403]);
                    }
                    $amount  = max(1, floatval($params['amount'] ?? 0));
                    $cur_pts = floatval(get_user_meta($uid, 'tn_traffic_points', true));
                    if ($cur_pts < $amount) {
                        return new WP_Error('insufficient_points', 'Saldo poin tidak mencukupi.', ['status' => 400]);
                    }
                    update_user_meta($uid, 'tn_traffic_points', round($cur_pts - $amount, 2));
                    $new_alloc  = floatval($row->allocated_points) + $amount;
                    $new_status = $row->status === 'depleted' ? 'active' : $row->status;
                    $wpdb->update($table, ['allocated_points' => $new_alloc, 'status' => $new_status], ['id' => $site_id]);
                } elseif ($action === 'report') {
                    $reason = sanitize_text_field($params['reason'] ?? 'Pelanggaran konten');
                    $count  = (int) $row->reported_count + 1;
                    $wpdb->update($table, [
                        'reported_count' => $count,
                        'audit_status'   => 'flagged',
                        'audit_notes'    => "Dilaporkan peselancar ({$count}x): {$reason}. Diisolasi untuk audit kepatuhan.",
                    ], ['id' => $site_id]);
                } elseif (in_array($action, ['approve', 'reject', 'quarantine'], true)) {
                    if (!$is_adm) {
                        return new WP_Error('forbidden', 'Hanya Administrator yang dapat melakukan audit.', ['status' => 403]);
                    }
                    if ($action === 'approve') {
                        $wpdb->update($table, [
                            'audit_status' => 'approved',
                            'status'       => 'active',
                            'audit_score'  => 0,
                            'audit_notes'  => 'Disetujui oleh Administrator. Konten aman.',
                        ], ['id' => $site_id]);
                    } elseif ($action === 'reject') {
                        $wpdb->update($table, [
                            'audit_status' => 'rejected',
                            'status'       => 'paused',
                            'audit_score'  => 100,
                            'audit_notes'  => sanitize_textarea_field($params['reason'] ?? 'Ditolak oleh Administrator.'),
                        ], ['id' => $site_id]);
                    } else {
                        $wpdb->update($table, [
                            'audit_status' => 'flagged',
                            'audit_notes'  => sanitize_textarea_field($params['reason'] ?? 'Dikarantina oleh Administrator.'),
                        ], ['id' => $site_id]);
                    }
                }

                $fresh = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));
                return rest_ensure_response([
                    'website' => trafik_bridge_format_campaign($fresh),
                    'user'    => trafik_bridge_format_user(get_user_by('id', $uid)),
                ]);
            },
        ],
        [
            'methods'             => 'DELETE',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $user    = trafik_bridge_get_current_user($request);
                $uid     = (int) $user->ID;
                $site_id = sanitize_text_field($request['id']);
                $table   = $wpdb->prefix . 'trafik_campaigns';

                $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %s", $site_id));
                if (!$row) {
                    return new WP_Error('not_found', 'Website tidak ditemukan.', ['status' => 404]);
                }
                if ((int) $row->submitted_by_user_id !== $uid && !user_can($user, 'manage_options')) {
                    return new WP_Error('forbidden', 'Tidak memiliki izin menghapus website ini.', ['status' => 403]);
                }

                $refund = floatval($row->allocated_points);
                if ($refund > 0 && (int) $row->submitted_by_user_id > 0) {
                    $owner_id = (int) $row->submitted_by_user_id;
                    $cur_pts  = floatval(get_user_meta($owner_id, 'tn_traffic_points', true));
                    update_user_meta($owner_id, 'tn_traffic_points', round($cur_pts + $refund, 2));
                }

                $wpdb->delete($table, ['id' => $site_id]);

                return rest_ensure_response([
                    'deleted' => true,
                    'user'    => trafik_bridge_format_user(get_user_by('id', $uid)),
                ]);
            },
        ],
    ]);

    // Anti-Cheat Logs (GET / POST)
    register_rest_route($ns, '/logs', [
        [
            'methods'             => 'GET',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $user  = trafik_bridge_get_current_user($request);
                $table = $wpdb->prefix . 'trafik_anticheat_logs';

                if (user_can($user, 'manage_options')) {
                    $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 50");
                } else {
                    $rows = $wpdb->get_results($wpdb->prepare(
                        "SELECT * FROM {$table} WHERE user_id = %d OR user_id = 0 ORDER BY created_at DESC LIMIT 50",
                        (int) $user->ID
                    ));
                }

                $logs = array_map(function ($r) {
                    return [
                        'id'          => $r->id,
                        'timestamp'   => (int) $r->created_at,
                        'type'        => $r->type,
                        'title'       => $r->title,
                        'details'     => $r->details,
                        'severity'    => $r->severity,
                        'metricValue' => $r->metric_value ?: null,
                    ];
                }, $rows ?: []);

                return rest_ensure_response(['logs' => $logs]);
            },
        ],
        [
            'methods'             => 'POST',
            'permission_callback' => 'trafik_bridge_permission_user',
            'callback'            => function (WP_REST_Request $request) {
                global $wpdb;
                $user   = trafik_bridge_get_current_user($request);
                $params = $request->get_json_params() ?: [];
                $table  = $wpdb->prefix . 'trafik_anticheat_logs';
                $log_id = sanitize_text_field($params['id'] ?? ('log_' . substr(md5(uniqid((string) wp_rand(), true)), 0, 9)));

                $wpdb->replace($table, [
                    'id'           => $log_id,
                    'user_id'      => (int) $user->ID,
                    'type'         => sanitize_text_field($params['type'] ?? 'HEARTBEAT_VERIFIED'),
                    'title'        => sanitize_text_field($params['title'] ?? ''),
                    'details'      => sanitize_textarea_field($params['details'] ?? ''),
                    'severity'     => sanitize_text_field($params['severity'] ?? 'info'),
                    'metric_value' => isset($params['metricValue']) ? sanitize_text_field($params['metricValue']) : null,
                    'created_at'   => intval($params['timestamp'] ?? (time() * 1000)),
                ]);

                return rest_ensure_response(['saved' => true, 'id' => $log_id]);
            },
        ],
    ]);

    // Admin Users Management (GET / POST)
    register_rest_route($ns, '/admin/users', [
        [
            'methods'             => 'GET',
            'permission_callback' => 'trafik_bridge_permission_admin',
            'callback'            => function () {
                $wp_users = get_users(['orderby' => 'registered', 'order' => 'DESC', 'number' => 200]);
                $list = array_map('trafik_bridge_format_user', $wp_users);
                return rest_ensure_response(['users' => $list]);
            },
        ],
        [
            'methods'             => 'POST',
            'permission_callback' => 'trafik_bridge_permission_admin',
            'callback'            => function (WP_REST_Request $request) {
                $params = $request->get_json_params() ?: [];
                $name   = sanitize_text_field($params['name'] ?? '');
                $email  = sanitize_email($params['email'] ?? '');
                $role   = ($params['role'] ?? 'user') === 'admin' ? 'administrator' : 'subscriber';

                if (empty($email) || !is_email($email)) {
                    return new WP_Error('invalid_email', 'Alamat email valid wajib diisi.', ['status' => 400]);
                }
                if (email_exists($email)) {
                    return new WP_Error('email_exists', 'Email sudah terdaftar.', ['status' => 409]);
                }

                $base = sanitize_user(current(explode('@', $email)), true) ?: 'member';
                $login = $base;
                while (username_exists($login)) {
                    $login = $base . wp_rand(100, 999);
                }

                $pass = !empty($params['password']) ? $params['password'] : wp_generate_password(12, false);
                $uid  = wp_create_user($login, $pass, $email);
                if (is_wp_error($uid)) {
                    return $uid;
                }

                wp_update_user([
                    'ID'           => $uid,
                    'display_name' => $name ?: $login,
                    'role'         => $role,
                ]);

                $membership = sanitize_text_field($params['membership'] ?? 'gratis');
                update_user_meta($uid, 'tn_city', sanitize_text_field($params['city'] ?? 'Indonesia'));
                update_user_meta($uid, 'tn_traffic_points', floatval($params['points'] ?? 1500));
                update_user_meta($uid, 'tn_membership', $membership);
                update_user_meta($uid, 'tn_surf_ratio', $membership === 'pro_nusantara' ? '1.0' : '0.7');
                update_user_meta($uid, 'tn_website_slots', $membership === 'pro_nusantara' ? 20 : 3);
                update_user_meta($uid, 'tn_status', sanitize_text_field($params['status'] ?? 'active'));

                return rest_ensure_response([
                    'user' => trafik_bridge_format_user(get_user_by('id', $uid)),
                ]);
            },
        ],
    ]);

    // Admin Update User (PATCH)
    register_rest_route($ns, '/admin/users/(?P<id>[a-zA-Z0-9_-]+)', [
        'methods'             => 'PATCH',
        'permission_callback' => 'trafik_bridge_permission_admin',
        'callback'            => function (WP_REST_Request $request) {
            $uid = trafik_bridge_parse_wp_uid($request['id']);
            $target = $uid ? get_user_by('id', $uid) : null;
            if (!$target) {
                return new WP_Error('user_not_found', 'Pengguna WordPress tidak ditemukan.', ['status' => 404]);
            }

            $params = $request->get_json_params() ?: [];
            if (isset($params['name'])) {
                wp_update_user(['ID' => $uid, 'display_name' => sanitize_text_field($params['name'])]);
            }
            if (isset($params['role'])) {
                $wp_role = $params['role'] === 'admin' ? 'administrator' : 'subscriber';
                wp_update_user(['ID' => $uid, 'role' => $wp_role]);
            }
            if (isset($params['points'])) {
                update_user_meta($uid, 'tn_traffic_points', round(floatval($params['points']), 2));
            }
            if (isset($params['membership'])) {
                $m = sanitize_text_field($params['membership']);
                update_user_meta($uid, 'tn_membership', $m);
                update_user_meta($uid, 'tn_surf_ratio', $m === 'pro_nusantara' ? '1.0' : '0.7');
                update_user_meta($uid, 'tn_website_slots', $m === 'pro_nusantara' ? 20 : 3);
            }
            if (isset($params['status'])) {
                update_user_meta($uid, 'tn_status', sanitize_text_field($params['status']));
            }
            if (isset($params['suspendReason'])) {
                update_user_meta($uid, 'tn_suspend_reason', sanitize_text_field($params['suspendReason']));
            }
            if (isset($params['city'])) {
                update_user_meta($uid, 'tn_city', sanitize_text_field($params['city']));
            }

            return rest_ensure_response([
                'user' => trafik_bridge_format_user(get_user_by('id', $uid)),
            ]);
        },
    ]);
});

/**
 * 6. WORDPRESS ADMIN SETTINGS PAGE (Settings -> Trafik Bridge)
 */
add_action('admin_menu', function () {
    add_options_page(
        'Trafik WP Bridge',
        'Trafik WP Bridge',
        'manage_options',
        'trafik-wp-bridge',
        'trafik_bridge_render_admin_page'
    );
});

function trafik_bridge_render_admin_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    global $wpdb;
    $table_campaigns = $wpdb->prefix . 'trafik_campaigns';
    $table_logs      = $wpdb->prefix . 'trafik_anticheat_logs';
    $notice          = '';

    if (isset($_POST['trafik_save_settings']) && check_admin_referer('trafik_bridge_settings_nonce')) {
        $origins = sanitize_textarea_field($_POST['trafik_allowed_origins'] ?? '*');
        update_option('trafik_bridge_allowed_origins', $origins);
        $notice = 'Pengaturan CORS Origins berhasil disimpan.';
    }

    if (isset($_POST['trafik_seed_campaigns']) && check_admin_referer('trafik_bridge_seed_nonce')) {
        $admin_id = get_current_user_id();
        $samples  = [
            [
                'id'           => 'site_seed_101',
                'title'        => 'Portal Edukasi Digital Nusantara',
                'url'          => 'https://edukasidigital.id/panduan-seo-indonesia',
                'category'     => 'education',
                'duration_sec' => 30,
                'target_region'=> 'nasional',
                'target_device'=> 'all',
                'cost'         => 1.00,
                'daily_limit'  => 250,
                'hits_today'   => 142,
                'total_hits'   => 1240,
                'allocated'    => 450.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Konten edukasi SEO & UMKM bersih.',
                'reported'     => 0,
                'created_at'   => '2026-09-20',
                'preview'      => [
                    'headline'    => 'Panduan Optimasi Mesin Pencari (SEO) untuk UMKM & Blogger Indonesia',
                    'description' => 'Strategi praktis menaikkan peringkat organik Google dengan kata kunci lokal daerah dan konten berkualitas tinggi.',
                    'author'      => 'Reza Pramana (Spesialis SEO Jakarta)',
                    'city'        => 'Jakarta Selatan',
                    'tags'        => ['SEO Indonesia', 'Pemasaran Digital', 'Google Search Console', 'Trafik Organik'],
                    'bodySnippet' => 'Dalam era digital nusantara saat ini, mendapatkan eksposur organik sangat penting bagi pertumbuhan bisnis lokal. Dengan menargetkan kata kunci regional, konversi pengunjung meningkat hingga 35%.',
                ],
            ],
            [
                'id'           => 'site_seed_102',
                'title'        => 'Kopi & Roastery Tradisional Priangan',
                'url'          => 'https://priangancoffee.co.id/menu-biji-kopi-nusantara',
                'category'     => 'ecommerce',
                'duration_sec' => 20,
                'target_region'=> 'jawa_barat',
                'target_device'=> 'mobile',
                'cost'         => 0.80,
                'daily_limit'  => 180,
                'hits_today'   => 98,
                'total_hits'   => 890,
                'allocated'    => 320.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Toko kopi lokal UMKM Jawa Barat.',
                'reported'     => 0,
                'created_at'   => '2026-09-22',
                'preview'      => [
                    'headline'    => 'Menikmati Cita Rasa Otentik Kopi Arabika Gunung Puntang Jawa Barat',
                    'description' => 'Roastery biji kopi lokal kualitas ekspor langsung dari petani binaan tanah Sunda dengan proses honey & natural.',
                    'author'      => 'Rian Hidayat (Q Grader Bandung)',
                    'city'        => 'Bandung',
                    'tags'        => ['Kopi Nusantara', 'UMKM Jabar', 'Arabika Priangan', 'Roastery Bandung'],
                    'bodySnippet' => 'Setiap cangkir menyajikan profil rasa manis caramel, keasaman buah tropis yang seimbang, serta aroma rempah yang harum.',
                ],
            ],
            [
                'id'           => 'site_seed_103',
                'title'        => 'Eksplorasi Wisata Bahari & Desa Adat Flores',
                'url'          => 'https://jelajahnusantara.travel/pesona-flores-labuan-bajo',
                'category'     => 'blog',
                'duration_sec' => 45,
                'target_region'=> 'bali_nusra',
                'target_device'=> 'all',
                'cost'         => 1.50,
                'daily_limit'  => 150,
                'hits_today'   => 65,
                'total_hits'   => 620,
                'allocated'    => 280.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Blog travel wisata alam Flores.',
                'reported'     => 0,
                'created_at'   => '2026-09-24',
                'preview'      => [
                    'headline'    => 'Rute Menakjubkan Labuan Bajo, Wae Rebo, dan Danau Kelimutu 7 Hari',
                    'description' => 'Panduan lengkap solo traveler menjelajahi keajaiban pulau Flores dengan kearifan lokal masyarakat Manggarai.',
                    'author'      => 'Citra Dewi (Travel Writer Denpasar)',
                    'city'        => 'Labuan Bajo / Denpasar',
                    'tags'        => ['Wisata Indonesia', 'Pesona Flores', 'Labuan Bajo', 'Desa Adat'],
                    'bodySnippet' => 'Menyusuri jalanan berliku menuju desa adat di atas awan Wae Rebo mengajarkan kita harmoni antara manusia dan alam.',
                ],
            ],
            [
                'id'           => 'site_seed_104',
                'title'        => 'Channel Belajar Coding Fullstack Web Indonesia',
                'url'          => 'https://youtube.com/watch?v=indo-fullstack-tutorial',
                'category'     => 'youtube',
                'duration_sec' => 30,
                'target_region'=> 'nasional',
                'target_device'=> 'desktop',
                'cost'         => 1.00,
                'daily_limit'  => 300,
                'hits_today'   => 210,
                'total_hits'   => 1940,
                'allocated'    => 500.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos verifikasi YouTube Edukasi Indonesia.',
                'reported'     => 0,
                'created_at'   => '2026-09-18',
                'preview'      => [
                    'headline'    => 'Tutorial React 19 + TypeScript + Tailwind CSS Bahasa Indonesia',
                    'description' => 'Langkah demi langkah membangun aplikasi SaaS berstandar industri mulai dari arsitektur frontend hingga deployment.',
                    'author'      => 'Dimas Wicaksono (Lead Frontend Surabaya)',
                    'city'        => 'Surabaya',
                    'tags'        => ['Pemrograman Web', 'Tutorial React', 'Frontend Developer', 'Tech Surabaya'],
                    'bodySnippet' => 'Di episode kali ini kita membahas state management modern, optimasi rendering browser, dan arsitektur web cepat.',
                ],
            ],
            [
                'id'           => 'site_seed_105',
                'title'        => 'Solusi Gudang & Logistik Cerdas Jabodetabek',
                'url'          => 'https://nusantaralogistik.id/armada-dan-pergudangan',
                'category'     => 'ecommerce',
                'duration_sec' => 25,
                'target_region'=> 'jabodetabek',
                'target_device'=> 'all',
                'cost'         => 0.90,
                'daily_limit'  => 200,
                'hits_today'   => 110,
                'total_hits'   => 780,
                'allocated'    => 190.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Layanan logistik merchant.',
                'reported'     => 0,
                'created_at'   => '2026-09-25',
                'preview'      => [
                    'headline'    => 'Layanan Pengiriman Sameday & Multi-Hub Fulfillment untuk Merchant Online',
                    'description' => 'Integrasi API pelacakan instan dan armada pendingin untuk produk segar di seluruh wilayah DKI Jakarta dan sekitarnya.',
                    'author'      => 'PT Nusantara Logistik Ekspres',
                    'city'        => 'Tangerang',
                    'tags'        => ['Logistik Indonesia', 'Ekspedisi Sameday', 'Fulfillment Center', 'Jabodetabek'],
                    'bodySnippet' => 'Dengan 8 hub strategis di sekeliling tol lingkar luar, pengiriman barang sampai ke tangan konsumen dalam waktu kurang dari 4 jam.',
                ],
            ],
            [
                'id'           => 'site_seed_my_1',
                'title'        => 'Toko Herbal Alami & Jamu Nusantara',
                'url'          => 'https://jamunusantara.shop/produk-unggulan',
                'category'     => 'ecommerce',
                'duration_sec' => 30,
                'target_region'=> 'jawa_tengah',
                'target_device'=> 'all',
                'cost'         => 1.00,
                'daily_limit'  => 120,
                'hits_today'   => 74,
                'total_hits'   => 412,
                'allocated'    => 210.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Produk jamu herbal bersertifikasi BPOM.',
                'reported'     => 0,
                'created_at'   => '2026-09-21',
                'preview'      => [
                    'headline'    => 'Khasiat Temulawak & Jahe Merah Asli Solo untuk Daya Tahan Tubuh',
                    'description' => 'Racikan jamu tradisional bersertifikat BPOM dan Halal MUI dikemas higienis siap seduh.',
                    'author'      => 'Budi Santoso',
                    'city'        => 'Surakarta / Solo',
                    'tags'        => ['Jamu Tradisional', 'Herbal Sehat', 'Produk Lokal Solo', 'BPOM'],
                    'bodySnippet' => 'Dibuat dari rimpang pilihan hasil panen perkebunan lereng Gunung Merapi untuk kehangatan dan kebugaran alami.',
                ],
            ],
            [
                'id'           => 'site_seed_my_2',
                'title'        => 'Blog Review Kuliner & Wisata Murah Jogja',
                'url'          => 'https://kulineraslijogja.my.id/gudeg-legendaris',
                'category'     => 'blog',
                'duration_sec' => 25,
                'target_region'=> 'jawa_tengah',
                'target_device'=> 'mobile',
                'cost'         => 0.90,
                'daily_limit'  => 100,
                'hits_today'   => 48,
                'total_hits'   => 290,
                'allocated'    => 140.00,
                'status'       => 'active',
                'audit_status' => 'approved',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Lolos uji kepatuhan Kominfo. Blog review kuliner tradisional Yogyakarta.',
                'reported'     => 0,
                'created_at'   => '2026-09-23',
                'preview'      => [
                    'headline'    => '7 Warung Gudeg Basah Legendaris di Sudut Yogyakarta yang Wajib Dicoba',
                    'description' => 'Rekomendasi kuliner malam Jogja dengan kuah areh kental gurih dan sambal krecek pedas mantap.',
                    'author'      => 'Budi Santoso',
                    'city'        => 'Yogyakarta',
                    'tags'        => ['Kuliner Jogja', 'Gudeg Enak', 'Wisata Murah', 'Wisata Malam'],
                    'bodySnippet' => 'Gudeg bukan sekadar makanan manis, melainkan seni memasak nangka muda selama berjam-jam dengan kayu bakar tradisional.',
                ],
            ],
            [
                'id'           => 'site_seed_pending',
                'title'        => 'Koleksi Distro & Merchandise Komunitas Vespa Bali',
                'url'          => 'https://balivespaclub.id/distro-merchandise',
                'category'     => 'ecommerce',
                'duration_sec' => 30,
                'target_region'=> 'bali_nusra',
                'target_device'=> 'all',
                'cost'         => 1.00,
                'daily_limit'  => 100,
                'hits_today'   => 0,
                'total_hits'   => 0,
                'allocated'    => 100.00,
                'status'       => 'active',
                'audit_status' => 'pending',
                'audit_score'  => 0,
                'violations'   => [],
                'keywords'     => [],
                'audit_notes'  => 'Menunggu peninjauan akhir moderator kepatuhan.',
                'reported'     => 0,
                'created_at'   => '2026-09-28',
                'preview'      => [
                    'headline'    => 'Apparel & Kaos Distro Komunitas Vespa Klasik Bali',
                    'description' => 'Karya apparel sablon manual berkualitas dari anak muda kreatif Denpasar.',
                    'author'      => 'Wayan Sudarma',
                    'city'        => 'Denpasar / Kuta',
                    'tags'        => ['Vespa Bali', 'Distro Lokal', 'Komunitas Motor', 'Denpasar'],
                    'bodySnippet' => 'Menyediakan aneka merchandise orisinil untuk pecinta skuter klasik di tanah dewata.',
                ],
            ],
            [
                'id'           => 'site_seed_judol_blocked',
                'title'        => 'Daftar Slot Gacor Pragmatic Maxwin Scatter Hitam (CONTOH DITOLAK)',
                'url'          => 'https://slot88-gacor-zeus-maxwin.xyz/daftar',
                'category'     => 'blog',
                'duration_sec' => 30,
                'target_region'=> 'nasional',
                'target_device'=> 'all',
                'cost'         => 1.00,
                'daily_limit'  => 500,
                'hits_today'   => 0,
                'total_hits'   => 0,
                'allocated'    => 0.00,
                'status'       => 'paused',
                'audit_status' => 'rejected',
                'audit_score'  => 100,
                'violations'   => ['JUDI_ONLINE'],
                'keywords'     => ['slot', 'gacor', 'maxwin', 'zeus', 'scatter hitam'],
                'audit_notes'  => 'DITOLAK SISTEM & KOMINFO: Melanggar UU ITE No. 1/2024 & Pasal 303 KUHP. Terdeteksi promosi judi online ilegal.',
                'reported'     => 12,
                'created_at'   => '2026-09-27',
                'preview'      => null,
            ],
            [
                'id'           => 'site_seed_adult_flagged',
                'title'        => 'Streaming Video Bokep & Konten Dewasa 18+ Hot (CONTOH DIBEKUKAN)',
                'url'          => 'https://koleksibokep-dewasa-18plus.com/video',
                'category'     => 'blog',
                'duration_sec' => 30,
                'target_region'=> 'nasional',
                'target_device'=> 'all',
                'cost'         => 1.00,
                'daily_limit'  => 300,
                'hits_today'   => 0,
                'total_hits'   => 0,
                'allocated'    => 0.00,
                'status'       => 'paused',
                'audit_status' => 'flagged',
                'audit_score'  => 95,
                'violations'   => ['ADULT_18_PLUS'],
                'keywords'     => ['bokep', 'dewasa 18+', '18+', 'video'],
                'audit_notes'  => 'DILAPORKAN OLEH PESELANCAR: Diisolasi dari rotasi penukaran trafik karena melanggar UU Pornografi No. 44/2008.',
                'reported'     => 7,
                'created_at'   => '2026-09-28',
                'preview'      => null,
            ],
        ];

        $inserted_campaigns = 0;
        foreach ($samples as $s) {
            $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table_campaigns} WHERE id = %s", $s['id']));
            if (!$exists) {
                $ok = $wpdb->insert($table_campaigns, [
                    'id'                    => $s['id'],
                    'title'                 => $s['title'],
                    'url'                   => $s['url'],
                    'category'              => $s['category'],
                    'duration_sec'          => $s['duration_sec'],
                    'target_region'         => $s['target_region'],
                    'target_device'         => $s['target_device'],
                    'points_cost_per_visit' => $s['cost'],
                    'daily_hit_limit'       => $s['daily_limit'],
                    'hits_delivered_today'  => $s['hits_today'],
                    'total_hits_delivered'  => $s['total_hits'],
                    'allocated_points'      => $s['allocated'],
                    'status'                => $s['status'],
                    'audit_status'          => $s['audit_status'],
                    'audit_score'           => $s['audit_score'],
                    'audit_violations'      => wp_json_encode($s['violations']),
                    'detected_keywords'     => wp_json_encode($s['keywords']),
                    'audit_notes'           => $s['audit_notes'],
                    'reported_count'        => $s['reported'],
                    'submitted_by_user_id'  => $admin_id,
                    'preview_content'       => $s['preview'] ? wp_json_encode($s['preview']) : null,
                    'created_at'            => $s['created_at'],
                ]);
                if ($ok !== false) {
                    $inserted_campaigns++;
                }
            }
        }

        $now_ms      = time() * 1000;
        $sample_logs = [
            [
                'id'           => 'log_seed_1',
                'type'         => 'HEARTBEAT_VERIFIED',
                'title'        => 'Heartbeat Integritas Valid',
                'details'      => 'Token detak selancar ke-#18 terverifikasi. Tab fokus aktif di layar pengguna, entropi gerakan 82%, tidak ada manipulasi waktu.',
                'severity'     => 'info',
                'metric_value' => 'Seq #18 · Entropi 82%',
                'created_at'   => $now_ms - (3 * 60 * 1000),
            ],
            [
                'id'           => 'log_seed_2',
                'type'         => 'POINT_CREDITED',
                'title'        => '+1.00 Poin Trafik Dikreditkan',
                'details'      => 'Kunjungan 30 detik selesai dengan seluruh cek integritas lolos untuk situs: "Portal Edukasi Digital Nusantara".',
                'severity'     => 'info',
                'metric_value' => '+1.00 Poin',
                'created_at'   => $now_ms - (7 * 60 * 1000),
            ],
            [
                'id'           => 'log_seed_3',
                'type'         => 'HUMAN_POP_PASSED',
                'title'        => 'Verifikasi Keberadaan Manusia Berhasil',
                'details'      => 'Tantangan Proof-of-Presence dijawab dengan benar. Sesi selancar diverifikasi asli (bukan bot otomatis).',
                'severity'     => 'info',
                'metric_value' => 'Verifikasi Lolos',
                'created_at'   => $now_ms - (14 * 60 * 1000),
            ],
            [
                'id'           => 'log_seed_4',
                'type'         => 'FRAME_BUST_INTERCEPTED',
                'title'        => 'Percobaan Frame-Busting Dicegah',
                'details'      => 'Sandbox HTML5 berhasil menahan skrip pembajak jendela induk yang mencoba memotong antrean selancar.',
                'severity'     => 'warning',
                'metric_value' => 'Sandbox HTML5',
                'created_at'   => $now_ms - (25 * 60 * 1000),
            ],
        ];

        $inserted_logs = 0;
        foreach ($sample_logs as $l) {
            $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table_logs} WHERE id = %s", $l['id']));
            if (!$exists) {
                $ok = $wpdb->insert($table_logs, [
                    'id'           => $l['id'],
                    'user_id'      => 0,
                    'type'         => $l['type'],
                    'title'        => $l['title'],
                    'details'      => $l['details'],
                    'severity'     => $l['severity'],
                    'metric_value' => $l['metric_value'],
                    'created_at'   => $l['created_at'],
                ]);
                if ($ok !== false) {
                    $inserted_logs++;
                }
            }
        }

        $notice = "Data mockup awal berhasil ditambahkan ke MySQL ({$inserted_campaigns} kampanye baru, {$inserted_logs} log anti-cheat).";
    }

    if (isset($_POST['trafik_clear_seed']) && check_admin_referer('trafik_bridge_clear_seed_nonce')) {
        $deleted_c = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$table_campaigns} WHERE id LIKE %s", 'site_seed_%'));
        $deleted_l = (int) $wpdb->query($wpdb->prepare("DELETE FROM {$table_logs} WHERE id LIKE %s", 'log_seed_%'));
        $notice    = "Data mockup contoh berhasil dibersihkan ({$deleted_c} kampanye, {$deleted_l} log). Data member asli tetap aman.";
    }

    $count_campaigns = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_campaigns}");
    $count_logs      = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table_logs}");
    $count_seed      = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table_campaigns} WHERE id LIKE %s", 'site_seed_%'));
    $allowed_origins = get_option('trafik_bridge_allowed_origins', "https://trafik.velocity.web.id\nhttps://velocity.web.id\n*");
    $rest_base       = rest_url('trafik/v1');
    ?>
    <div class="wrap">
        <h1>Trafik WP Bridge — Integrasi MySQL & REST API</h1>
        <p>Plugin ini menghubungkan aplikasi <strong>Trafik</strong> (<code>https://trafik.velocity.web.id</code>) langsung ke database <strong>MySQL / MariaDB</strong> WordPress Anda.</p>

        <?php if ($notice): ?>
            <div class="notice notice-success is-dismissible"><p><?php echo esc_html($notice); ?></p></div>
        <?php endif; ?>

        <div style="background:#fff;border:1px solid #ccd0d4;padding:16px 20px;max-width:820px;margin-top:16px;border-radius:6px;">
            <h2 style="margin-top:0;">Status Database & Endpoint</h2>
            <table class="widefat striped" style="margin-bottom:16px;">
                <tbody>
                    <tr><td><strong>REST API Endpoint</strong></td><td><code><?php echo esc_html($rest_base); ?></code></td></tr>
                    <tr><td><strong>Health Check URL</strong></td><td><code><?php echo esc_html($rest_base . '/health'); ?></code></td></tr>
                    <tr><td><strong>Tabel Kampanye Website</strong></td><td><code><?php echo esc_html($table_campaigns); ?></code> (<strong><?php echo esc_html($count_campaigns); ?></strong> total baris · <strong><?php echo esc_html($count_seed); ?></strong> baris mockup)</td></tr>
                    <tr><td><strong>Tabel Log Anti-Cheat</strong></td><td><code><?php echo esc_html($table_logs); ?></code> (<strong><?php echo esc_html($count_logs); ?></strong> baris)</td></tr>
                    <tr><td><strong>Tabel Pengguna & Poin</strong></td><td><code><?php echo esc_html($wpdb->users); ?></code> &amp; <code><?php echo esc_html($wpdb->usermeta); ?></code></td></tr>
                </tbody>
            </table>

            <h3>Data Mockup Awal (Sementara)</h3>
            <p class="description" style="margin-bottom:10px;">
                Gunakan tombol di bawah untuk mengisi 10 contoh kampanye Indonesia + 4 log awal agar jaringan tidak kosong saat peluncuran (file SQL mentah juga tersedia di <code>seed-mockup-data.sql</code>). Anda dapat menghapus seluruh data mockup kapan saja tanpa menyentuh kampanye member asli.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
                <form method="post" style="margin:0;">
                    <?php wp_nonce_field('trafik_bridge_seed_nonce'); ?>
                    <button type="submit" name="trafik_seed_campaigns" class="button button-secondary">
                        Isi 10 Data Mockup Contoh ke MySQL (Seed)
                    </button>
                </form>

                <?php if ($count_seed > 0): ?>
                <form method="post" style="margin:0;">
                    <?php wp_nonce_field('trafik_bridge_clear_seed_nonce'); ?>
                    <button type="submit" name="trafik_clear_seed" class="button" style="color:#b32d2e;border-color:#b32d2e;">
                        Hapus Data Mockup Contoh (<?php echo esc_html($count_seed); ?>)
                    </button>
                </form>
                <?php endif; ?>
            </div>

            <hr />

            <form method="post">
                <?php wp_nonce_field('trafik_bridge_settings_nonce'); ?>
                <h3>Domain CORS yang Diizinkan (1 per baris)</h3>
                <textarea name="trafik_allowed_origins" rows="4" class="large-text code"><?php echo esc_textarea($allowed_origins); ?></textarea>
                <p class="description">Tambahkan domain frontend Trafik Anda (misal: <code>https://trafik.velocity.web.id</code>) atau biarkan <code>*</code> untuk mengizinkan preview &amp; subdomain.</p>
                <p><button type="submit" name="trafik_save_settings" class="button button-primary">Simpan Pengaturan</button></p>
            </form>
        </div>
    </div>
    <?php
}
