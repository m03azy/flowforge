from sqlalchemy.orm import Session
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

db = SessionLocal()

admin = User(
    email="admin@flowforge.local",
    password_hash=get_password_hash("admin123"),
    full_name="Admin User",
    role="admin",
    is_active=True
)
db.add(admin)

employee = User(
    email="employee@flowforge.local",
    password_hash=get_password_hash("employee123"),
    full_name="Employee User",
    role="employee",
    is_active=True
)
db.add(employee)
db.commit()
print("Seeded users: admin@flowforge.local (admin123) and employee@flowforge.local (employee123)")
