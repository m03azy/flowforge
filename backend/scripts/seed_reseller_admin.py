"""
Seed script to create the Top Reseller Master Superadmin account.
Email: reseller.admin@flowforge.dev
Password: ResellerAdmin@2026
"""
import sqlite3
import bcrypt
import os

def seed_sqlite():
    db_path = "/var/www/html/flowforge/dev.db"
    if not os.path.exists(db_path):
        print(f"[Seed] DB file {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Ensure missing columns exist
    cols = [col[1] for col in c.execute('PRAGMA table_info(users)').fetchall()]
    needed = [
        ('organisation_name', 'TEXT'),
        ('institution_type', 'TEXT DEFAULT "business"'),
        ('subscription_plan', 'TEXT DEFAULT "starter"'),
        ('department', 'TEXT'),
        ('job_title', 'TEXT'),
        ('totp_secret', 'TEXT'),
        ('totp_enabled', 'INTEGER DEFAULT 0')
    ]
    for col_name, col_type in needed:
        if col_name not in cols:
            c.execute(f'ALTER TABLE users ADD COLUMN {col_name} {col_type}')

    email = "reseller.admin@flowforge.dev"
    password = "ResellerAdmin@2026"
    pwd_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = c.fetchone()

    if row:
        c.execute(
            "UPDATE users SET role = 'superadmin', organisation_name = 'Platform Master Reseller', hashed_password = ? WHERE email = ?",
            (pwd_hash, email)
        )
        print(f"[Seed] Updated Top Reseller Admin in SQLite: {email}")
    else:
        c.execute(
            """INSERT INTO users (email, full_name, hashed_password, role, organisation_name, institution_type, subscription_plan, is_active, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)""",
            (email, "Top Reseller Master Admin", pwd_hash, "superadmin", "Platform Master Reseller", "business", "enterprise")
        )
        print(f"[Seed] Created new Top Reseller Admin in SQLite: {email}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    seed_sqlite()
