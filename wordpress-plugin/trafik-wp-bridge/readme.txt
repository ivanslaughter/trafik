=== Trafik WP Bridge ===
Contributors: velocitydigital
Tags: rest-api, mysql, sso, traffic-exchange
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Bridge WordPress MySQL/MariaDB database and wp_users authentication to Trafik React SPA.

== Installation ==
1. Upload `trafik-wp-bridge.zip` via WordPress Admin -> Plugins -> Add New -> Upload Plugin.
2. Activate the plugin. Database tables (`wp_trafik_campaigns`, `wp_trafik_anticheat_logs`) are created automatically.
3. Open Settings -> Trafik WP Bridge to verify status and optionally click "Isi 10 Data Mockup Contoh ke MySQL (Seed)" (or import `seed-mockup-data.sql` via phpMyAdmin). You can remove mockup rows anytime using the "Hapus Data Mockup Contoh" button without touching real member campaigns.
4. In Trafik app, open WordPress Integration, set mode to "Live WordPress Plugin Bridge (MySQL)", and log in using your WordPress account.
